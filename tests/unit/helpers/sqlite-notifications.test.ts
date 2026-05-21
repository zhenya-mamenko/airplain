import { archiveFlight, deleteFlight, insertFlight, setDatabaseRepository, updateFlight } from '@/helpers/sqlite';
import type { Flight } from '@/types';

const mockSyncScheduledFlightReminders = jest.fn();
const mockCancelScheduledFlightReminders = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
}));

jest.mock('@/helpers/notifications', () => ({
  __esModule: true,
  cancelScheduledFlightReminders: (flightId: number | undefined) => mockCancelScheduledFlightReminders(flightId),
  syncScheduledFlightReminders: (flight: any) => mockSyncScheduledFlightReminders(flight),
}));

describe('sqlite notification side effects', () => {
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

  const createRepository = () => ({
    archiveFlight: jest.fn(),
    close: jest.fn(),
    deleteFlight: jest.fn(),
    exportFlights: jest.fn(),
    fillDataFromArray: jest.fn(),
    getAchievements: jest.fn(),
    getAirlines: jest.fn(),
    getFlight: jest.fn(),
    getFlights: jest.fn(),
    getRawDatabase: jest.fn(),
    getStats: jest.fn(),
    insertFlight: jest.fn(),
    insertPassengerFromBCBP: jest.fn(),
    isFlightExists: jest.fn(),
    updateFlight: jest.fn(),
    updateFromRecord: jest.fn(),
  });

  beforeEach(() => {
    mockSyncScheduledFlightReminders.mockReset();
    mockCancelScheduledFlightReminders.mockReset();
  });

  afterEach(() => {
    setDatabaseRepository(undefined);
  });

  test('insertFlight syncs scheduled reminders after repository insert', async () => {
    const repository = createRepository();
    repository.insertFlight.mockResolvedValue(true);
    repository.isFlightExists.mockResolvedValue(11);
    setDatabaseRepository(repository as any);

    const flight = createFlight({ flightId: undefined });
    await insertFlight(flight);

    expect(repository.insertFlight).toHaveBeenCalledWith(flight);
    expect(mockSyncScheduledFlightReminders).toHaveBeenCalledWith(expect.objectContaining({ flightId: 11 }));
  });

  test('updateFlight syncs scheduled reminders after repository update', async () => {
    const repository = createRepository();
    repository.updateFlight.mockResolvedValue(true);
    setDatabaseRepository(repository as any);

    const flight = createFlight();
    await updateFlight(flight);

    expect(repository.updateFlight).toHaveBeenCalledWith(flight);
    expect(mockSyncScheduledFlightReminders).toHaveBeenCalledWith(flight);
  });

  test('archiveFlight cancels reminders when archiving and re-syncs when restoring', async () => {
    const repository = createRepository();
    repository.archiveFlight.mockResolvedValue(undefined);
    repository.getFlight.mockResolvedValue(createFlight({ departureGate: 'A7' }));
    setDatabaseRepository(repository as any);

    await archiveFlight(7, 1);
    await archiveFlight(7, 0);

    expect(mockCancelScheduledFlightReminders).toHaveBeenCalledWith(7);
    expect(mockSyncScheduledFlightReminders).toHaveBeenCalledWith(expect.objectContaining({ flightId: 7 }));
  });

  test('deleteFlight cancels reminders after repository delete', async () => {
    const repository = createRepository();
    repository.deleteFlight.mockResolvedValue(true);
    setDatabaseRepository(repository as any);

    await deleteFlight(7);

    expect(repository.deleteFlight).toHaveBeenCalledWith(7);
    expect(mockCancelScheduledFlightReminders).toHaveBeenCalledWith(7);
  });
});
