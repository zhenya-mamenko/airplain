import { DateTime } from 'luxon';

import {
  airlineLogoUri,
  fetchActualFlights,
  flightsCheckTask,
  getAirlineData,
  getAirlinesData,
  getAirportData,
  loadAirlines,
  setFlightArchiveState,
} from '@/helpers/airdata';
import type { Flight } from '@/types';

const mockedAirlines = [
  {
    airlineId: 175,
    airlineCode: 'BA',
    airlineName: 'British Airways',
    checkInLink: 'https://www.britishairways.com/travel/olcilandingpageauthreq/public/en_gb/device-mobile',
    checkInTime: 24,
  },
  {
    airlineId: 406,
    airlineCode: 'F9',
    airlineName: 'Frontier Airlines',
    checkInLink: 'https://www.flyfrontier.com/travel/my-trips/manage-trip/',
    checkInTime: 24,
  },
];

const mockArchiveFlight = jest.fn();
const mockUpdateFlight = jest.fn();
const mockGetActualFlights = jest.fn<Promise<Flight[]>, [number]>();

jest.mock('@/helpers/sqlite', () => ({
  __esModule: true,
  getAirlines: async () => mockedAirlines,
  getActualFlights: (limit: number) => mockGetActualFlights(limit),
  archiveFlight: (flightId: number, state: number) => mockArchiveFlight(flightId, state),
  updateFlight: (flight: any) => mockUpdateFlight(flight),
}));

const mockGetSetting = jest.fn((key: string, defaultValue: string) => defaultValue);
const mockSetSetting = jest.fn();
const mockDeleteSetting = jest.fn();

jest.mock('@/constants/settings', () => ({
  __esModule: true,
  deleteSetting: (key: string) => mockDeleteSetting(key),
  getSetting: (key: string, defaultValue: string = '') => mockGetSetting(key, defaultValue),
  setSetting: (key: string, value: string) => mockSetSetting(key, value),
  settings: {
    FLIGHTS_LIMIT: 10,
  },
}));

const mockMakeCheckInLink = jest.fn((link: string, date: string, dep: string, pnr: string, flight: string) => link);
const mockStopBackgroundTask = jest.fn();

jest.mock('@/helpers/common', () => ({
  __esModule: true,
  stopBackgroundTask: () => mockStopBackgroundTask(),
  makeCheckInLink: (link: string, date: string, dep: string, pnr: string, flight: string) =>
    mockMakeCheckInLink(link, date, dep, pnr, flight),
}));

const mockGetFlightData = jest.fn<Promise<Flight | null>, [string, string, string]>();

jest.mock('@/helpers/flights', () => ({
  __esModule: true,
  getFlightData: (airline: string, flightNumber: string, date: string) =>
    mockGetFlightData(airline, flightNumber, date),
}));

const mockShowFlightNotification = jest.fn<Promise<void>, [string, string, any?]>();
const mockShowUrgentNotification = jest.fn<Promise<void>, [string, string, any?]>();

jest.mock('@/helpers/notifications', () => ({
  showFlightNotification: (title: string, body: string, data?: any) => mockShowFlightNotification(title, body, data),
  showUrgentNotification: (title: string, body: string, data?: any) => mockShowUrgentNotification(title, body, data),
}));

const mockEmitter = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

jest.mock('@/helpers/emitter', () => ({
  __esModule: true,
  default: mockEmitter,
}));

jest.mock('expo-localization', () => ({
  getCalendars: jest.fn(() => [{ timeZone: 'UTC' }]),
}));

jest.mock('@/helpers/localization', () => ({
  __esModule: true,
  default: jest.fn((key: string, params?: any) => {
    if (params) {
      return `${key}_${JSON.stringify(params)}`;
    }
    return key;
  }),
}));

describe('airdata helper', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockGetSetting.mockImplementation((key: string, defaultValue: string) => defaultValue);
    await loadAirlines();
  });

  test('getAirportData - English locale', () => {
    const airport = getAirportData('JFK');
    expect(airport).toEqual({
      airport_latitude: 40.63983,
      airport_longitude: -73.77874,
      airport_name: 'John F. Kennedy International Airport',
      country_code: 'US',
      iata_code: 'JFK',
      municipality_latitude: 40.71427,
      municipality_longitude: -74.00597,
      municipality_name: 'New York',
    });
  });

  test('getAirportData - Russian locale', () => {
    const airportRu = getAirportData('JFK', 'ru-RU');
    expect(airportRu).toEqual({
      airport_latitude: 40.63983,
      airport_longitude: -73.77874,
      airport_name: 'Международный аэропорт имени Джона Кеннеди',
      country_code: 'US',
      iata_code: 'JFK',
      municipality_latitude: 40.71427,
      municipality_longitude: -74.00597,
      municipality_name: 'Нью-Йорк',
    });
  });

  test('getAirportData - Unknown locale fallback', () => {
    const airport = getAirportData('JFK', 'de-DE');
    expect(airport).toEqual({
      airport_latitude: 40.63983,
      airport_longitude: -73.77874,
      airport_name: 'John F. Kennedy International Airport',
      country_code: 'US',
      iata_code: 'JFK',
      municipality_latitude: 40.71427,
      municipality_longitude: -74.00597,
      municipality_name: 'New York',
    });
  });

  test('getAirportData - Unknown airport code', () => {
    const airportUnknown = getAirportData('XXX');
    expect(airportUnknown).toBeUndefined();
  });

  test('getAirportData - Existing airport with non-English locale', () => {
    const airport = getAirportData('SVO', 'ru');
    expect(airport?.iata_code).toBe('SVO');
    expect(airport?.municipality_name).toBeTruthy();
  });

  test('getAirlineData', () => {
    const airline = getAirlineData('BA');
    expect(airline).toEqual(mockedAirlines[0]);

    const airlineUnknown = getAirlineData('XX');
    expect(airlineUnknown).toBeUndefined();
  });

  test('getAirlinesData', () => {
    const airlines = getAirlinesData();
    expect(airlines.length).toBe(mockedAirlines.length);
    expect(airlines).toEqual(mockedAirlines);
  });

  test('airlineLogoUri', () => {
    expect(airlineLogoUri('BA')).toEqual({
      uri: 'https://images.kiwi.com/airlines/64x64/BA.png',
    });
    expect(airlineLogoUri('BA', true)).toBe('https://images.kiwi.com/airlines/64x64/BA.png');
  });
});

describe('updateFlightsState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmitter.emit = jest.fn();
    mockEmitter.on = jest.fn();
    mockEmitter.off = jest.fn();
    const emitterModule = jest.requireMock('@/helpers/emitter');
    emitterModule.default = mockEmitter;
    mockGetSetting.mockImplementation((key: string, defaultValue: string) => defaultValue);
    mockGetFlightData.mockResolvedValue(null);
    mockShowFlightNotification.mockResolvedValue(undefined);
    mockShowUrgentNotification.mockResolvedValue(undefined);
  });

  const createMockFlight = (overrides: Partial<Flight> = {}): Flight => ({
    flightId: 1,
    airline: 'BA',
    flightNumber: '123',
    departureAirport: 'JFK',
    departureAirportTimezone: 'America/New_York',
    departureCountry: 'US',
    arrivalAirport: 'LHR',
    arrivalAirportTimezone: 'Europe/London',
    arrivalCountry: 'GB',
    startDatetime: DateTime.now().plus({ hours: 2 }).toISO()!,
    endDatetime: DateTime.now().plus({ hours: 10 }).toISO()!,
    actualStartDatetime: undefined,
    actualEndDatetime: undefined,
    status: 'scheduled',
    recordType: 1,
    seatNumber: undefined,
    departureTerminal: undefined,
    departureGate: undefined,
    departureCheckInDesk: undefined,
    arrivalTerminal: undefined,
    baggageBelt: undefined,
    checkInTime: 24,
    checkInLink: 'https://example.com/checkin',
    pnr: 'ABC123',
    distance: 0,
    isArchived: false,
    info: {},
    extra: {},
    ...overrides,
  });

  test('updateFlightsState - flight before 3 hours notification', async () => {
    const startTime = DateTime.now().plus({ hours: 2.95 }).toISO();
    const endTime = DateTime.now().plus({ hours: 10 }).toISO();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
      }),
    ]);

    await fetchActualFlights(new Date());

    expect(mockShowFlightNotification).toHaveBeenCalled();
    expect(mockSetSetting).toHaveBeenCalledWith('flight-notifications-1', expect.stringContaining('beforeFlight3h'));
  });

  test('updateFlightsState - check-in time notification', async () => {
    const startTime = DateTime.now().plus({ hours: 23 }).toISO();
    const endTime = DateTime.now().plus({ hours: 31 }).toISO();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        checkInTime: 24,
        checkInLink: 'https://example.com/checkin',
      }),
    ]);

    await fetchActualFlights(new Date());

    expect(mockMakeCheckInLink).toHaveBeenCalled();
  });

  test('updateFlightsState - flight status changes to en_route', async () => {
    const startTime = DateTime.now().minus({ minutes: 5 }).toISO();
    const endTime = DateTime.now().plus({ hours: 8 }).toISO();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        status: 'scheduled',
      }),
    ]);

    await fetchActualFlights(new Date());

    expect(mockUpdateFlight).toHaveBeenCalled();
    const updatedFlight = mockUpdateFlight.mock.calls[0][0];
    expect(updatedFlight.status).toBe('en_route');
  });

  test('updateFlightsState - flight status changes to arrived', async () => {
    const startTime = DateTime.now().minus({ hours: 9 }).toISO();
    const endTime = DateTime.now().minus({ minutes: 5 }).toISO();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        status: 'en_route',
      }),
    ]);

    await fetchActualFlights(new Date());

    expect(mockUpdateFlight).toHaveBeenCalled();
    const updatedFlight = mockUpdateFlight.mock.calls[0][0];
    expect(updatedFlight.status).toBe('arrived');
  });

  test('updateFlightsState - initializes info object when missing', async () => {
    const startTime = DateTime.now().plus({ hours: 4 }).toISO();
    const endTime = DateTime.now().plus({ hours: 10 }).toISO();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        info: undefined as any,
      }),
    ]);

    const flights = await fetchActualFlights(new Date());

    expect(flights[0].info).toBeDefined();
    expect(typeof flights[0].info).toBe('object');
  });

  test('updateFlightsState - falls back to UTC when timezone missing', async () => {
    const { getCalendars } = jest.requireMock('expo-localization');
    (getCalendars as jest.Mock).mockReturnValueOnce([]);

    const baseDate = new Date('2023-03-10T00:00:00.000Z');
    const startTime = '2023-03-10T06:00:00.000+00:00';
    const endTime = '2023-03-10T14:00:00.000+00:00';

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime,
        endDatetime: endTime,
        checkInTime: 0,
        checkInLink: undefined,
      }),
    ]);

    const flights = await fetchActualFlights(baseDate);

    expect(flights[0].isDifferentTimezone).toBe(false);
  });

  test('updateFlightsState - flight archived after 60 minutes', async () => {
    const startTime = DateTime.now().minus({ hours: 10 }).toISO();
    const endTime = DateTime.now().minus({ hours: 2 }).toISO();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        flightId: 1,
        startDatetime: startTime!,
        endDatetime: endTime!,
        status: 'arrived',
      }),
    ]);

    const flights = await fetchActualFlights(new Date());

    expect(mockArchiveFlight).toHaveBeenCalledWith(1, 1);
    expect(mockDeleteSetting).toHaveBeenCalledWith('flight-notifications-1');
    expect(mockEmitter.emit).toHaveBeenCalledWith('updatePastFlights', {
      refreshAnimation: false,
      forceRefresh: false,
    });
    expect(flights).toHaveLength(0);
  });

  test('updateFlightsState - flight data update with all changes', async () => {
    const startTime = DateTime.now().plus({ hours: 1.5 }).toISO();
    const endTime = DateTime.now().plus({ hours: 9.5 }).toISO();

    mockGetFlightData.mockResolvedValue({
      status: 'delayed',
      actualStartDatetime: DateTime.now().plus({ hours: 2 }).toISO(),
      actualEndDatetime: DateTime.now().plus({ hours: 10 }).toISO(),
      departureTerminal: 'T2',
      departureGate: 'A5',
      departureCheckInDesk: '123-125',
      arrivalTerminal: 'T3',
      baggageBelt: 'B7',
      distance: 5500,
    } as any);

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        status: 'scheduled',
      }),
    ]);

    await fetchActualFlights(new Date(), true);

    expect(mockGetFlightData).toHaveBeenCalled();
    expect(mockUpdateFlight).toHaveBeenCalled();
    expect(mockShowFlightNotification).toHaveBeenCalled();
  });

  test('updateFlightsState - timeSpan 24h triggers status notification', async () => {
    const baseDate = new Date('2023-03-10T10:00:00.000Z');
    const startTime = new Date(baseDate.getTime() + 23 * 60 * 60 * 1000).toISOString();
    const endTime = new Date(baseDate.getTime() + 31 * 60 * 60 * 1000).toISOString();

    mockGetFlightData.mockResolvedValueOnce({
      status: 'delayed',
      distance: 1234,
    } as any);

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime,
        endDatetime: endTime,
        status: 'scheduled',
        checkInTime: 0,
      }),
    ]);

    await fetchActualFlights(baseDate);

    expect(mockGetFlightData).toHaveBeenCalled();
    expect(mockShowFlightNotification).toHaveBeenCalledWith(
      'flights.flight BA 123',
      'notifications.changed_status_{"status":"flights.statuses.delayed"}',
      { url: '/flights/actual?flightId=1' },
    );
  });

  test('updateFlightsState - timeSpan 90m without force refresh', async () => {
    const baseDate = new Date('2023-03-10T10:00:00.000Z');
    const startTime = new Date(baseDate.getTime() + 90 * 60 * 1000).toISOString();
    const endTime = new Date(baseDate.getTime() + 8 * 60 * 60 * 1000).toISOString();

    mockGetFlightData.mockResolvedValueOnce({
      departureGate: 'A7',
      distance: 321,
    } as any);

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime,
        endDatetime: endTime,
        status: 'scheduled',
        checkInTime: 0,
        checkInLink: undefined,
      }),
    ]);

    await fetchActualFlights(baseDate);

    expect(mockGetFlightData).toHaveBeenCalled();
    expect(mockShowFlightNotification).toHaveBeenCalledWith(
      'flights.flight BA 123',
      'notifications.changed_departure_gate_{"gate":"A7"}',
      { url: '/flights/actual?flightId=1' },
    );
  });

  test('updateFlightsState - timeSpan 3h exact hour without force refresh', async () => {
    const baseDate = new Date('2023-03-10T10:00:00.000Z');
    const startTime = new Date(baseDate.getTime() + 3 * 60 * 60 * 1000).toISOString();
    const endTime = new Date(baseDate.getTime() + 11 * 60 * 60 * 1000).toISOString();

    mockGetFlightData.mockResolvedValueOnce({
      departureTerminal: 'T9',
      distance: 777,
    } as any);

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime,
        endDatetime: endTime,
        status: 'scheduled',
        checkInTime: 0,
        checkInLink: undefined,
      }),
    ]);

    await fetchActualFlights(baseDate);

    expect(mockGetFlightData).toHaveBeenCalled();
    expect(mockShowFlightNotification).toHaveBeenCalledWith(
      'flights.flight BA 123',
      'notifications.changed_departure_terminal_{"terminal":"T9"}',
      { url: '/flights/actual?flightId=1' },
    );
  });

  test('updateFlightsState - force refresh fetches last window updates', async () => {
    const baseDate = new Date('2023-03-10T10:00:00.000Z');
    const startTime = new Date(baseDate.getTime() + 17 * 60 * 1000).toISOString();
    const endTime = new Date(baseDate.getTime() + 8 * 60 * 60 * 1000).toISOString();

    mockGetSetting.mockImplementation((key: string, defaultValue: string) => {
      if (key.startsWith('flight-notifications-')) {
        return '{"last":17}';
      }
      return defaultValue;
    });

    mockGetFlightData.mockResolvedValueOnce({
      departureGate: 'C12',
      distance: 987,
    } as any);

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime,
        endDatetime: endTime,
        status: 'scheduled',
        seatNumber: '12A',
        checkInTime: 0,
      }),
    ]);

    await fetchActualFlights(baseDate, true);

    expect(mockGetFlightData).toHaveBeenCalled();
    expect(mockShowUrgentNotification).toHaveBeenCalledWith(
      'flights.flight BA 123',
      'notifications.changed_departure_gate_{"gate":"C12"}',
      { url: '/flights/actual?flightId=1' },
    );
  });

  test('updateFlightsState - timeSpan last window without force refresh', async () => {
    const baseDate = new Date('2023-03-10T10:00:00.000Z');
    const startTime = new Date(baseDate.getTime() + 30 * 60 * 1000).toISOString();
    const endTime = new Date(baseDate.getTime() + 9 * 60 * 60 * 1000).toISOString();

    mockGetFlightData.mockResolvedValueOnce({
      departureGate: 'B3',
      distance: 654,
    } as any);

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime,
        endDatetime: endTime,
        status: 'scheduled',
        checkInTime: 0,
        checkInLink: undefined,
      }),
    ]);

    await fetchActualFlights(baseDate);

    expect(mockGetFlightData).toHaveBeenCalled();
    expect(mockShowUrgentNotification).toHaveBeenCalledWith(
      'flights.flight BA 123',
      'notifications.changed_departure_gate_{"gate":"B3"}',
      { url: '/flights/actual?flightId=1' },
    );
  });

  test('updateFlightsState - force refresh fetches 90m window update', async () => {
    const baseDate = new Date('2023-03-10T10:00:00.000Z');
    const minutesAhead = 83;
    const startTime = new Date(baseDate.getTime() + minutesAhead * 60 * 1000).toISOString();
    const endTime = new Date(baseDate.getTime() + 9 * 60 * 60 * 1000).toISOString();

    mockGetSetting.mockImplementation((key: string, defaultValue: string) => {
      if (key.startsWith('flight-notifications-')) {
        return '{"90m":83}';
      }
      return defaultValue;
    });

    mockGetFlightData.mockResolvedValueOnce({
      departureTerminal: 'T1',
      distance: 456,
    } as any);

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime,
        endDatetime: endTime,
        status: 'scheduled',
        checkInTime: 0,
        checkInLink: undefined,
      }),
    ]);

    await fetchActualFlights(baseDate, true);

    expect(mockGetFlightData).toHaveBeenCalled();
    expect(mockShowFlightNotification).toHaveBeenCalledWith(
      'flights.flight BA 123',
      'notifications.changed_departure_terminal_{"terminal":"T1"}',
      { url: '/flights/actual?flightId=1' },
    );
  });

  test('updateFlightsState - avoids duplicate before flight notifications', async () => {
    mockGetSetting.mockImplementation((key: string, defaultValue: string) => {
      if (key.startsWith('flight-notifications-')) {
        return '{"beforeFlight3h":true}';
      }
      return defaultValue;
    });

    const startTime = DateTime.now().plus({ hours: 2.95 }).toISO();
    const endTime = DateTime.now().plus({ hours: 10 }).toISO();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        checkInTime: 0,
      }),
    ]);

    await fetchActualFlights(new Date());

    expect(mockShowFlightNotification).not.toHaveBeenCalled();
  });

  test('updateFlightsState - skips repeated online check-in notification', async () => {
    mockGetSetting.mockImplementation((key: string, defaultValue: string) => {
      if (key.startsWith('flight-notifications-')) {
        return '{"onlineCheckInOpen":true}';
      }
      return defaultValue;
    });

    const baseDate = new Date('2023-03-10T10:00:00.000Z');
    const startTime = new Date(baseDate.getTime() + 5 * 60 * 60 * 1000).toISOString();
    const endTime = new Date(baseDate.getTime() + 13 * 60 * 60 * 1000).toISOString();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime,
        endDatetime: endTime,
      }),
    ]);

    await fetchActualFlights(baseDate);

    expect(mockMakeCheckInLink).toHaveBeenCalled();
    expect(mockShowFlightNotification).not.toHaveBeenCalledWith(
      'flights.flight BA 123',
      'notifications.online_check_in_open',
      expect.anything(),
    );
  });

  test('updateFlightsState - en_route status unchanged when refreshed status differs', async () => {
    const baseDate = new Date('2023-03-10T10:00:00.000Z');
    const startTime = new Date(baseDate.getTime() + 2 * 60 * 60 * 1000).toISOString();
    const endTime = new Date(baseDate.getTime() + 9 * 60 * 60 * 1000).toISOString();

    mockGetFlightData.mockResolvedValueOnce({
      status: 'boarding',
      distance: 200,
    } as any);

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime,
        endDatetime: endTime,
        status: 'en_route',
        seatNumber: '12A',
        checkInTime: 0,
      }),
    ]);

    const flights = await fetchActualFlights(baseDate);

    expect(mockGetFlightData).toHaveBeenCalled();
    expect(mockUpdateFlight).not.toHaveBeenCalled();
    expect(mockShowFlightNotification).not.toHaveBeenCalled();
    expect(mockShowUrgentNotification).not.toHaveBeenCalled();
    expect(flights[0].status).toBe('en_route');
  });

  test('updateFlightsState - force refresh fetches baggage belt info', async () => {
    const baseDate = new Date('2023-03-10T10:00:00.000Z');
    const endTime = new Date(baseDate.getTime() - 13 * 60 * 1000).toISOString();
    const startTime = new Date(baseDate.getTime() - 2 * 60 * 60 * 1000).toISOString();

    mockGetFlightData.mockResolvedValueOnce({
      baggageBelt: 'B9',
    } as any);

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime,
        endDatetime: endTime,
        recordType: 0,
        status: 'en_route',
        baggageBelt: undefined,
        checkInTime: 0,
        checkInLink: undefined,
      }),
    ]);

    await fetchActualFlights(baseDate, true);

    expect(mockGetFlightData).toHaveBeenCalled();
    expect(mockShowFlightNotification).toHaveBeenCalledWith(
      'flights.flight BA 123',
      'notifications.changed_baggage_belt_{"belt":"B9"}',
      { url: '/flights/actual?flightId=1' },
    );
  });

  test('updateFlightsState - flight states: checkin_start', async () => {
    const startTime = DateTime.now().plus({ hours: 2.5 }).toISO();
    const endTime = DateTime.now().plus({ hours: 10.5 }).toISO();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        status: 'scheduled',
        seatNumber: undefined,
      }),
    ]);

    const flights = await fetchActualFlights(new Date());

    expect(flights[0].info.state).toBe('checkin_start');
    expect(flights[0].info.stateTime).toBeGreaterThan(0);
  });

  test('updateFlightsState - flight states: checkin_end', async () => {
    const startTime = DateTime.now().plus({ minutes: 50 }).toISO();
    const endTime = DateTime.now().plus({ hours: 8 }).toISO();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        status: 'checkin',
        seatNumber: undefined,
      }),
    ]);

    const flights = await fetchActualFlights(new Date());

    expect(flights[0].info.state).toBe('checkin_end');
  });

  test('updateFlightsState - flight states: boarding_start', async () => {
    const startTime = DateTime.now().plus({ minutes: 50 }).toISO();
    const endTime = DateTime.now().plus({ hours: 8 }).toISO();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        status: 'scheduled',
        seatNumber: '12A',
      }),
    ]);

    const flights = await fetchActualFlights(new Date());

    expect(flights[0].info.state).toBe('boarding_start');
  });

  test('updateFlightsState - flight states: boarding_end', async () => {
    const startTime = DateTime.now().plus({ minutes: 35 }).toISO();
    const endTime = DateTime.now().plus({ hours: 8 }).toISO();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        status: 'boarding',
      }),
    ]);

    const flights = await fetchActualFlights(new Date());

    expect(flights[0].info.state).toBe('boarding_end');
  });

  test('updateFlightsState - flight states: lastcall', async () => {
    const startTime = DateTime.now().plus({ minutes: 24 }).toISO();
    const endTime = DateTime.now().plus({ hours: 8 }).toISO();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        status: 'boarding',
      }),
    ]);

    const flights = await fetchActualFlights(new Date());

    expect(flights[0].info.state).toBe('lastcall');
    expect(flights[0].info.stateTime).toBeNull();
  });

  test('updateFlightsState - flight states: gateclosed', async () => {
    const startTime = DateTime.now().plus({ minutes: 30 }).toISO();
    const endTime = DateTime.now().plus({ hours: 8 }).toISO();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        status: 'gateclosed',
      }),
    ]);

    const flights = await fetchActualFlights(new Date());

    expect(flights[0].info.state).toBe('gateclosed');
  });

  test('updateFlightsState - flight states: flight_start', async () => {
    const startTime = DateTime.now().plus({ minutes: 15 }).toISO();
    const endTime = DateTime.now().plus({ hours: 8 }).toISO();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        status: 'scheduled',
      }),
    ]);

    const flights = await fetchActualFlights(new Date());

    expect(flights[0].info.state).toBe('flight_start');
  });

  test('updateFlightsState - flight states: flight_end', async () => {
    const startTime = DateTime.now().minus({ hours: 8 }).toISO();
    const endTime = DateTime.now().plus({ minutes: 30 }).toISO();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        status: 'en_route',
      }),
    ]);

    const flights = await fetchActualFlights(new Date());

    expect(flights[0].info.state).toBe('flight_end');
  });

  test('updateFlightsState - baggage belt notification after landing', async () => {
    const startTime = DateTime.now().minus({ hours: 8 }).toISO();
    const endTime = DateTime.now().minus({ minutes: 15 }).toISO();

    mockGetFlightData.mockResolvedValue({
      baggageBelt: 'B5',
    } as any);

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        status: 'en_route',
        baggageBelt: undefined,
      }),
    ]);

    await fetchActualFlights(new Date());

    expect(mockGetFlightData).toHaveBeenCalled();
    expect(mockShowFlightNotification).toHaveBeenCalled();
    expect(mockUpdateFlight).toHaveBeenCalled();
  });

  test('updateFlightsState - status change from en_route to arrived', async () => {
    const startTime = DateTime.now().minus({ hours: 8 }).toISO();
    const endTime = DateTime.now().minus({ minutes: 15 }).toISO();

    mockGetFlightData.mockResolvedValue({
      status: 'arrived',
    } as any);

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        status: 'en_route',
      }),
    ]);

    await fetchActualFlights(new Date(), true);

    expect(mockUpdateFlight).toHaveBeenCalled();
    const updatedFlight = mockUpdateFlight.mock.calls[0][0];
    expect(updatedFlight.status).toBe('arrived');
  });

  test('updateFlightsState - urgent notification for changes < 60 minutes', async () => {
    const startTime = DateTime.now().plus({ minutes: 45 }).toISO();
    const endTime = DateTime.now().plus({ hours: 8 }).toISO();

    mockGetFlightData.mockResolvedValue({
      departureGate: 'C10',
    } as any);

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        departureGate: 'A5',
      }),
    ]);

    await fetchActualFlights(new Date(), true);

    expect(mockShowUrgentNotification).toHaveBeenCalled();
  });

  test('updateFlightsState - different timezone detection', async () => {
    const { getCalendars } = jest.requireMock('expo-localization');

    (getCalendars as jest.Mock).mockReturnValue([{ timeZone: 'America/New_York' }]);

    const startTime = DateTime.now().setZone('Europe/London').plus({ hours: 2 }).toISO();
    const endTime = DateTime.now().setZone('Europe/London').plus({ hours: 10 }).toISO();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
      }),
    ]);

    const flights = await fetchActualFlights(new Date());

    expect(flights[0].isDifferentTimezone).toBe(true);
  });

  test('updateFlightsState - recordType !== 1 skip flight data fetch', async () => {
    const startTime = DateTime.now().plus({ hours: 1.5 }).toISO();
    const endTime = DateTime.now().plus({ hours: 9.5 }).toISO();

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: startTime!,
        endDatetime: endTime!,
        recordType: 0,
      }),
    ]);

    await fetchActualFlights(new Date(), true);

    expect(mockGetFlightData).not.toHaveBeenCalled();
  });

  test('flightsCheckTask - with flights', async () => {
    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        startDatetime: DateTime.now().plus({ hours: 2 }).toISO()!,
        endDatetime: DateTime.now().plus({ hours: 10 }).toISO()!,
      }),
    ]);

    await flightsCheckTask();

    expect(mockGetActualFlights).toHaveBeenCalledWith(1);
    expect(mockStopBackgroundTask).not.toHaveBeenCalled();
  });

  test('flightsCheckTask - without flights', async () => {
    mockGetActualFlights.mockResolvedValue([]);

    await flightsCheckTask();

    expect(mockGetActualFlights).toHaveBeenCalledWith(1);
    expect(mockStopBackgroundTask).toHaveBeenCalled();
  });

  test('setFlightArchiveState - archive flight', async () => {
    await setFlightArchiveState(1, 1);

    expect(mockArchiveFlight).toHaveBeenCalledWith(1, 1);
    expect(mockDeleteSetting).toHaveBeenCalledWith('flight-notifications-1');
  });

  test('setFlightArchiveState - unarchive flight', async () => {
    await setFlightArchiveState(1, 0);

    expect(mockArchiveFlight).toHaveBeenCalledWith(1, 0);
    expect(mockDeleteSetting).not.toHaveBeenCalled();
  });

  test('setFlightArchiveState - undefined flightId', async () => {
    await setFlightArchiveState(undefined, 1);

    expect(mockArchiveFlight).not.toHaveBeenCalled();
  });
});
