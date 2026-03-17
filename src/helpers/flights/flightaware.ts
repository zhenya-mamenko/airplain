import airports from '@/constants/airports.json';
import { fetch } from '@/helpers/common';
import { fromUTCtoLocalISOString } from '@/helpers/datetime';
import type { Flight, FlightStatus } from '@/types';

type FlightDataErrorType = 'unauthorized' | 'request_failed' | null;

let lastFlightDataError: FlightDataErrorType = null;

export function getLastFlightDataError(): FlightDataErrorType {
  return lastFlightDataError;
}

const aeroapiFlightStatuses: { [key: string]: FlightStatus } = {
  arrived: 'arrived',
  boarding: 'boarding',
  canceled: 'canceled',
  cancelled: 'canceled',
  checkin: 'checkin',
  delayed: 'delayed',
  departed: 'departed',
  diverted: 'diverted',
  enroute: 'en_route',
  gateclosed: 'gateclosed',
  ontime: 'on_time',
  scheduled: 'scheduled',
  unknown: 'unknown',
};

function normalizeStatus(status: string | undefined): FlightStatus {
  const normalized = (status ?? 'unknown').toLowerCase().replace(/[\s_-]/g, '');
  return aeroapiFlightStatuses[normalized] ?? 'unknown';
}

function toLocalIsoOrUndefined(datetime: string | undefined, timezone: string | undefined): string | undefined {
  if (!datetime || !timezone) {
    return undefined;
  }
  return fromUTCtoLocalISOString(datetime, timezone);
}

export async function checkApi(apiUrl: string, apiKey: string): Promise<boolean> {
  const url = `${apiUrl}/account/usage`;
  const headers = {
    'x-apikey': apiKey,
  };
  let response = null;
  try {
    response = await fetch(url, { headers, timeout: 3000 });
  } catch (error) {
    console.debug(`Error checking aeroapi connection: ${error}`);
    return false;
  }
  return !!response && response.ok && response.status === 200;
}

export async function getFlightData(
  airline: string,
  flightNumber: string,
  flightDate: string,
  apiUrl: string,
  apiKey: string,
): Promise<Flight | null> {
  lastFlightDataError = null;
  const url = `${apiUrl}/flights/${airline}${flightNumber}?ident_type=designator&start=${flightDate}&end=${flightDate}T23:59:59Z`;
  const headers = {
    'x-apikey': apiKey,
  };
  let response = null;
  try {
    response = await fetch(url, { headers, timeout: 3000 });
  } catch (error) {
    console.debug(`Error fetching flight data from aeroapi: ${error}`);
    lastFlightDataError = 'request_failed';
    return null;
  }
  if (!response || !response.ok || response.status !== 200) {
    if (response && (response.status === 401 || response.status === 403)) {
      lastFlightDataError = 'unauthorized';
    } else {
      lastFlightDataError = 'request_failed';
    }
    console.debug(`Error response from aeroapi:\n${url}\nResponse: ${JSON.stringify(response, null, 2)}`);
    try {
      if (response && response.json) {
        const errorData = await response.json();
        console.debug(`Error data from aeroapi:\n${JSON.stringify(errorData, null, 2)}`);
      }
    } catch {}
    return null;
  }
  const data = await response.json();
  if (!data || !data.flights || !data.flights.length || data.flights.length === 0) {
    console.debug(`No flight data found for aeroapi: ${airline} ${flightNumber} ${flightDate}`);
    return null;
  }
  const flightData = data.flights[0];
  const departureTimezone = flightData.origin?.timezone;
  const arrivalTimezone = flightData.destination?.timezone;
  const startDatetimeUtc = flightData.scheduled_out ?? flightData.estimated_out ?? flightData.actual_out;
  const endDatetimeUtc = flightData.scheduled_in ?? flightData.estimated_in ?? flightData.actual_in;
  if (!startDatetimeUtc || !endDatetimeUtc || !departureTimezone || !arrivalTimezone) {
    console.debug(`Incomplete flight data from aeroapi:\n${JSON.stringify(flightData, null, 2)}`);
    return null;
  }

  let result: Flight | null = null;
  const arrivalAirport = airports.find((x) => x.iata_code === flightData.destination.code_iata);
  const departureAirport = airports.find((x) => x.iata_code === flightData.origin.code_iata);
  try {
    result = {
      actualEndDatetime: toLocalIsoOrUndefined(flightData.actual_in ?? flightData.estimated_in, arrivalTimezone),
      actualStartDatetime: toLocalIsoOrUndefined(flightData.actual_out ?? flightData.estimated_out, departureTimezone),
      aircraftRegNumber: flightData.registration ?? '',
      aircraftType: flightData.aircraft_type ?? '',
      airline,
      arrivalAirport: flightData.destination.code_iata,
      arrivalAirportTimezone: arrivalTimezone,
      arrivalCountry: arrivalAirport?.country_code ?? '',
      arrivalTerminal: flightData.terminal_destination ?? undefined,
      baggageBelt: flightData.baggage_claim ?? undefined,
      departureAirport: flightData.origin.code_iata,
      departureAirportTimezone: departureTimezone,
      departureCountry: departureAirport?.country_code ?? '',
      departureCheckInDesk: flightData.origin.checkInDesk ?? undefined,
      departureGate: flightData.gate_origin ?? undefined,
      departureTerminal: flightData.terminal_origin ?? undefined,
      distance: Math.round(flightData.route_distance ?? 0),
      endDatetime: fromUTCtoLocalISOString(endDatetimeUtc, arrivalTimezone),
      extra: {},
      flightNumber,
      info: {
        state: ['checkin', 'boarding', 'gateclosed'].includes(normalizeStatus(flightData.status))
          ? normalizeStatus(flightData.status)
          : '',
      },
      isArchived: false,
      recordType: 1,
      startDatetime: fromUTCtoLocalISOString(startDatetimeUtc, departureTimezone),
      status: normalizeStatus(flightData.status),
    };
  } catch (e) {
    console.debug(`Error parsing flight data from aeroapi: ${e}`);
    return null;
  }
  result.isArchived = new Date(result.actualEndDatetime ?? result.endDatetime) < new Date();
  if ((flightData.operator_iata ?? '').toUpperCase() !== airline.toUpperCase()) {
    result.extra = {
      carrier: flightData.operator_iata ?? undefined,
      carrierName: flightData.operator ?? undefined,
      carrierFlightNumber: flightData.flight_number,
    };
  }
  console.debug(`Fetched flight data from aeroapi:\n${JSON.stringify(result, null, 2)}`);
  return result;
}
