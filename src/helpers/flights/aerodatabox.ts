import type { Flight, FlightStatus } from '@/types';

const adbFlightStatuses: {[key: string]: FlightStatus} = {
  Approaching: 'en_route',
  Arrived: 'arrived',
  Boarding: 'boarding',
  Canceled: 'canceled',
  CanceledUncertain: 'unknown',
  CheckIn: 'checkin',
  Delayed: 'delayed',
  Departed: 'departed',
  Diverted: 'diverted',
  EnRoute: 'en_route',
  Expected: 'scheduled',
  GateClosed: 'gateclosed',
  Unknown: 'unknown',
}

export async function getFlightData(airline: string, flightNumber: string, flightDate: string, apiUrl: string, apiKey: string): Promise<Flight | null> {
  const url = `${apiUrl}/flights/Number/${airline}${flightNumber}/${flightDate}?dateLocalRole=Departure&withAircraftImage=false&withLocation=false`;
  const headers = {
    'x-magicapi-key': apiKey,
  };
  const response = await fetch(url, { headers });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  if (!data || !data.length || data.length === 0) {
    return null;
  }

  const flightData = data[0];
  const result = {
    actualEndDatetime: flightData.arrival.revisedTime?.local,
    actualStartDatetime: flightData.departure.revisedTime?.local,
    aircraftRegNumber: flightData.aircraft.reg ?? '',
    aircraftType: flightData.aircraft.model ?? '',
    airline,
    arrivalAirport: flightData.arrival.airport.iata,
    arrivalAirportTimezone: flightData.arrival.airport.timeZone,
    arrivalCountry: flightData.arrival.airport.countryCode,
    arrivalTerminal: flightData.arrival.terminal ?? undefined,
    baggageBelt: flightData.arrival.baggageBelt ?? undefined,
    departureAirport: flightData.departure.airport.iata,
    departureAirportTimezone: flightData.departure.airport.timeZone,
    departureCountry: flightData.departure.airport.countryCode,
    departureCheckInDesk: flightData.departure.checkInDesk ?? undefined,
    departureGate: flightData.departure.gate ?? undefined,
    departureTerminal: flightData.departure.terminal ?? undefined,
    distance: Math.round(flightData.greatCircleDistance?.km ?? 0),
    endDatetime: flightData.arrival.scheduledTime.local,
    extra: {},
    flightNumber,
    info: {
      state: ['checkin', 'boarding', 'gateclosed'].includes(flightData.status.toLowerCase()) ? flightData.status.toLowerCase() : '',
    },
    isArchived: false,
    recordType: 1,
    startDatetime: flightData.departure.scheduledTime.local,
    status: adbFlightStatuses[flightData.status] ?? 'unknown',
  };
  result.isArchived = (new Date(result.actualEndDatetime ?? result.endDatetime)) < new Date();
  if (flightData.airline.iata !== airline) {
    flightData.extra = {
      carrier: flightData.airline.iata,
      carrierName: flightData.airline.name,
      carrierFlightNumber: flightData.number?.split(' ')[1] ?? flightData.flightNumber
    };
  }
  return result;
}
