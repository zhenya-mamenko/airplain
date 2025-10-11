import { getFlightData } from '@/helpers/flights/aerodatabox';
import { fetch } from '@/helpers/common';
import type { Flight } from '@/types';

jest.mock('@/helpers/common', () => ({
  fetch: jest.fn(),
}));

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Aerodatabox API', () => {
  const apiUrl = 'https://example.com/api';
  const apiKey = 'test-api-key';
  const airline = 'AA';
  const flightNumber = '123';
  const flightDate = '2024-01-01';

  beforeEach(() => {
    mockFetch.mockClear();
  });

  test('getFlightData return flight data when the API call is successful', async () => {
    const mockFlightData = [
      {
        arrival: {
          revisedTime: { local: '2024-01-01T15:00:00' },
          scheduledTime: { local: '2024-01-01T14:00:00' },
          airport: {
            iata: 'JFK',
            timeZone: 'America/New_York',
            countryCode: 'US',
          },
          terminal: '4',
          baggageBelt: '1',
        },
        departure: {
          revisedTime: { local: '2024-01-01T10:00:00' },
          scheduledTime: { local: '2024-01-01T09:00:00' },
          airport: {
            iata: 'LAX',
            timeZone: 'America/Los_Angeles',
            countryCode: 'US',
          },
          terminal: 'B',
          checkInDesk: '1-10',
          gate: '42',
        },
        aircraft: { reg: 'N123AA', model: 'Boeing 737' },
        greatCircleDistance: { km: 3940 },
        status: 'Arrived',
        airline: { iata: 'AA', name: 'American Airlines' },
        number: 'AA 123',
        flightNumber: '123',
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockFlightData),
    } as any);

    const expectedFlight: Flight = {
      actualEndDatetime: '2024-01-01T15:00:00',
      actualStartDatetime: '2024-01-01T10:00:00',
      aircraftRegNumber: 'N123AA',
      aircraftType: 'Boeing 737',
      airline: 'AA',
      arrivalAirport: 'JFK',
      arrivalAirportTimezone: 'America/New_York',
      arrivalCountry: 'US',
      arrivalTerminal: '4',
      baggageBelt: '1',
      departureAirport: 'LAX',
      departureAirportTimezone: 'America/Los_Angeles',
      departureCountry: 'US',
      departureCheckInDesk: '1-10',
      departureGate: '42',
      departureTerminal: 'B',
      distance: 3940,
      endDatetime: '2024-01-01T14:00:00',
      extra: {},
      flightNumber: '123',
      info: { state: '' },
      isArchived: true,
      recordType: 1,
      startDatetime: '2024-01-01T09:00:00',
      status: 'arrived',
    };

    const flight = await getFlightData(
      airline,
      flightNumber,
      flightDate,
      apiUrl,
      apiKey,
    );
    expect(flight).toEqual(expectedFlight);
    expect(mockFetch).toHaveBeenCalledWith(
      `${apiUrl}/flights/Number/${airline}${flightNumber}/${flightDate}?dateLocalRole=Departure&withAircraftImage=false&withLocation=false`,
      { headers: { 'x-magicapi-key': apiKey }, timeout: 3000 },
    );
  });

  test('getFlightData return null when the API call fails', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'));

    const flight = await getFlightData(
      airline,
      flightNumber,
      flightDate,
      apiUrl,
      apiKey,
    );
    expect(flight).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      `${apiUrl}/flights/Number/${airline}${flightNumber}/${flightDate}?dateLocalRole=Departure&withAircraftImage=false&withLocation=false`,
      { headers: { 'x-magicapi-key': apiKey }, timeout: 3000 },
    );
  });

  test('getFlightData return null when the API response is not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    } as any);

    const flight = await getFlightData(
      airline,
      flightNumber,
      flightDate,
      apiUrl,
      apiKey,
    );
    expect(flight).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      `${apiUrl}/flights/Number/${airline}${flightNumber}/${flightDate}?dateLocalRole=Departure&withAircraftImage=false&withLocation=false`,
      { headers: { 'x-magicapi-key': apiKey }, timeout: 3000 },
    );
  });

  test('getFlightData return null when the API response data is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue([]),
    } as any);

    const flight = await getFlightData(
      airline,
      flightNumber,
      flightDate,
      apiUrl,
      apiKey,
    );
    expect(flight).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      `${apiUrl}/flights/Number/${airline}${flightNumber}/${flightDate}?dateLocalRole=Departure&withAircraftImage=false&withLocation=false`,
      { headers: { 'x-magicapi-key': apiKey }, timeout: 3000 },
    );
  });

  test('getFlightData return correct status when status is in adbFlightStatuses', async () => {
    const mockFlightData = [
      {
        arrival: {
          revisedTime: { local: '2024-01-01T15:00:00' },
          scheduledTime: { local: '2024-01-01T14:00:00' },
          airport: {
            iata: 'JFK',
            timeZone: 'America/New_York',
            countryCode: 'US',
          },
        },
        departure: {
          revisedTime: { local: '2024-01-01T10:00:00' },
          scheduledTime: { local: '2024-01-01T09:00:00' },
          airport: {
            iata: 'LAX',
            timeZone: 'America/Los_Angeles',
            countryCode: 'US',
          },
        },
        aircraft: { reg: 'N123AA', model: 'Boeing 737' },
        greatCircleDistance: { km: 3940 },
        status: 'EnRoute',
        airline: { iata: 'AA', name: 'American Airlines' },
        number: 'AA 123',
        flightNumber: '123',
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockFlightData),
    } as any);

    const flight = await getFlightData(
      airline,
      flightNumber,
      flightDate,
      apiUrl,
      apiKey,
    );
    expect(flight?.status).toBe('en_route');
  });

  test('getFlightData return unknown status when status is not in adbFlightStatuses', async () => {
    const mockFlightData = [
      {
        arrival: {
          revisedTime: { local: '2024-01-01T15:00:00' },
          scheduledTime: { local: '2024-01-01T14:00:00' },
          airport: {
            iata: 'JFK',
            timeZone: 'America/New_York',
            countryCode: 'US',
          },
        },
        departure: {
          revisedTime: { local: '2024-01-01T10:00:00' },
          scheduledTime: { local: '2024-01-01T09:00:00' },
          airport: {
            iata: 'LAX',
            timeZone: 'America/Los_Angeles',
            countryCode: 'US',
          },
        },
        aircraft: { reg: 'N123AA', model: 'Boeing 737' },
        greatCircleDistance: { km: 3940 },
        status: 'SomeUnknownStatus',
        airline: { iata: 'AA', name: 'American Airlines' },
        number: 'AA 123',
        flightNumber: '123',
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockFlightData),
    } as any);

    const flight = await getFlightData(
      airline,
      flightNumber,
      flightDate,
      apiUrl,
      apiKey,
    );
    expect(flight?.status).toBe('unknown');
  });

  test('getFlightData set isArchived to true if actualEndDatetime is in the past', async () => {
    const mockFlightData = [
      {
        arrival: {
          revisedTime: { local: '2023-01-01T15:00:00' },
          scheduledTime: { local: '2023-01-01T14:00:00' },
          airport: {
            iata: 'JFK',
            timeZone: 'America/New_York',
            countryCode: 'US',
          },
        },
        departure: {
          revisedTime: { local: '2023-01-01T10:00:00' },
          scheduledTime: { local: '2023-01-01T09:00:00' },
          airport: {
            iata: 'LAX',
            timeZone: 'America/Los_Angeles',
            countryCode: 'US',
          },
        },
        aircraft: { reg: 'N123AA', model: 'Boeing 737' },
        greatCircleDistance: { km: 3940 },
        status: 'Arrived',
        airline: { iata: 'AA', name: 'American Airlines' },
        number: 'AA 123',
        flightNumber: '123',
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockFlightData),
    } as any);

    const flight = await getFlightData(
      airline,
      flightNumber,
      flightDate,
      apiUrl,
      apiKey,
    );
    expect(flight?.isArchived).toBe(true);
  });

  test('getFlightData set isArchived to false if actualEndDatetime is in the future', async () => {
    const mockFlightData = [
      {
        arrival: {
          revisedTime: { local: '2055-01-01T15:00:00' },
          scheduledTime: { local: '2055-01-01T14:00:00' },
          airport: {
            iata: 'JFK',
            timeZone: 'America/New_York',
            countryCode: 'US',
          },
        },
        departure: {
          revisedTime: { local: '2025-01-01T10:00:00' },
          scheduledTime: { local: '2025-01-01T09:00:00' },
          airport: {
            iata: 'LAX',
            timeZone: 'America/Los_Angeles',
            countryCode: 'US',
          },
        },
        aircraft: { reg: 'N123AA', model: 'Boeing 737' },
        greatCircleDistance: { km: 3940 },
        status: 'Arrived',
        airline: { iata: 'AA', name: 'American Airlines' },
        number: 'AA 123',
        flightNumber: '123',
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockFlightData),
    } as any);

    const flight = await getFlightData(
      airline,
      flightNumber,
      flightDate,
      apiUrl,
      apiKey,
    );
    expect(flight?.isArchived).toBe(false);
  });

  test('getFlightData set isArchived to false if actualEndDatetime is not provided but endDatetime is in the future', async () => {
    const mockFlightData = [
      {
        arrival: {
          scheduledTime: { local: '2055-01-01T14:00:00' },
          airport: {
            iata: 'JFK',
            timeZone: 'America/New_York',
            countryCode: 'US',
          },
        },
        departure: {
          revisedTime: { local: '2025-01-01T10:00:00' },
          scheduledTime: { local: '2025-01-01T09:00:00' },
          airport: {
            iata: 'LAX',
            timeZone: 'America/Los_Angeles',
            countryCode: 'US',
          },
        },
        aircraft: { reg: 'N123AA', model: 'Boeing 737' },
        greatCircleDistance: { km: 3940 },
        status: 'Arrived',
        airline: { iata: 'AA', name: 'American Airlines' },
        number: 'AA 123',
        flightNumber: '123',
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockFlightData),
    } as any);

    const flight = await getFlightData(
      airline,
      flightNumber,
      flightDate,
      apiUrl,
      apiKey,
    );
    expect(flight?.isArchived).toBe(false);
  });

  test('getFlightData set isArchived to true if actualEndDatetime is not provided but endDatetime is in the past', async () => {
    const mockFlightData = [
      {
        arrival: {
          scheduledTime: { local: '2023-01-01T14:00:00' },
          airport: {
            iata: 'JFK',
            timeZone: 'America/New_York',
            countryCode: 'US',
          },
        },
        departure: {
          revisedTime: { local: '2023-01-01T10:00:00' },
          scheduledTime: { local: '2023-01-01T09:00:00' },
          airport: {
            iata: 'LAX',
            timeZone: 'America/Los_Angeles',
            countryCode: 'US',
          },
        },
        aircraft: { reg: 'N123AA', model: 'Boeing 737' },
        greatCircleDistance: { km: 3940 },
        status: 'Arrived',
        airline: { iata: 'AA', name: 'American Airlines' },
        number: 'AA 123',
        flightNumber: '123',
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockFlightData),
    } as any);

    const flight = await getFlightData(
      airline,
      flightNumber,
      flightDate,
      apiUrl,
      apiKey,
    );
    expect(flight?.isArchived).toBe(true);
  });

  test('getFlightData add carrier info to extra if airline iata is different', async () => {
    const mockFlightData = [
      {
        arrival: {
          revisedTime: { local: '2024-01-01T15:00:00' },
          scheduledTime: { local: '2024-01-01T14:00:00' },
          airport: {
            iata: 'JFK',
            timeZone: 'America/New_York',
            countryCode: 'US',
          },
        },
        departure: {
          revisedTime: { local: '2024-01-01T10:00:00' },
          scheduledTime: { local: '2024-01-01T09:00:00' },
          airport: {
            iata: 'LAX',
            timeZone: 'America/Los_Angeles',
            countryCode: 'US',
          },
        },
        aircraft: { reg: 'N123AA', model: 'Boeing 737' },
        greatCircleDistance: { km: 3940 },
        status: 'Arrived',
        airline: { iata: 'DL', name: 'Delta Airlines' },
        number: 'DL 456',
        flightNumber: '456',
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockFlightData),
    } as any);

    const flight = await getFlightData(
      airline,
      flightNumber,
      flightDate,
      apiUrl,
      apiKey,
    );
    expect(flight?.extra).toEqual({
      carrier: 'DL',
      carrierName: 'Delta Airlines',
      carrierFlightNumber: '456',
    });
  });

  test('getFlightData set info.state to flightData.status.toLowerCase() if status is checkin, boarding or gateclosed', async () => {
    const statuses = ['checkin', 'boarding', 'gateclosed'];
    for (const status of statuses) {
      const mockFlightData = [
        {
          arrival: {
            revisedTime: { local: '2024-01-01T15:00:00' },
            scheduledTime: { local: '2024-01-01T14:00:00' },
            airport: {
              iata: 'JFK',
              timeZone: 'America/New_York',
              countryCode: 'US',
            },
          },
          departure: {
            revisedTime: { local: '2024-01-01T10:00:00' },
            scheduledTime: { local: '2024-01-01T09:00:00' },
            airport: {
              iata: 'LAX',
              timeZone: 'America/Los_Angeles',
              countryCode: 'US',
            },
          },
          aircraft: { reg: 'N123AA', model: 'Boeing 737' },
          greatCircleDistance: { km: 3940 },
          status: status,
          airline: { iata: 'AA', name: 'American Airlines' },
          number: 'AA 123',
          flightNumber: '123',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockFlightData),
      } as any);

      const flight = await getFlightData(
        airline,
        flightNumber,
        flightDate,
        apiUrl,
        apiKey,
      );
      expect(flight?.info.state).toBe(status);
    }
  });

  test('getFlightData set info.state to empty string if status is not checkin, boarding or gateclosed', async () => {
    const statuses = ['Arrived', 'Departed', 'EnRoute', 'Canceled'];
    for (const status of statuses) {
      const mockFlightData = [
        {
          arrival: {
            revisedTime: { local: '2024-01-01T15:00:00' },
            scheduledTime: { local: '2024-01-01T14:00:00' },
            airport: {
              iata: 'JFK',
              timeZone: 'America/New_York',
              countryCode: 'US',
            },
          },
          departure: {
            revisedTime: { local: '2024-01-01T10:00:00' },
            scheduledTime: { local: '2024-01-01T09:00:00' },
            airport: {
              iata: 'LAX',
              timeZone: 'America/Los_Angeles',
              countryCode: 'US',
            },
          },
          aircraft: { reg: 'N123AA', model: 'Boeing 737' },
          greatCircleDistance: { km: 3940 },
          status: status,
          airline: { iata: 'AA', name: 'American Airlines' },
          number: 'AA 123',
          flightNumber: '123',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockFlightData),
      } as any);

      const flight = await getFlightData(
        airline,
        flightNumber,
        flightDate,
        apiUrl,
        apiKey,
      );
      expect(flight?.info.state).toBe('');
    }
  });
});
