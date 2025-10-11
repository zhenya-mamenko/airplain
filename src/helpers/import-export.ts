import { getAirlineData } from '@/helpers/airdata';
import { isFlightExists } from '@/helpers/sqlite';

export function processExportData(flights: any): string {
  if (!flights || flights.length === 0) return '';

  const headers = Object.keys(flights[0]).filter(
    (x) =>
      ![
        'flight_id',
        'airline_id',
        'airline_name',
        'is_archived',
        'record_type',
        'extra',
        'notes',
        'check_in_link',
        'check_in_time',
      ].includes(x),
  );

  const data = flights
    .map((x: any) => {
      const result: Array<string> = [];
      headers.forEach((h) => {
        result.push(x[h]);
      });
      return result.join(',');
    })
    .join('\n');

  return `${headers.join(',')}\n${data}`;
}

export async function processImportData(records: any): Promise<Array<any>> {
  const data: Array<any> = [];

  const fields = [
    'airline',
    'flight_number',
    'departure_airport',
    'departure_country',
    'departure_airport_timezone',
    'arrival_airport',
    'arrival_country',
    'arrival_airport_timezone',
    'start_datetime',
    'end_datetime',
    'distance',
    'actual_end_datetime',
    'actual_start_datetime',
    'departure_terminal',
    'departure_check_in_desk',
    'departure_gate',
    'arrival_terminal',
    'baggage_belt',
    'aircraft_type',
    'aircraft_reg_number',
    'status',
  ];

  const checkLen = (r: any, field: string, len: number): boolean => {
    return (r[field] as string).length === len;
  };

  for (const r of records) {
    const entries = Object.entries(r)
      .filter((x) => fields.includes(x[0]))
      .map((x) => [x[0] as string, x[1] as string]);
    if (
      entries.filter(
        (x) =>
          fields.slice(0, 11).includes(x[0]) &&
          (x[1] + '').toLowerCase() !== 'null' &&
          x[1] !== undefined &&
          x[1] + '' !== '',
      ).length !== 11
    )
      continue;

    const flight = Object.fromEntries(entries);
    if (!checkLen(flight, 'airline', 2)) continue;

    const startDate = new Date(flight.start_datetime);
    if (isNaN(startDate.valueOf())) continue;

    if (
      !!(await isFlightExists(
        flight.airline,
        flight.flight_number,
        startDate.toISOString().substring(0, 10),
      ))
    )
      continue;

    const airlineData = getAirlineData(flight.airline);
    if (!airlineData) {
      flight.airline_id = null;
      flight.extra = JSON.stringify({
        airline: flight.airline,
        airline_name: flight.airline,
      });
    } else {
      flight.airline_id = airlineData.airlineId;
    }
    delete flight.airline;

    if (
      !checkLen(flight, 'departure_airport', 3) ||
      !checkLen(flight, 'arrival_airport', 3) ||
      !checkLen(flight, 'departure_country', 2) ||
      !checkLen(flight, 'arrival_country', 2)
    )
      continue;

    if (isNaN(parseInt(flight.distance as string))) {
      flight.distance = 0;
    }

    if (isNaN(Date.parse(flight.end_datetime))) continue;
    if (
      !!flight.actual_start_datetime &&
      isNaN(Date.parse(flight.actual_start_datetime))
    )
      continue;
    if (
      !!flight.actual_end_datetime &&
      isNaN(Date.parse(flight.actual_end_datetime))
    )
      continue;

    flight.actual_start_datetime = !!flight.actual_start_datetime
      ? flight.actual_start_datetime
      : flight.start_datetime;
    flight.actual_end_datetime = !!flight.actual_end_datetime
      ? flight.actual_end_datetime
      : flight.end_datetime;

    if (!flight.status) {
      flight.status =
        new Date(flight.actual_end_datetime) < new Date()
          ? 'scheduled'
          : 'arrived';
    }
    flight.status = ['arrived', 'canceled', 'diverted', 'scheduled'].includes(
      flight.status,
    )
      ? flight.status
      : 'arrived';
    flight.record_type = 0;
    flight.is_archived =
      new Date(flight.actual_end_datetime) < new Date() ? 1 : 0;
    for (const f of fields) {
      if (
        flight[f] === null ||
        flight[f] === undefined ||
        flight[f].toString().toLowerCase() === 'null'
      ) {
        delete flight[f];
      }
    }
    data.push(flight);
  }

  return data;
}
