import { parse } from 'csv-parse/sync';
import { type SQLiteDatabase, openDatabaseAsync } from 'expo-sqlite';

import airports from '@/constants/airports.json';
import { DBNAME, SQLDIR } from '@/constants/settings';
import { type BCBPData } from '@/helpers/boardingpass';
import { camelCase, readFileToString, snakeCase } from '@/helpers/common';
import type { AchievementData, AirlineData, Flight, PKPassData, StatsData } from '@/types';

export interface Condition {
  field: string;
  operator: string;
  value: any;
  isPlain?: boolean;
}

export function makeQueryParams(conditions: Array<Condition | string>): {
  where: string;
  params: any[];
} {
  const where = conditions
    .map((c) => (typeof c === 'string' ? c : `${c.field} ${c.operator} ${c.isPlain ? c.value : '?'}`))
    .join(' AND ');
  const params = conditions
    .filter((c) => typeof c !== 'string')
    .filter((c) => !c.isPlain)
    .map((c) => c.value);
  return { where, params };
}

export interface SqlStatement {
  sql: string;
  params: any[];
}

export function prepareInsertStatement(table: string, records: Array<Record<string, any>>): SqlStatement | null {
  if (!records.length || !records[0]) {
    return null;
  }
  const headers = Object.keys(records[0]);
  if (headers.length === 0) {
    return null;
  }
  const placeholders = records.map(() => `(${headers.map(() => '?').join(', ')})`).join(', ');
  const sql = `INSERT OR REPLACE INTO ${table} (${headers.join(', ')}) VALUES ${placeholders}`;
  const params = records.flatMap((row) => headers.map((header) => row[header]));
  return { sql, params };
}

export function prepareUpdateStatement(
  table: string,
  idField: string,
  record: Record<string, any>,
): SqlStatement | null {
  if (!record || record[idField] === undefined) {
    return null;
  }
  const headers = Object.keys(record).filter((key) => key !== idField && record[key] !== undefined);
  if (headers.length === 0) {
    return null;
  }
  const sql = `UPDATE ${table} SET ${headers.map((key) => `${key} = ?`).join(', ')} WHERE ${idField} = ?`;
  const params = headers.map((header) => record[header]).concat(record[idField]);
  return { sql, params };
}

type CsvAsset = any | string | Array<Record<string, any>>;

export interface DatabaseAssets {
  schema?: Array<any | string>;
  dml?: Array<any | string>;
  csvTables?: Record<string, CsvAsset>;
  jsonTables?: Record<string, Array<Record<string, any>>>;
}

interface ResolvedDatabaseAssets {
  schema: Array<any | string>;
  dml: Array<any | string>;
  csvTables: Record<string, CsvAsset>;
  jsonTables: Record<string, Array<Record<string, any>>>;
}

export interface SQLiteRepository {
  fillDataFromArray(table: string, records: Array<any>): Promise<void>;
  updateFromRecord(table: string, idField: string, record: any): Promise<void>;
  getFlights(conditions: Array<Condition | string>, limit: number, offset: number, order: string): Promise<Flight[]>;
  isFlightExists(airline: string, flightNumber: string, date: string): Promise<number | undefined>;
  getFlight(flightId: number): Promise<Flight | undefined>;
  insertFlight(flight: Flight): Promise<boolean>;
  updateFlight(flight: Flight): Promise<boolean>;
  insertPassengerFromBCBP(flightId: number, data: BCBPData, format: string, pkpass: PKPassData): Promise<boolean>;
  archiveFlight(flightId: number, state?: number): Promise<void>;
  deleteFlight(flightId: number): Promise<boolean>;
  getStats(): Promise<StatsData>;
  getAchievements(): Promise<AchievementData[]>;
  exportFlights(): Promise<any[]>;
  getAirlines(): Promise<Array<AirlineData>>;
  close(): Promise<void>;
  getRawDatabase(): SQLiteDatabase;
}

let defaultRepository: SQLiteRepository | undefined;

export function createDefaultAssets(): ResolvedDatabaseAssets {
  const preparedAirports = airports.map((airport) =>
    Object.fromEntries(
      Object.entries(airport).filter((entry) =>
        ['iata_code', 'country_code', 'airport_name', 'airport_latitude', 'airport_longitude', 'elevation'].includes(
          entry[0],
        ),
      ),
    ),
  );
  return {
    schema: [require('@/assets/sql/schema.sql'), require('@/assets/sql/views.sql')],
    dml: [],
    csvTables: {
      airlines: require('@/assets/sql/data/airlines.csv'),
      aircraft_types: require('@/assets/sql/data/aircraft_types.csv'),
    },
    jsonTables: {
      airports: preparedAirports,
    },
  };
}

function resolveAssets(assets?: DatabaseAssets): ResolvedDatabaseAssets {
  const defaults = createDefaultAssets();
  if (!assets) {
    return defaults;
  }
  return {
    schema: assets.schema ? [...assets.schema] : [...defaults.schema],
    dml: assets.dml ? [...assets.dml] : [...defaults.dml],
    csvTables: { ...defaults.csvTables, ...assets.csvTables },
    jsonTables: { ...defaults.jsonTables, ...assets.jsonTables },
  };
}

export async function readAssetAsString(file: any): Promise<string> {
  if (typeof file === 'string') {
    return file;
  }
  const result = await readFileToString(file);
  if (!result) {
    throw new Error('SQL file not found');
  }
  return result;
}

async function execSQL(database: SQLiteDatabase, file: any | string) {
  const sql = await readAssetAsString(file);
  if (!sql) {
    throw new Error('SQL file not found');
  }
  await database.execAsync(sql);
}

async function loadCsvRecords(file: CsvAsset, table: string): Promise<Array<Record<string, any>>> {
  if (Array.isArray(file)) {
    return file;
  }
  const csvFile = await readAssetAsString(file);
  if (!csvFile) {
    throw new Error(`File ${SQLDIR}/data/${table}.csv not found`);
  }
  return parse(csvFile, {
    columns: true,
    delimiter: ',',
    escape: '"',
    trim: true,
    quote: '"',
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Array<Record<string, any>>;
}

async function fillDataFromArrayInternal(database: SQLiteDatabase, table: string, records: Array<any>) {
  const statement = prepareInsertStatement(table, records.map((record) => record || {}) as Array<Record<string, any>>);
  if (!statement) {
    return;
  }
  await database.runAsync(statement.sql, statement.params);
}

async function fillDataFromFileInternal(database: SQLiteDatabase, table: string, file: CsvAsset) {
  const records = await loadCsvRecords(file, table);
  if (!records.length) {
    return;
  }
  await fillDataFromArrayInternal(database, table, records);
}

async function updateFromRecordInternal(database: SQLiteDatabase, table: string, idField: string, record: any) {
  if (!record) {
    return;
  }
  const statement = prepareUpdateStatement(table, idField, record);
  if (!statement) {
    return;
  }
  await database.runAsync(statement.sql, statement.params);
}

async function bootstrapDatabase(database: SQLiteDatabase, assets: ResolvedDatabaseAssets) {
  await database.execAsync('PRAGMA journal_mode = WAL');
  await database.execAsync('PRAGMA foreign_keys = ON');

  for (const file of assets.schema) {
    await execSQL(database, file);
  }

  for (const [table, file] of Object.entries(assets.csvTables)) {
    await fillDataFromFileInternal(database, table, file);
  }

  for (const [table, records] of Object.entries(assets.jsonTables)) {
    await fillDataFromArrayInternal(database, table, records);
  }

  for (const file of assets.dml) {
    await execSQL(database, file);
  }
}

class SQLiteRepositoryImpl implements SQLiteRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async fillDataFromArray(table: string, records: Array<any>): Promise<void> {
    await fillDataFromArrayInternal(this.database, table, records);
  }

  async updateFromRecord(table: string, idField: string, record: any): Promise<void> {
    await updateFromRecordInternal(this.database, table, idField, record);
  }

  async getFlights(
    conditions: Array<Condition | string>,
    limit: number,
    offset: number = 0,
    order: string = 'DESC',
  ): Promise<Flight[]> {
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
      ${limit ? `LIMIT ${limit} OFFSET ${offset}` : ''}
    `;
    const flights = await this.database.getAllAsync(query, params);
    return flights.map((flight) => {
      const result = camelCase(flight);
      result.bcbpPkpass = result.bcbpPkpass ? JSON.parse(result.bcbpPkpass as string) : result.bcbpPkpass;
      result.bcbp = result.bcbp ? JSON.parse(result.bcbp as string) : result.bcbp;
      result.extra = JSON.parse(result.extra);
      return result;
    });
  }

  async isFlightExists(airline: string, flightNumber: string, date: string): Promise<number | undefined> {
    const query = `
      SELECT
        flight_id
      FROM vw_flights
      WHERE airline = ? AND flight_number = ? AND DATE(start_datetime) = ?
    `;
    try {
      const result: any = await this.database.getFirstAsync(query, airline, flightNumber, date);
      return result?.flight_id;
    } catch {
      return undefined;
    }
  }

  async getFlight(flightId: number): Promise<Flight | undefined> {
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
      const flight: any = await this.database.getFirstAsync(query, flightId);
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

  async insertFlight(flight: Flight): Promise<boolean> {
    try {
      await this.database.withTransactionAsync(async () => {
        if (!flight.airlineId) {
          const result: any = await this.database.getFirstAsync(
            `SELECT airline_id FROM airlines WHERE airline_code = ?`,
            flight.airline,
          );
          flight.airlineId = result?.airline_id ?? undefined;
        }
        const extraString = JSON.stringify({
          ...flight.extra,
          ...(!flight.airlineId ? { airline: flight.airline, airlineName: flight.airlineName ?? '' } : {}),
        });
        const record: any = Object.fromEntries(
          Object.entries(snakeCase(flight)).filter(
            (entry) =>
              !['airline', 'airline_name', 'airport_name', 'info'].includes(entry[0] as string) &&
              entry[1] !== undefined,
          ),
        );
        record.extra = extraString;
        await this.fillDataFromArray('flights', [record]);
      });
    } catch (e) {
      console.error(e);
      return false;
    }
    return true;
  }

  async updateFlight(flight: Flight): Promise<boolean> {
    if (!flight.flightId) {
      console.error('flightId not provided');
      return false;
    }
    try {
      const otherFields = [
        'airline',
        'airline_name',
        'airport_name',
        'check_in_link',
        'check_in_time',
        'info',
        'is_different_timezone',
        'bcbp',
        'bcbp_data',
        'bcbp_format',
        'bcbp_pkpass',
        'passenger_name',
        'pnr',
        'seat_number',
      ];
      await this.database.withTransactionAsync(async () => {
        if (!flight.airlineId) {
          const result: any = await this.database.getFirstAsync(
            `SELECT airline_id FROM airlines WHERE airline_code = ?`,
            flight.airline,
          );
          flight.airlineId = result?.airline_id ?? undefined;
        }
        const extraString = JSON.stringify({
          ...flight.extra,
          ...(!flight.airlineId ? { airline: flight.airline, airlineName: flight.airlineName ?? '' } : {}),
        });
        let record: any = Object.fromEntries(
          Object.entries(snakeCase(flight)).filter(
            (entry) => !otherFields.includes(entry[0] as string) && entry[1] !== undefined,
          ),
        );
        record.extra = extraString;
        await this.updateFromRecord('flights', 'flight_id', record);
        await this.database.runAsync('DELETE FROM passengers WHERE flight_id = ?;', flight.flightId as number);
        record = Object.fromEntries(
          Object.entries({
            flight_id: flight.flightId,
            pnr: flight.pnr ?? '',
            passenger_name: flight.passengerName ?? '',
            seat_number: flight.seatNumber,
            bcbp: flight.bcbp ? JSON.stringify(flight.bcbp) : undefined,
          }).filter((entry) => entry[1] !== undefined),
        );
        await this.fillDataFromArray('passengers', [record]);
      });
    } catch (e) {
      console.error(e);
      return false;
    }
    return true;
  }

  async insertPassengerFromBCBP(
    flightId: number,
    data: BCBPData,
    format: string,
    pkpass: PKPassData,
  ): Promise<boolean> {
    const bcbp = {
      data,
      format,
      pkpass,
    };
    const leg = data.data?.legs?.[0];

    try {
      await this.database.withTransactionAsync(async () => {
        await this.database.runAsync('DELETE FROM passengers WHERE flight_id = ?;', flightId);
        const record: any = {
          flight_id: flightId,
          pnr: leg?.operatingCarrierPNR ?? '',
          passenger_name: data.data?.passengerName ?? '',
          seat_number: leg?.seatNumber?.replace(/^0+/, '') ?? '',
          bcbp: JSON.stringify(bcbp),
        };
        await this.fillDataFromArray('passengers', [record]);
      });
    } catch (e) {
      console.error(e);
      return false;
    }
    return true;
  }

  async archiveFlight(flightId: number, state: number = 1): Promise<void> {
    await this.database.runAsync(
      `
      UPDATE flights
      SET
        is_archived = ?
      WHERE flight_id = ?;`,
      state,
      flightId,
    );
  }

  async deleteFlight(flightId: number): Promise<boolean> {
    try {
      await this.database.withTransactionAsync(async () => {
        await this.database.runAsync('DELETE FROM passengers WHERE flight_id = ?;', flightId);
        await this.database.runAsync('DELETE FROM flights WHERE flight_id = ?', flightId);
      });
    } catch (e) {
      console.error(e);
      return false;
    }
    return true;
  }

  async getStats(): Promise<StatsData> {
    const query = `
      SELECT
        *
      FROM vw_stats;
    `;
    const years = (await this.database.getAllAsync(query)).map((year) => camelCase(year));
    const stats: StatsData = {};
    years.forEach((y) => {
      const {
        year,
        distance,
        duration,
        flights,
        domesticFlights,
        internationalFlights,
        longHaulFlights,
        aircrafts,
        airlines,
        airports,
        countries,
        countryCodes,
        avgDistance,
        avgDuration,
        avgDelay,
      } = y;
      stats[year] = {
        distance,
        duration,
        flights,
        domesticFlights,
        internationalFlights,
        longHaulFlights,
        aircrafts,
        airlines,
        airports,
        countries,
        countryCodes,
        avgDistance,
        avgDuration,
        avgDelay,
      };
    });
    return stats;
  }

  async getAchievements(): Promise<AchievementData[]> {
    const query = `
      SELECT
        *
      FROM vw_achievements
      ORDER BY flight_date DESC;
    `;

    const achievements = (await this.database.getAllAsync(query)).map((row) => camelCase(row));

    return achievements;
  }

  async exportFlights(): Promise<any[]> {
    const query = `
      SELECT
        *
      FROM vw_flights
      ORDER BY start_datetime
    `;
    const flights = await this.database.getAllAsync(query);
    return flights;
  }

  async getAirlines(): Promise<Array<AirlineData>> {
    const query = `
      SELECT
        *
      FROM airlines
      ORDER BY airline_code;
    `;

    return (await this.database.getAllAsync(query)).map((row) => camelCase(row));
  }

  async close(): Promise<void> {
    await this.database.closeAsync();
  }

  getRawDatabase(): SQLiteDatabase {
    return this.database;
  }
}

export async function createSQLiteRepository(
  database: SQLiteDatabase,
  assets?: DatabaseAssets,
): Promise<SQLiteRepository> {
  const resolvedAssets = resolveAssets(assets);
  await bootstrapDatabase(database, resolvedAssets);
  return new SQLiteRepositoryImpl(database);
}

function getRepositoryOrThrow(errorMessage: string): SQLiteRepository {
  if (!defaultRepository) {
    throw new Error(errorMessage);
  }
  return defaultRepository;
}

export function setDatabaseRepository(repository?: SQLiteRepository) {
  defaultRepository = repository;
}

export async function openDatabase(dbName: string = DBNAME): Promise<boolean> {
  if (defaultRepository) {
    await defaultRepository.close();
    defaultRepository = undefined;
  }
  let database: SQLiteDatabase | undefined;
  try {
    database = await openDatabaseAsync(dbName);
  } catch (e) {
    console.error(e);
    return false;
  }
  if (!database) {
    console.error("Database can't be opened");
    return false;
  }
  try {
    const repository = await createSQLiteRepository(database);
    defaultRepository = repository;
  } catch (e) {
    console.error(e);
    await database.closeAsync();
    return false;
  }
  return true;
}

export async function closeDatabase() {
  if (!defaultRepository) {
    return;
  }
  await defaultRepository.close();
  defaultRepository = undefined;
}

export async function fillDataFromArray(table: string, records: Array<any>) {
  const repository = getRepositoryOrThrow("Can't insert data: database not opened");
  await repository.fillDataFromArray(table, records);
}

export async function getFlights(
  conditions: Array<Condition | string>,
  limit: number,
  offset: number = 0,
  order: string = 'DESC',
): Promise<Flight[]> {
  const repository = getRepositoryOrThrow("Can't select flights: database not opened");
  return repository.getFlights(conditions, limit, offset, order);
}

export async function getActualFlights(limit: number, offset: number = 0): Promise<Flight[]> {
  return await getFlights([{ field: 'is_archived', operator: '==', value: 0 } as Condition], limit, offset, 'ASC');
}

export async function getPastFlights(
  filter: Array<Condition | string>,
  limit: number,
  offset: number = 0,
): Promise<Flight[]> {
  return await getFlights([...filter, { field: 'is_archived', operator: '==', value: 1 }], limit, offset, 'DESC');
}

export async function isFlightExists(airline: string, flightNumber: string, date: string): Promise<number | undefined> {
  const repository = getRepositoryOrThrow("Can't select from flights: database not opened");
  return repository.isFlightExists(airline, flightNumber, date);
}

export async function getFlight(flightId: number): Promise<Flight | undefined> {
  const repository = getRepositoryOrThrow("Can't select from flights: database not opened");
  return repository.getFlight(flightId);
}

export async function insertFlight(flight: Flight): Promise<boolean> {
  const repository = getRepositoryOrThrow("Can't insert flight: database not opened");
  return repository.insertFlight(flight);
}

export async function updateFlight(flight: Flight): Promise<boolean> {
  const repository = getRepositoryOrThrow("Can't insert flight: database not opened");
  return repository.updateFlight(flight);
}

export async function insertPassengerFromBCBP(
  flightId: number,
  data: BCBPData,
  format: string,
  pkpass: PKPassData,
): Promise<boolean> {
  const repository = getRepositoryOrThrow("Can't insert passenger: database not opened");
  return repository.insertPassengerFromBCBP(flightId, data, format, pkpass);
}

export async function archiveFlight(flightId: number, state: number = 1) {
  const repository = getRepositoryOrThrow("Can't archive flight: database not opened");
  await repository.archiveFlight(flightId, state);
}

export async function deleteFlight(flightId: number): Promise<boolean> {
  const repository = getRepositoryOrThrow("Can't delete flight: database not opened");
  return repository.deleteFlight(flightId);
}

export async function getStats(): Promise<StatsData> {
  const repository = getRepositoryOrThrow("Can't get stats: database not opened");
  return repository.getStats();
}

export async function getAchievements(): Promise<AchievementData[]> {
  const repository = getRepositoryOrThrow("Can't get achievement: database not opened");
  return repository.getAchievements();
}

export async function exportFlights(): Promise<any[]> {
  const repository = getRepositoryOrThrow("Can't select flights: database not opened");
  return repository.exportFlights();
}

export async function getAirlines(): Promise<Array<AirlineData>> {
  const repository = getRepositoryOrThrow("Can't get achievement: database not opened");
  return repository.getAirlines();
}
