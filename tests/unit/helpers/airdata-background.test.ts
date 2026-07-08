import { DateTime } from 'luxon';

import { fetchActualFlights, flightsCheckTask } from '@/helpers/airdata';
import type { Flight } from '@/types';

const mockGetBackgroundFlightsSnapshot = jest.fn();
const mockGetActualFlights = jest.fn();
const mockUpdateFlight = jest.fn();
const mockArchiveFlight = jest.fn();
const mockGetFlightData = jest.fn();
const mockGetSetting = jest.fn((_: string, defaultValue: string) => defaultValue);
const mockSetSetting = jest.fn();
const mockDeleteSetting = jest.fn();
const mockStopBackgroundTask = jest.fn();
const mockShowFlightNotification = jest.fn();
const mockShowUrgentNotification = jest.fn();

jest.mock('react-native', () => ({
  NativeModules: {
    AirPlainBgModule: {
      getBackgroundFlightsSnapshot: () => mockGetBackgroundFlightsSnapshot(),
    },
  },
  Platform: {
    OS: 'ios',
    select: (values: Record<string, unknown>) => values.ios ?? values.default,
  },
}));

jest.mock('@/helpers/sqlite', () => ({
  __esModule: true,
  archiveFlight: (flightId: number, state: number) => mockArchiveFlight(flightId, state),
  getActualFlights: (limit: number) => mockGetActualFlights(limit),
  getAirlines: async () => [],
  updateFlight: (flight: any) => mockUpdateFlight(flight),
}));

jest.mock('@/constants/settings', () => ({
  __esModule: true,
  deleteSetting: (key: string) => mockDeleteSetting(key),
  getSetting: (key: string, defaultValue: string = '') => mockGetSetting(key, defaultValue),
  setSetting: (key: string, value: string) => mockSetSetting(key, value),
  settings: {
    FLIGHTS_LIMIT: 10,
  },
}));

jest.mock('@/helpers/common', () => ({
  __esModule: true,
  makeCheckInLink: jest.fn((link: string) => link),
  stopBackgroundTask: () => mockStopBackgroundTask(),
}));

jest.mock('@/helpers/flights', () => ({
  __esModule: true,
  getFlightData: (airline: string, flightNumber: string, date: string) =>
    mockGetFlightData(airline, flightNumber, date),
}));

jest.mock('@/helpers/notifications', () => ({
  __esModule: true,
  hasScheduledFlightReminder: () => false,
  showFlightNotification: (title: string, body: string, data?: any) => mockShowFlightNotification(title, body, data),
  showUrgentNotification: (title: string, body: string, data?: any) => mockShowUrgentNotification(title, body, data),
}));

jest.mock('@/helpers/emitter', () => ({
  __esModule: true,
  default: {
    emit: jest.fn(),
    off: jest.fn(),
    on: jest.fn(),
  },
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

describe('airdata background sync', () => {
  const createMockFlight = (overrides: Partial<Flight> = {}): Flight => ({
    airline: 'BA',
    arrivalAirport: 'LHR',
    arrivalAirportTimezone: 'Europe/London',
    arrivalCountry: 'GB',
    baggageBelt: undefined,
    checkInLink: undefined,
    checkInTime: 0,
    departureAirport: 'JFK',
    departureAirportTimezone: 'America/New_York',
    departureCheckInDesk: undefined,
    departureCountry: 'US',
    departureGate: undefined,
    departureTerminal: undefined,
    distance: 5540,
    endDatetime: DateTime.now().plus({ hours: 10 }).toISO()!,
    extra: {},
    flightId: 1,
    flightNumber: '123',
    info: {},
    isArchived: false,
    recordType: 1,
    startDatetime: DateTime.now().plus({ hours: 2 }).toISO()!,
    status: 'scheduled',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSetting.mockImplementation((_: string, defaultValue: string) => defaultValue);
    mockGetBackgroundFlightsSnapshot.mockResolvedValue('[]');
    mockGetFlightData.mockResolvedValue(null);
    mockShowFlightNotification.mockResolvedValue(undefined);
    mockShowUrgentNotification.mockResolvedValue(undefined);
  });

  test('fetchActualFlights merges native background snapshot into sqlite state', async () => {
    const baseDate = new Date('2026-05-19T10:00:00.000Z');
    mockGetBackgroundFlightsSnapshot.mockResolvedValue(
      JSON.stringify([
        {
          actualEndDatetime: undefined,
          actualStartDatetime: undefined,
          arrivalTerminal: 'T5',
          baggageBelt: undefined,
          departureCheckInDesk: '18',
          departureGate: 'D4',
          departureTerminal: 'T2',
          endDatetime: '2026-05-19T20:00:00.000Z',
          flightId: 1,
          status: 'delayed',
        },
      ]),
    );
    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        endDatetime: '2026-05-19T20:00:00.000Z',
        recordType: 0,
        startDatetime: '2026-05-19T16:00:00.000Z',
      }),
    ]);

    const flights = await fetchActualFlights(baseDate);

    expect(mockUpdateFlight).toHaveBeenCalledWith(
      expect.objectContaining({
        arrivalTerminal: 'T5',
        departureCheckInDesk: '18',
        departureGate: 'D4',
        departureTerminal: 'T2',
        status: 'delayed',
      }),
    );
    expect(flights[0]).toEqual(
      expect.objectContaining({
        arrivalTerminal: 'T5',
        departureCheckInDesk: '18',
        departureGate: 'D4',
        departureTerminal: 'T2',
        status: 'delayed',
      }),
    );
  });

  test('flightsCheckTask suppresses all background notifications in headless mode', async () => {
    const baseDate = new Date('2026-05-19T10:00:00.000Z');
    jest.useFakeTimers().setSystemTime(baseDate);

    mockGetActualFlights.mockResolvedValue([
      createMockFlight({
        checkInTime: 0,
        endDatetime: '2026-05-19T20:00:00.000Z',
        startDatetime: '2026-05-19T11:30:00.000Z',
      }),
    ]);
    mockGetFlightData.mockResolvedValue({
      actualEndDatetime: '2026-05-19T20:30:00.000Z',
      actualStartDatetime: '2026-05-19T11:45:00.000Z',
      arrivalTerminal: 'T9',
      baggageBelt: 'B7',
      departureCheckInDesk: '10',
      departureGate: 'C12',
      departureTerminal: 'T4',
      distance: 6000,
      status: 'delayed',
    });

    await flightsCheckTask({ executionMode: 'headless' });

    expect(mockGetFlightData).toHaveBeenCalled();
    expect(mockUpdateFlight).toHaveBeenCalled();
    expect(mockShowFlightNotification).not.toHaveBeenCalled();
    expect(mockShowUrgentNotification).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});
