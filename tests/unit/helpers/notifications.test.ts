import {
  cancelScheduledFlightReminder,
  cancelScheduledFlightReminders,
  hasScheduledFlightReminder,
  syncScheduledFlightReminders,
} from '@/helpers/notifications';
import type { Flight } from '@/types';

const mockNotificationStorage = new Map<string, string>();

const mockScheduleNotificationAsync = jest.fn();
const mockCancelScheduledNotificationAsync = jest.fn();
const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();

let notificationReceivedListener: ((notification: any) => void) | undefined;
let notificationResponseReceivedListener: ((response: any) => void) | undefined;

jest.mock('expo-notifications', () => ({
  AndroidImportance: {
    DEFAULT: 'default',
    MAX: 'max',
  },
  AndroidNotificationVisibility: {
    PUBLIC: 'public',
  },
  SchedulableTriggerInputTypes: {
    DATE: 'date',
  },
  addNotificationReceivedListener: (listener: (notification: any) => void) => {
    notificationReceivedListener = listener;
    return { remove: jest.fn() };
  },
  addNotificationResponseReceivedListener: (listener: (response: any) => void) => {
    notificationResponseReceivedListener = listener;
    return { remove: jest.fn() };
  },
  cancelScheduledNotificationAsync: (id: string) => mockCancelScheduledNotificationAsync(id),
  getPermissionsAsync: () => mockGetPermissionsAsync(),
  requestPermissionsAsync: () => mockRequestPermissionsAsync(),
  scheduleNotificationAsync: (payload: any) => mockScheduleNotificationAsync(payload),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

jest.mock('@/constants/settings', () => ({
  __esModule: true,
  deleteSetting: (key: string) => mockNotificationStorage.delete(key),
  getSetting: (key: string, defaultValue: string = '') => mockNotificationStorage.get(key) ?? defaultValue,
  setSetting: (key: string, value: string) => mockNotificationStorage.set(key, value),
}));

jest.mock('@/helpers/localization', () => ({
  __esModule: true,
  default: jest.fn((key: string) => key),
}));

describe('notifications helper', () => {
  const createFlight = (overrides: Partial<Flight> = {}): Flight => ({
    airline: 'BA',
    arrivalAirport: 'LHR',
    arrivalAirportTimezone: 'Europe/London',
    arrivalCountry: 'GB',
    departureAirport: 'JFK',
    departureAirportTimezone: 'America/New_York',
    departureCountry: 'US',
    distance: 5540,
    endDatetime: '2099-04-10T20:00:00+00:00',
    extra: {},
    flightId: 7,
    flightNumber: '123',
    info: {},
    isArchived: false,
    recordType: 1,
    startDatetime: '2099-04-10T12:00:00+00:00',
    status: 'scheduled',
    ...overrides,
  });

  beforeEach(() => {
    mockNotificationStorage.clear();
    mockScheduleNotificationAsync.mockReset();
    mockCancelScheduledNotificationAsync.mockReset();
    mockGetPermissionsAsync.mockReset();
    mockRequestPermissionsAsync.mockReset();
    mockGetPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
    mockRequestPermissionsAsync.mockResolvedValue({ granted: true });
    mockScheduleNotificationAsync
      .mockResolvedValueOnce('before-flight-id')
      .mockResolvedValueOnce('online-checkin-id')
      .mockResolvedValue('notification-id');
  });

  test('syncScheduledFlightReminders schedules both predictable reminders and stores ids', async () => {
    await syncScheduledFlightReminders(
      createFlight({
        checkInTime: 24,
      }),
    );

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(mockScheduleNotificationAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        content: expect.objectContaining({
          body: 'notifications.before_flight_3h',
          data: {
            flightId: 7,
            reminderKey: 'beforeFlight3h',
            type: 'scheduledFlightReminder',
            url: '/flights/actual?flightId=7',
          },
          title: 'flights.flight BA 123',
        }),
      }),
    );
    expect(mockScheduleNotificationAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        content: expect.objectContaining({
          body: 'notifications.online_check_in_open',
          data: {
            flightId: 7,
            reminderKey: 'onlineCheckInOpen',
            type: 'scheduledFlightReminder',
            url: '/flights/actual?flightId=7',
          },
          title: 'flights.flight BA 123',
        }),
      }),
    );
    expect(hasScheduledFlightReminder(7, 'beforeFlight3h')).toBe(true);
    expect(hasScheduledFlightReminder(7, 'onlineCheckInOpen')).toBe(true);
  });

  test('syncScheduledFlightReminders cancels previous reminders and skips archived flights', async () => {
    mockNotificationStorage.set(
      'flight-scheduled-notifications-7',
      JSON.stringify({
        beforeFlight3h: { notificationId: 'old-before', scheduledFor: '2099-04-10T09:00:00.000Z' },
        onlineCheckInOpen: { notificationId: 'old-checkin', scheduledFor: '2099-04-09T12:00:00.000Z' },
      }),
    );

    await syncScheduledFlightReminders(
      createFlight({
        checkInTime: 24,
        isArchived: true,
      }),
    );

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('old-before');
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('old-checkin');
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    expect(hasScheduledFlightReminder(7, 'beforeFlight3h')).toBe(false);
    expect(hasScheduledFlightReminder(7, 'onlineCheckInOpen')).toBe(false);
  });

  test('cancelScheduledFlightReminders clears stored ids', async () => {
    mockNotificationStorage.set(
      'flight-scheduled-notifications-7',
      JSON.stringify({
        beforeFlight3h: { notificationId: 'before-id', scheduledFor: '2099-04-10T09:00:00.000Z' },
      }),
    );

    await cancelScheduledFlightReminders(7);

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('before-id');
    expect(hasScheduledFlightReminder(7, 'beforeFlight3h')).toBe(false);
  });

  test('cancelScheduledFlightReminder clears only the selected reminder', async () => {
    mockNotificationStorage.set(
      'flight-scheduled-notifications-7',
      JSON.stringify({
        beforeFlight3h: { notificationId: 'before-id', scheduledFor: '2099-04-10T09:00:00.000Z' },
        onlineCheckInOpen: { notificationId: 'checkin-id', scheduledFor: '2099-04-09T12:00:00.000Z' },
      }),
    );

    await cancelScheduledFlightReminder(7, 'onlineCheckInOpen');

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('checkin-id');
    expect(hasScheduledFlightReminder(7, 'onlineCheckInOpen')).toBe(false);
    expect(hasScheduledFlightReminder(7, 'beforeFlight3h')).toBe(true);
  });

  test('syncScheduledFlightReminders marks expired reminders as delivered before rebuilding schedule', async () => {
    mockNotificationStorage.set(
      'flight-scheduled-notifications-7',
      JSON.stringify({
        beforeFlight3h: { notificationId: 'before-id', scheduledFor: '2000-04-10T09:00:00.000Z' },
      }),
    );

    await syncScheduledFlightReminders(
      createFlight({
        checkInTime: 0,
        startDatetime: '2000-04-10T12:00:00.000Z',
      }),
    );

    expect(JSON.parse(mockNotificationStorage.get('flight-notifications-7') ?? '{}')).toEqual(
      expect.objectContaining({
        beforeFlight3h: true,
      }),
    );
    expect(hasScheduledFlightReminder(7, 'beforeFlight3h')).toBe(false);
  });

  test('scheduled reminder delivery sets notification flag and clears only delivered reminder', async () => {
    await syncScheduledFlightReminders(
      createFlight({
        checkInTime: 24,
      }),
    );

    notificationReceivedListener?.({
      request: {
        content: {
          data: {
            flightId: 7,
            reminderKey: 'onlineCheckInOpen',
            type: 'scheduledFlightReminder',
            url: '/flights/actual?flightId=7',
          },
        },
      },
    });

    expect(JSON.parse(mockNotificationStorage.get('flight-notifications-7') ?? '{}')).toEqual(
      expect.objectContaining({
        onlineCheckInOpen: true,
      }),
    );
    expect(hasScheduledFlightReminder(7, 'onlineCheckInOpen')).toBe(false);
    expect(hasScheduledFlightReminder(7, 'beforeFlight3h')).toBe(true);
  });

  test('notification response also marks scheduled reminder as delivered', async () => {
    await syncScheduledFlightReminders(
      createFlight({
        checkInTime: 24,
      }),
    );

    notificationResponseReceivedListener?.({
      notification: {
        request: {
          content: {
            data: {
              flightId: 7,
              reminderKey: 'beforeFlight3h',
              type: 'scheduledFlightReminder',
              url: '/flights/actual?flightId=7',
            },
          },
        },
      },
    });

    expect(JSON.parse(mockNotificationStorage.get('flight-notifications-7') ?? '{}')).toEqual(
      expect.objectContaining({
        beforeFlight3h: true,
      }),
    );
    expect(hasScheduledFlightReminder(7, 'beforeFlight3h')).toBe(false);
  });
});
