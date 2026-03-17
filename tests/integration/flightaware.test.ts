import { fetch } from '@/helpers/common';
import { checkApi, getFlightData } from '@/helpers/flights/flightaware';
import type { Flight } from '@/types';

jest.mock('@/helpers/common', () => ({
  fetch: jest.fn(),
}));

jest.mock('@/helpers/datetime', () => ({
  fromUTCtoLocalISOString: jest.fn((datetime: string, timezone: string) => `${datetime}|${timezone}`),
}));

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('FlightAware AeroAPI', () => {
  const apiUrl = 'https://example.com/aeroapi';
  const apiKey = 'test-aeroapi-key';
  const airline = 'AA';
  const flightNumber = '123';
  const flightDate = '2024-01-01';

  beforeEach(() => {
    mockFetch.mockClear();
  });

  test('checkApi returns true when account endpoint is available', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200 } as any);

    const ok = await checkApi(apiUrl, apiKey);

    expect(ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(`${apiUrl}/account/usage`, {
      headers: { 'x-apikey': apiKey },
      timeout: 3000,
    });
  });

  test('checkApi returns false on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const ok = await checkApi(apiUrl, apiKey);

    expect(ok).toBe(false);
  });

  test('getFlightData returns normalized flight on successful response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        flights: [
          {
            status: 'En Route',
            operator: 'American Airlines',
            operator_iata: 'AA',
            flight_number: '123',
            registration: 'N123AA',
            aircraft_type: 'B738',
            route_distance: 3974,
            scheduled_out: '2024-01-01T17:00:00Z',
            estimated_out: '2024-01-01T17:20:00Z',
            actual_out: null,
            scheduled_in: '2024-01-01T23:00:00Z',
            estimated_in: '2024-01-01T23:30:00Z',
            actual_in: null,
            terminal_origin: '4',
            gate_origin: 'A12',
            terminal_destination: 'B',
            baggage_claim: '5',
            origin: {
              code_iata: 'LAX',
              timezone: 'America/Los_Angeles',
            },
            destination: {
              code_iata: 'JFK',
              timezone: 'America/New_York',
            },
          },
        ],
      }),
    } as any);

    const expected: Flight = {
      actualEndDatetime: '2024-01-01T23:30:00Z|America/New_York',
      actualStartDatetime: '2024-01-01T17:20:00Z|America/Los_Angeles',
      aircraftRegNumber: 'N123AA',
      aircraftType: 'B738',
      airline: 'AA',
      arrivalAirport: 'JFK',
      arrivalAirportTimezone: 'America/New_York',
      arrivalCountry: 'US',
      arrivalTerminal: 'B',
      baggageBelt: '5',
      departureAirport: 'LAX',
      departureAirportTimezone: 'America/Los_Angeles',
      departureCountry: 'US',
      departureCheckInDesk: undefined,
      departureGate: 'A12',
      departureTerminal: '4',
      distance: 3974,
      endDatetime: '2024-01-01T23:00:00Z|America/New_York',
      extra: {},
      flightNumber: '123',
      info: {
        state: '',
      },
      isArchived: false,
      recordType: 1,
      startDatetime: '2024-01-01T17:00:00Z|America/Los_Angeles',
      status: 'en_route',
    };

    const flight = await getFlightData(airline, flightNumber, flightDate, apiUrl, apiKey);

    expect(flight).toEqual(expected);
    expect(mockFetch).toHaveBeenCalledWith(
      `${apiUrl}/flights/${airline}${flightNumber}?ident_type=designator&start=${flightDate}&end=${flightDate}T23:59:59Z`,
      { headers: { 'x-apikey': apiKey }, timeout: 3000 },
    );
  });

  test('getFlightData returns null when API responds with non-200', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({ error: 'Unauthorized' }),
    } as any);

    const flight = await getFlightData(airline, flightNumber, flightDate, apiUrl, apiKey);

    expect(flight).toBeNull();
  });

  test('getFlightData returns null when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('Timeout'));

    const flight = await getFlightData(airline, flightNumber, flightDate, apiUrl, apiKey);

    expect(flight).toBeNull();
  });

  test('getFlightData returns unknown status for unsupported status values', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        flights: [
          {
            status: 'Some New Status',
            operator_iata: 'AA',
            flight_number: '123',
            scheduled_out: '2024-01-01T17:00:00Z',
            scheduled_in: '2024-01-01T23:00:00Z',
            origin: { code_iata: 'LAX', timezone: 'America/Los_Angeles' },
            destination: { code_iata: 'JFK', timezone: 'America/New_York' },
          },
        ],
      }),
    } as any);

    const flight = await getFlightData(airline, flightNumber, flightDate, apiUrl, apiKey);

    expect(flight?.status).toBe('unknown');
  });

  test('getFlightData sets info.state when status is boarding/checkin/gateclosed', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        flights: [
          {
            status: 'Gate Closed',
            operator_iata: 'AA',
            flight_number: '123',
            scheduled_out: '2055-01-01T17:00:00Z',
            scheduled_in: '2055-01-01T23:00:00Z',
            origin: { code_iata: 'LAX', timezone: 'America/Los_Angeles' },
            destination: { code_iata: 'JFK', timezone: 'America/New_York' },
          },
        ],
      }),
    } as any);

    const flight = await getFlightData(airline, flightNumber, flightDate, apiUrl, apiKey);

    expect(flight?.info.state).toBe('gateclosed');
  });

  test('getFlightData fills extra when operator differs from requested airline', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        flights: [
          {
            status: 'Scheduled',
            operator: 'American Eagle',
            operator_iata: 'MQ',
            flight_number: '4567',
            scheduled_out: '2055-01-01T17:00:00Z',
            scheduled_in: '2055-01-01T23:00:00Z',
            origin: { code_iata: 'LAX', timezone: 'America/Los_Angeles' },
            destination: { code_iata: 'JFK', timezone: 'America/New_York' },
          },
        ],
      }),
    } as any);

    const flight = await getFlightData(airline, flightNumber, flightDate, apiUrl, apiKey);

    expect(flight?.extra).toEqual({
      carrier: 'MQ',
      carrierName: 'American Eagle',
      carrierFlightNumber: '4567',
    });
  });

  test('getFlightData returns null for empty flights array', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ flights: [] }),
    } as any);

    const flight = await getFlightData(airline, flightNumber, flightDate, apiUrl, apiKey);

    expect(flight).toBeNull();
  });

  test('getFlightData returns null when mandatory date/timezone fields are missing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        flights: [
          {
            status: 'Scheduled',
            operator_iata: 'AA',
            flight_number: '123',
            scheduled_out: null,
            scheduled_in: '2024-01-01T23:00:00Z',
            origin: { code_iata: 'LAX', timezone: 'America/Los_Angeles' },
            destination: { code_iata: 'JFK', timezone: 'America/New_York' },
          },
        ],
      }),
    } as any);

    const flight = await getFlightData(airline, flightNumber, flightDate, apiUrl, apiKey);

    expect(flight).toBeNull();
  });
});
