import { Asset } from 'expo-asset';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { Flight, StatsData, PKPassData, AchievementData, AirlineData } from '@/types';
import { type BCBPData } from '@/helpers/boardingpass';
import { readAsStringAsync } from 'expo-file-system';
import { camelCase, snakeCase } from '@/helpers/common';
import { DBNAME, SQLDIR } from '@/constants/settings';
import { parse } from 'csv-parse/dist/esm/sync';
import airports from '@/constants/airports.json';


export interface Condition {
  field: string;
  operator: string;
  value: any;
  isPlain?: boolean;
}

export function makeQueryParams(conditions: Array<Condition | string>): { where: string, params: any[] } {
  const where = conditions.map(c =>
    (typeof c === 'string') ? c : `${c.field} ${c.operator} ${!!c.isPlain ? c.value : '?'}`
  ).join(' AND ');
  const params = conditions.filter(c => typeof c !== 'string').filter(c => !c.isPlain).map(c => c.value);
  return { where, params };
}

let db: SQLiteDatabase;

async function execSQL(file: any) {
  const [{ localUri }] = await Asset.loadAsync(file);
  if (!localUri) {
    throw new Error('SQL file not found');
  }
  const schema = await readAsStringAsync(localUri);
  await db.execAsync(schema);
}

async function fillDataFromFile(table: string, file: any) {
  const [{ localUri }] = await Asset.loadAsync(file);
  if (!localUri) {
    throw new Error('Data file not found');
  }
  const csvFile = await readAsStringAsync(localUri);
  if (!csvFile) {
    throw new Error(`File ${SQLDIR}/data/${table}.csv not found`);
  }
  const records = parse(csvFile, {
    columns: true, delimiter: ',', escape: '"', trim: true,
    quote: '"', skip_empty_lines: true, relax_quotes: true, relax_column_count: true,
  });
  const headers = Object.keys(records[0] || {});
  const data = records.map((row: any) => headers.map((header: string) => row[header]));
  const sql = `INSERT OR REPLACE INTO ${table} (${headers.join(', ')}) VALUES ` +
    data.map((row: any) => `(${row.map((v: any) => '?').join(', ')})`).join(', ');
  await db.runAsync(sql, data.flat());
}

export async function fillDataFromArray(table: string, records: Array<any>) {
  const headers = Object.keys(records[0] || {});
  if (!headers || records.length === 0) {
    return;
  }
  const data = records.map((row: any) => headers.map((header: string) => row[header]));
  const sql = `INSERT OR REPLACE INTO ${table} (${headers.join(', ')}) VALUES ` +
    data.map((row: any) => `(${row.map((v: any) => '?').join(', ')})`).join(', ');
  await db.runAsync(sql, data.flat());
}

async function updateFromRecord(table: string, id: string, record: any) {
  const headers = Object.keys(record || {}).filter(x => x !== id);
  const data = headers.map((header: string) => record[header])
  const sql = `UPDATE ${table} SET ` +
    headers.map((x: string) => `${x} = ?`).join(', ') +
    ` WHERE ${id} = ?`;
  await db.runAsync(sql, data.concat([record[id]]));
}

export async function openDatabase(dbName: string = DBNAME): Promise<boolean> {
  db = await openDatabaseAsync(dbName);
  if (!db) {
    console.error('Database can\'t be opened');
    return false;
  }
  try {
    await db.execAsync('PRAGMA journal_mode = WAL');
    await db.execAsync('PRAGMA foreign_keys = ON');

    const schemaSql: any[] = [
      require('@/assets/sql/schema.sql'),
      require('@/assets/sql/views.sql'),
    ];
    for (const file of schemaSql) {
      await execSQL(file);
    }

    const tables: {[key: string]: any} = {
      'airlines': require('@/assets/sql/data/airlines.csv'),
      'aircraft_types': require('@/assets/sql/data/aircraft_types.csv'),
    };
    for (const table of Object.keys(tables)) {
      await fillDataFromFile(table, tables[table]);
    }

    const jsons: {[key: string]: any} = {
      'airports': airports.map(x => Object.fromEntries(Object.entries(x).filter(
        e => ['iata_code', 'country_code', 'airport_name', 'airport_latitude', 'airport_longitude', 'elevation'].includes(e[0])
      ))),
    };
    for (const table of Object.keys(jsons)) {
      await fillDataFromArray(table, jsons[table]);
    }

    const dmlSql: any[] = [
      // require('@/assets/sql/updates.sql'),
    ];
    for (const file of dmlSql) {
      await execSQL(file);
    }
  } catch (e) {
    console.error(e);
    return false;
  }
  return true;
}

export async function closeDatabase() {
  if (!db) {
    return;
  }
  await db.closeAsync();
}

export async function getFlights(conditions: Array<Condition | string>, limit: number, offset: number = 0, order: string = 'DESC'): Promise<Flight[]> {
  if (!db) {
    throw new Error('Can\'t select flights: database not opened');
  }
  const { where, params } = makeQueryParams(conditions);
  const query = `
    SELECT
      f.*,
      p.pnr,
      p.seat_number,
      p.passenger_name,
      p.bcbp,
      p.bcbp_data,
      p.bcbp_format,
      p.bcbp_pkpass
    FROM vw_flights f
      LEFT OUTER JOIN vw_passengers p USING (flight_id)
    ${where ? `WHERE ${where}` : ''}
    ORDER BY start_datetime ${order}
    ${!!limit ? `LIMIT ${limit} OFFSET ${offset}` : ''}
  `;
  const flights = await db.getAllAsync(query, params);
  return flights.map(flight => {
    const result = camelCase(flight);
    result.bcbpPkpass = result.bcbpPkpass ? JSON.parse(result.bcbpPkpass as string) : result.bcbpPkpass;
    result.bcbp = result.bcbp ? JSON.parse(result.bcbp as string) : result.bcbp;
    result.extra = result.extra ? JSON.parse(result.extra) : result.extra;
    return result;
  });
}

export async function getActualFlights(limit: number, offset: number = 0): Promise<Flight[]> {
  return await getFlights([
    { field: 'is_archived', operator: '==', value: 0 } as Condition,
  ], limit, offset, 'ASC');
}

export async function getPastFlights(filter: Array<Condition | string>, limit: number, offset: number = 0): Promise<Flight[]> {
  return await getFlights([
    ...filter,
    { field: 'is_archived', operator: '==', value: 1 },
  ], limit, offset, 'DESC');
}

export async function isFlightExists(airline: string, flightNumber: string, date: string): Promise<number | undefined> {
  if (!db) {
    throw new Error('Can\'t select from flights: database not opened');
  }
  const query = `
    SELECT
      flight_id
    FROM vw_flights
    WHERE airline = ? AND flight_number = ? AND DATE(start_datetime) = ?
  `;
  try {
    const result: any = await db.getFirstAsync(query, airline, flightNumber, date);
    return result?.flight_id;
  } catch (e) {
    return undefined;
  }
}

export async function getFlight(flightId: number): Promise<Flight | undefined> {
  if (!db) {
    throw new Error('Can\'t select from flights: database not opened');
  }
  const query = `
    SELECT
      f.*,
      p.pnr,
      p.seat_number,
      p.passenger_name,
      p.bcbp,
      p.bcbp_data,
      p.bcbp_format,
      p.bcbp_pkpass
    FROM vw_flights f
      LEFT OUTER JOIN vw_passengers p USING (flight_id)
    WHERE flight_id = ?
  `;
  try {
    const flight: any = await db.getFirstAsync(query, flightId);
    const result = camelCase(flight);
    result.bcbpPkpass = result.bcbpPkpass ? JSON.parse(result.bcbpPkpass as string) : result.bcbpPkpass;
    result.bcbp = result.bcbp ? JSON.parse(result.bcbp as string) : result.bcbp;
    result.extra = result.extra ? JSON.parse(result.extra) : result.extra;
    return result as Flight;
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

export async function insertFlight(flight: Flight): Promise<boolean> {
  if (!db) {
    throw new Error('Can\'t insert flight: database not opened');
  }
  try {
    await db.withTransactionAsync(async () => {
      if (!flight.airlineId) {
        const result: any = await db.getFirstAsync(`SELECT airline_id FROM airlines WHERE airline_code = ?`, flight.airline);
        flight.airlineId = result?.airline_id ?? undefined;
      }
      flight.extra = JSON.stringify({...flight.extra, ...(!flight.airlineId ? { airline: flight.airline, airlineName: flight.airlineName ?? ''} : {})});
      const record: any = Object.fromEntries(Object.entries(snakeCase(flight))
        .filter(e => !['airline', 'airline_name', 'airport_name', 'info'].includes(e[0] as string) && e[1] !== undefined)
      );
      await fillDataFromArray('flights', [record]);
    });
  } catch (e) {
    console.error(e);
    return false;
  }
  return true;
}

export async function updateFlight(flight: Flight): Promise<boolean> {
  if (!db) {
    throw new Error('Can\'t insert flight: database not opened');
  }
  if (!flight.flightId) {
    console.error('flightId not provided');
    return false;
  }
  try {
    const otherFields = ['airline', 'airline_name', 'airport_name', 'check_in_link', 'check_in_time', 'info', 'is_different_timezone',
      'bcbp', 'bcbp_data', 'bcbp_format', 'bcbp_pkpass', 'passenger_name', 'pnr', 'seat_number'
    ];
    await db.withTransactionAsync(async () => {
      if (!flight.airlineId) {
        const result: any = await db.getFirstAsync(`SELECT airline_id FROM airlines WHERE airline_code = ?`, flight.airline);
        flight.airlineId = result?.airline_id ?? undefined;
      }
      flight.extra = JSON.stringify({...flight.extra, ...(!flight.airlineId ? { airline: flight.airline, airlineName: flight.airlineName ?? ''} : {})});
      let record: any = Object.fromEntries(Object.entries(snakeCase(flight))
        .filter(e => !otherFields.includes(e[0] as string) && e[1] !== undefined)
      );
      await updateFromRecord('flights', 'flight_id', record);
      await db.runAsync('DELETE FROM passengers WHERE flight_id = ?;', flight.flightId as number);
      record = Object.fromEntries(
        Object.entries({
          flight_id: flight.flightId,
          pnr: flight.pnr ?? '',
          passenger_name: flight.passengerName ?? '',
          seat_number: flight.seatNumber,
          bcbp: flight.bcbp ? JSON.stringify(flight.bcbp) : undefined,
        })
        .filter(e => e[1] !== undefined)
      );
      await fillDataFromArray('passengers', [record]);
    });
  } catch (e) {
    console.error(e);
    return false;
  }
  return true;
}

export async function inserPassengerFromBCBP(flightId: number, data: BCBPData, format: string, pkpass: PKPassData): Promise<boolean> {
  if (!db) {
    throw new Error('Can\'t insert passenger: database not opened');
  }

  const bcbp = {
    data,
    format,
    pkpass
  };
  const leg = data.data?.legs?.[0];

  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM passengers WHERE flight_id = ?;', flightId);
      const record: any = {
        flightId,
        pnr: leg?.operatingCarrierPNR ?? '',
        passenger_name: data.data?.passengerName ?? '',
        seat_number: leg?.seatNumber?.replace(/^0+/, '') ?? '',
        bcbp: JSON.stringify(bcbp),
      };
      await fillDataFromArray('passengers', [record]);
    });
  } catch (e) {
    console.error(e);
    return false;
  }
  return true;
}

export async function archiveFlight(flightId: number, state: number = 1) {
  if (!db) {
    throw new Error('Can\'t archive flight: database not opened');
  }
  await db.runAsync(`
    UPDATE flights
    SET
      is_archived = ?
    WHERE flight_id = ?;`,
    state, flightId
  );
}

export async function deleteFlight(flightId: number): Promise<boolean> {
  if (!db) {
    throw new Error('Can\'t delete flight: database not opened');
  }
  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM passengers WHERE flight_id = ?;', flightId);
      await db.runAsync('DELETE FROM flights WHERE flight_id = ?', flightId);
    });
  } catch (e) {
    console.error(e);
    return false;
  }
  return true;
}

export async function getStats(): Promise<StatsData> {
  if (!db) {
    throw new Error('Can\'t get stats: database not opened');
  }
  let query = `
    SELECT
      *
    FROM vw_stats;
  `;
  const years = (await db.getAllAsync(query)).map(year => camelCase(year));
  const stats: StatsData = {};
  years.forEach(y => {
    const {
      year, distance, duration, flights, domesticFlights, internationalFlights, longHaulFlights,
      aircrafts, airlines, airports, countries, countryCodes,
      avgDistance, avgDuration, avgDelay } = y;
    stats[year] = { distance, duration, flights, domesticFlights, internationalFlights, longHaulFlights,
      aircrafts, airlines, airports, countries, countryCodes,
      avgDistance, avgDuration, avgDelay };
  });
  return stats;
}

export async function getAchievements(): Promise<AchievementData[]> {
  if (!db) {
    throw new Error('Can\'t get achievement: database not opened');
  }
  let query = `
    SELECT
      *
    FROM vw_achievements
    ORDER BY flight_date DESC;
  `;

  const achievements = (await db.getAllAsync(query)).map(row => camelCase(row));

  return achievements;
}

export async function exportFlights(): Promise<any[]> {
  if (!db) {
    throw new Error('Can\'t select flights: database not opened');
  }
  const query = `
    SELECT
      *
    FROM vw_flights
    ORDER BY start_datetime
  `;
  const flights = await db.getAllAsync(query);
  return flights;
}

export async function getAirlines(): Promise<Array<AirlineData>> {
  if (!db) {
    throw new Error('Can\'t get achievement: database not opened');
  }
  let query = `
    SELECT
      *
    FROM airlines
    ORDER BY airline_code;
  `;

  return (await db.getAllAsync(query)).map(row => camelCase(row));
}
