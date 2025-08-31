import type { Flight } from '@/types';
import * as db from '@/helpers/sqlite';


const mockSQLite = {
  execAsync: jest.fn(),
  getAllAsync: jest.fn(),
  runAsync: jest.fn(),
  closeAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  withTransactionAsync: jest.fn((callback: Function) => callback()),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: () => mockSQLite,
}));

jest.mock('expo-asset', () => ({
  Asset: {
    loadAsync: jest.fn().mockResolvedValue([{ localUri: 'mocked/local/uri.sql' }]),
  },
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('mocked SQL or CSV content'),
}));

jest.mock('@/helpers/common', () => ({
  camelCase: jest.fn((obj) => obj),
  snakeCase: jest.fn((obj) => obj),
}));

jest.mock('@/constants/settings', () => ({
  DBNAME: 'test.db',
  SQLDIR: 'mocked/sql/dir',
}));

jest.mock('csv-parse/dist/esm/sync', () => ({
  parse: jest.fn().mockReturnValue([
    { column1: 'value1', column2: 'value2' },
    { column1: 'value3', column2: 'value4' },
  ]),
}));

describe('SQLite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('openDatabase', () => {
    it('should open the database and execute PRAGMA statements', async () => {
      const result = await db.openDatabase('test.db');
      expect(result).toBe(true);
      expect(mockSQLite.execAsync).toHaveBeenCalledWith('PRAGMA journal_mode = WAL');
      expect(mockSQLite.execAsync).toHaveBeenCalledWith('PRAGMA foreign_keys = ON');
    });

    it('should return false if the database cannot be opened', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSQLite.execAsync.mockRejectedValueOnce(new Error('Failed to execute'));
      const result = await db.openDatabase('test.db');
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('closeDatabase', () => {
    it('should close the database', async () => {
      await db.closeDatabase();
      expect(mockSQLite.closeAsync).toHaveBeenCalled();
    });
  });

  describe('fillDataFromArray', () => {
    it('should insert or replace data into the specified table', async () => {
      const mockRecords = [
        { column1: 'value1', column2: 'value2' },
        { column1: 'value3', column2: 'value4' },
      ];
      await db.fillDataFromArray('test_table', mockRecords);

      const expectedSQL = `INSERT OR REPLACE INTO test_table (column1, column2) VALUES (?, ?), (?, ?)`;
      const expectedParams = ['value1', 'value2', 'value3', 'value4'];

      expect(mockSQLite.runAsync).toHaveBeenCalledWith(expectedSQL, expectedParams);
    });

    it('should handle empty records gracefully', async () => {
      await db.fillDataFromArray('test_table', []);
      expect(mockSQLite.runAsync).not.toHaveBeenCalled();
    });
  });

  describe('updateFlight', () => {
    it('should update a flight and its passengers', async () => {
      const mockFlight: Flight = {
        flightId: 1,
        airline: 'AA',
        flightNumber: '100',
        startDatetime: '2024-08-29 08:45:00+01:00',
        endDatetime: '2024-08-29 12:10:00+02:00',
        departureAirport: 'JFK',
        arrivalAirport: 'LAX',
        distance: 2475,
        isArchived: false,
        arrivalAirportTimezone: 'America/Los_Angeles',
        arrivalCountry: 'USA',
        departureAirportTimezone: 'America/New_York',
        departureCountry: 'USA',
        extra: {},
        info: {},
        status: 'on_time',
        recordType: 0,
        notes: '',
      };

      await db.updateFlight(mockFlight);

      expect(mockSQLite.withTransactionAsync).toHaveBeenCalled();
      expect(mockSQLite.runAsync).toHaveBeenCalledWith('DELETE FROM passengers WHERE flight_id = ?;', 1);
      expect(mockSQLite.runAsync).toHaveBeenCalled();
    });

    it('should return false if flightId is not provided', async () => {
      const mockFlight = { airline: 'AA', flightNumber: '100' };
      const result = await db.updateFlight(mockFlight as any);
      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should fetch stats data from the database', async () => {
      const mockStats = [
        { year: 2023, flights: 10, distance: 5000 },
        { year: 2022, flights: 8, distance: 4000 },
      ];
      mockSQLite.getAllAsync.mockResolvedValueOnce(mockStats);

      const result = await db.getStats();

      expect(mockSQLite.getAllAsync).toHaveBeenCalledWith(`
    SELECT
      *
    FROM vw_stats;
  `);
      expect(result).toEqual({
        2023: { flights: 10, distance: 5000 },
        2022: { flights: 8, distance: 4000 },
      });
    });

    it('should throw an error if the database is not opened', async () => {
      jest.spyOn(db, 'getStats').mockImplementationOnce(async () => {
        throw new Error('Can\'t get stats: database not opened');
      });

      await expect(db.getStats()).rejects.toThrow('Can\'t get stats: database not opened');
    });
  });

  describe('isFlightExists', () => {
    it('should return the flight ID if the flight exists', async () => {
      mockSQLite.getFirstAsync.mockResolvedValueOnce({ flight_id: 1 });

      const result = await db.isFlightExists('AA', '100', '2023-01-01');

      expect(mockSQLite.getFirstAsync).toHaveBeenCalledWith(`
    SELECT
      flight_id
    FROM vw_flights
    WHERE airline = ? AND flight_number = ? AND DATE(start_datetime) = ?
  `,
        'AA',
        '100',
        '2023-01-01'
      );
      expect(result).toBe(1);
    });

    it('should return undefined if the flight does not exist', async () => {
      mockSQLite.getFirstAsync.mockResolvedValueOnce(undefined);

      const result = await db.isFlightExists('AA', '100', '2023-01-01');

      expect(result).toBeUndefined();
    });
  });

  describe('exportFlights', () => {
    it('should fetch all flights from the database', async () => {
      const mockFlights = [
        { flight_id: 1, airline: 'AA', flight_number: '100' },
        { flight_id: 2, airline: 'BA', flight_number: '200' },
      ];
      mockSQLite.getAllAsync.mockResolvedValueOnce(mockFlights);

      const result = await db.exportFlights();

      expect(mockSQLite.getAllAsync).toHaveBeenCalledWith(`
    SELECT
      *
    FROM vw_flights
    ORDER BY start_datetime
  `);
      expect(result).toEqual(mockFlights);
    });
  });

  describe('getFlights', () => {
    it('should fetch flights with the given conditions', async () => {
      const mockFlights = [
        { flight_id: 1, airline: 'AA', flight_number: '100' },
      ];
      mockSQLite.getAllAsync.mockResolvedValueOnce(mockFlights);

      const conditions = [{ field: 'airline', operator: '=', value: 'AA' }];
      const result = await db.getFlights(conditions, 10, 0, 'ASC');

      expect(mockSQLite.getAllAsync).toHaveBeenCalled();
      expect(result).toEqual(mockFlights);
    });

    it('should throw an error if the database is not opened', async () => {
      jest.spyOn(db, 'getFlights').mockImplementationOnce(async () => {
        throw new Error('Can\'t select flights: database not opened');
      });

      await expect(db.getFlights([], 10)).rejects.toThrow('Can\'t select flights: database not opened');
    });
  });

  describe('archiveFlight', () => {
    it('should update the is_archived field for a flight', async () => {
      await db.archiveFlight(1, 1);
      expect(mockSQLite.runAsync).toHaveBeenCalledWith(
      `
    UPDATE flights
    SET
      is_archived = ?
    WHERE flight_id = ?;`,
      1,
      1
      );
    });
  });

  describe('deleteFlight', () => {
    it('should delete a flight and its passengers', async () => {
      await db.deleteFlight(1);
      expect(mockSQLite.withTransactionAsync).toHaveBeenCalled();
      expect(mockSQLite.runAsync).toHaveBeenCalledWith('DELETE FROM passengers WHERE flight_id = ?;', 1);
      expect(mockSQLite.runAsync).toHaveBeenCalledWith('DELETE FROM flights WHERE flight_id = ?', 1);
    });
  });
});
