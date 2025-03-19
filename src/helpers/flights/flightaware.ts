import type { Flight, FlightStatus } from '@/types';
import { fromUTCtoLocalISOString } from '@/helpers/datetime';
import airports from '@/constants/airports.json';


export async function getFlightData(airline: string, flightNumber: string, flightDate: string, apiUrl: string, apiKey: string): Promise<Flight | null> {
  const url = `${apiUrl}/flights/${airline}${flightNumber}?start=${flightDate}&end=${flightDate}T23:59:59Z`;
  const headers = {
    'x-apikey': apiKey,
  };
  const response = await fetch(url, { headers });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  if (!data || !data.flights || !data.flights.length || data.flights.length === 0) {
    return null;
  }
  const flightData = data.flights[0];
  let result: Flight | null = null;
  const arrivalAirport = airports.find(x => x.iata_code === flightData.destination.code_iata);
  const departureAirport = airports.find(x => x.iata_code === flightData.origin.code_iata);
  try {
    result = {
      actualEndDatetime: fromUTCtoLocalISOString(flightData.actual_in ?? flightData.estimated_in, flightData.destination.timezone),
      actualStartDatetime: fromUTCtoLocalISOString(flightData.actual_out ?? flightData.estimated_out, flightData.origin.timezone),
      aircraftRegNumber: flightData.registration ?? '',
      aircraftType: flightData.aircraft_type,
      airline: flightData.operator_iata,
      arrivalAirport: flightData.destination.code_iata,
      arrivalAirportTimezone: flightData.destination.timezone,
      arrivalCountry: arrivalAirport?.country_code ?? '',
      arrivalTerminal: flightData.terminal_destination ?? undefined,
      baggageBelt: flightData.baggage_claim ?? undefined,
      departureAirport: flightData.origin.code_iata,
      departureAirportTimezone: flightData.origin.timezone,
      departureCountry: departureAirport?.country_code ?? '',
      departureCheckInDesk: flightData.origin.checkInDesk ?? undefined,
      departureGate: flightData.gate_origin ?? undefined,
      departureTerminal: flightData.terminal_origin ?? undefined,
      distance: Math.round(flightData.route_distance ?? 0),
      endDatetime: fromUTCtoLocalISOString(flightData.scheduled_in, flightData.destination.timezone),
      extra: {},
      flightNumber: flightData.flight_number,
      isArchived: false,
      recordType: 1,
      startDatetime: fromUTCtoLocalISOString(flightData.scheduled_out, flightData.origin.timezone),
      status: (flightData.status?.toLowerCase() ?? 'unknown') as FlightStatus,
    };
  } catch (e) {
    console.error(e);
  }
  return result;
}
