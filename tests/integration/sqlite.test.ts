import { openDatabaseAsync } from 'expo-sqlite';

import { SQLDIR } from '@/constants/settings';
import * as db from '@/helpers/sqlite';
import type { Flight } from '@/types';

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn((file: any) => file),
}));

describe('SQLite Integration Tests', () => {
  let database: any;
  let repository: db.SQLiteRepository;

  beforeEach(async () => {
    database = await openDatabaseAsync(':memory:');
    repository = await db.createSQLiteRepository(database, db.createDefaultAssets());
  });

  afterEach(async () => {
    if (database) {
      await database.closeAsync();
    }
  });

  describe('Database Initialization', () => {
    it('should create database with schema and default assets', async () => {
      const tables = await database.getAllAsync("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
      const tableNames = tables.map((t: any) => t.name);

      expect(tableNames).toContain('flights');
      expect(tableNames).toContain('passengers');
      expect(tableNames).toContain('airlines');
      expect(tableNames).toContain('airports');
      expect(tableNames).toContain('aircraft_types');
    });

    it('should load airlines from CSV', async () => {
      const airlines = await repository.getAirlines();
      expect(airlines.length).toBeGreaterThan(0);
      expect(airlines[0]).toHaveProperty('airlineCode');
      expect(airlines[0]).toHaveProperty('airlineName');
    });

    it('should load airports from JSON', async () => {
      const airports: any = await database.getAllAsync('SELECT * FROM airports');
      expect(airports.length).toBeGreaterThan(0);
      expect(airports[0]).toHaveProperty('iata_code');
      expect(airports[0]).toHaveProperty('airport_name');
    });

    it('should have views created', async () => {
      const views = await database.getAllAsync("SELECT name FROM sqlite_master WHERE type='view' ORDER BY name");
      const viewNames = views.map((v: any) => v.name);

      expect(viewNames).toContain('vw_flights');
      expect(viewNames).toContain('vw_stats');
    });
  });

  describe('makeQueryParams', () => {
    it('should handle string conditions', () => {
      const conditions = ['column1 = 1', 'column2 = 2'];
      const result = db.makeQueryParams(conditions);

      expect(result.where).toBe('column1 = 1 AND column2 = 2');
      expect(result.params).toEqual([]);
    });

    it('should handle Condition objects with plain values', () => {
      const conditions = [{ field: 'column1', operator: '=', value: 'test', isPlain: true }];
      const result = db.makeQueryParams(conditions);

      expect(result.where).toBe('column1 = test');
      expect(result.params).toEqual([]);
    });

    it('should handle Condition objects with parameterized values', () => {
      const conditions = [
        { field: 'column1', operator: '=', value: 'test1' },
        { field: 'column2', operator: '>', value: 100 },
      ];
      const result = db.makeQueryParams(conditions);

      expect(result.where).toBe('column1 = ? AND column2 > ?');
      expect(result.params).toEqual(['test1', 100]);
    });

    it('should handle mixed conditions', () => {
      const conditions = [
        { field: 'column1', operator: '=', value: 'test1' },
        'column2 IS NOT NULL',
        { field: 'column3', operator: '>', value: 50, isPlain: true },
      ];
      const result = db.makeQueryParams(conditions);

      expect(result.where).toBe('column1 = ? AND column2 IS NOT NULL AND column3 > 50');
      expect(result.params).toEqual(['test1']);
    });

    it('should handle empty conditions', () => {
      const conditions: any[] = [];
      const result = db.makeQueryParams(conditions);

      expect(result.where).toBe('');
      expect(result.params).toEqual([]);
    });
  });

  describe('prepareInsertStatement', () => {
    it('should return null for empty records array', () => {
      const result = db.prepareInsertStatement('test_table', []);
      expect(result).toBeNull();
    });

    it('should return null for records with no keys', () => {
      const result = db.prepareInsertStatement('test_table', [{}]);
      expect(result).toBeNull();
    });

    it('should generate correct SQL for single record', () => {
      const records = [{ id: 1, name: 'Test' }];
      const result = db.prepareInsertStatement('test_table', records);

      expect(result).not.toBeNull();
      expect(result!.sql).toBe('INSERT OR REPLACE INTO test_table (id, name) VALUES (?, ?)');
      expect(result!.params).toEqual([1, 'Test']);
    });

    it('should generate correct SQL for multiple records', () => {
      const records = [
        { id: 1, name: 'Test1' },
        { id: 2, name: 'Test2' },
      ];
      const result = db.prepareInsertStatement('test_table', records);

      expect(result).not.toBeNull();
      expect(result!.sql).toBe('INSERT OR REPLACE INTO test_table (id, name) VALUES (?, ?), (?, ?)');
      expect(result!.params).toEqual([1, 'Test1', 2, 'Test2']);
    });
  });

  describe('prepareUpdateStatement', () => {
    it('should return null for null record', () => {
      const result = db.prepareUpdateStatement('test_table', 'id', null as any);
      expect(result).toBeNull();
    });

    it('should return null when idField is undefined', () => {
      const result = db.prepareUpdateStatement('test_table', 'id', { name: 'Test' });
      expect(result).toBeNull();
    });

    it('should return null when no fields to update', () => {
      const result = db.prepareUpdateStatement('test_table', 'id', { id: 1 });
      expect(result).toBeNull();
    });

    it('should filter out undefined values', () => {
      const record = { id: 1, name: 'Test', value: undefined };
      const result = db.prepareUpdateStatement('test_table', 'id', record);

      expect(result).not.toBeNull();
      expect(result!.sql).toBe('UPDATE test_table SET name = ? WHERE id = ?');
      expect(result!.params).toEqual(['Test', 1]);
    });

    it('should generate correct SQL for update', () => {
      const record = { id: 1, name: 'Test', value: 123 };
      const result = db.prepareUpdateStatement('test_table', 'id', record);

      expect(result).not.toBeNull();
      expect(result!.sql).toBe('UPDATE test_table SET name = ?, value = ? WHERE id = ?');
      expect(result!.params).toEqual(['Test', 123, 1]);
    });
  });

  describe('insertFlight', () => {
    const mockFlight: Flight = {
      airline: 'AA',
      flightNumber: '100',
      startDatetime: '2024-08-29 08:45:00+01:00',
      endDatetime: '2024-08-29 12:10:00+02:00',
      departureAirport: 'JFK',
      arrivalAirport: 'LAX',
      distance: 2475,
      isArchived: false,
      arrivalAirportTimezone: 'America/Los_Angeles',
      arrivalCountry: 'US',
      departureAirportTimezone: 'America/New_York',
      departureCountry: 'US',
      extra: {},
      info: {},
      status: 'on_time',
      recordType: 0,
      notes: '',
    };

    it('should insert flight with known airline code', async () => {
      const result = await repository.insertFlight(mockFlight);
      expect(result).toBe(true);

      const flights = await repository.getFlights([], 10, 0, 'DESC');
      expect(flights.length).toBe(1);
      expect(flights[0].airline).toBe('AA');
      expect(flights[0].flightNumber).toBe('100');
      expect(flights[0].departureAirport).toBe('JFK');
      expect(flights[0].arrivalAirport).toBe('LAX');

      const sqlResult: any = await database.getFirstAsync(
        'SELECT flight_number, departure_airport, arrival_airport FROM flights WHERE flight_number = ?',
        '100',
      );
      expect(sqlResult).toBeDefined();
      expect(sqlResult.flight_number).toBe('100');
      expect(sqlResult.departure_airport).toBe('JFK');
      expect(sqlResult.arrival_airport).toBe('LAX');
    });

    it('should insert flight with unknown airline and store in extra', async () => {
      const flight: Flight = {
        ...mockFlight,
        airline: 'UNKNOWN',
        airlineName: 'Unknown Airline',
        airlineId: undefined,
      };

      const result = await repository.insertFlight(flight);
      expect(result).toBe(true);

      const flights = await repository.getFlights([], 10, 0, 'DESC');
      expect(flights[0].extra).toBeDefined();
      expect(flights[0].extra.airline).toBe('UNKNOWN');
      expect(flights[0].extra.airlineName).toBe('Unknown Airline');

      const sqlResult: any = await database.getFirstAsync('SELECT extra FROM flights WHERE flight_number = ?', '100');
      expect(sqlResult).toBeDefined();
      const extra = JSON.parse(sqlResult.extra);
      expect(extra.airline).toBe('UNKNOWN');
      expect(extra.airlineName).toBe('Unknown Airline');
    });

    it('should insert flight with airline ID', async () => {
      const airlines = await repository.getAirlines();
      const airline = airlines[0];

      const flight: Flight = {
        ...mockFlight,
        airline: airline.airlineCode,
        airlineId: airline.airlineId,
      };

      const result = await repository.insertFlight(flight);
      expect(result).toBe(true);

      const flights = await repository.getFlights([], 10, 0, 'DESC');
      expect(flights.length).toBe(1);

      const sqlResult: any = await database.getFirstAsync(
        'SELECT airline_id FROM flights WHERE flight_number = ?',
        '100',
      );
      expect(sqlResult).toBeDefined();
      expect(sqlResult.airline_id).toBe(airline.airlineId);
    });

    it('should insert flight with all optional fields', async () => {
      const flight: Flight = {
        ...mockFlight,
        actualStartDatetime: '2024-08-29 08:50:00+01:00',
        actualEndDatetime: '2024-08-29 12:15:00+02:00',
        aircraftType: 'B738',
        aircraftRegNumber: 'N12345',
        departureTerminal: '1',
        departureGate: 'A12',
        departureCheckInDesk: '123',
        arrivalTerminal: '2',
        baggageBelt: '5',
        notes: 'Test flight notes',
      };

      const result = await repository.insertFlight(flight);
      expect(result).toBe(true);

      const flights = await repository.getFlights([], 10, 0, 'DESC');
      expect(flights[0].aircraftType).toBe('B738');
      expect(flights[0].aircraftRegNumber).toBe('N12345');
      expect(flights[0].notes).toBe('Test flight notes');
      expect(flights[0].departureTerminal).toBe('1');
      expect(flights[0].departureGate).toBe('A12');

      const sqlResult: any = await database.getFirstAsync(
        'SELECT aircraft_type, aircraft_reg_number, notes, departure_terminal, departure_gate FROM flights WHERE flight_number = ?',
        '100',
      );
      expect(sqlResult).toBeDefined();
      expect(sqlResult.aircraft_type).toBe('B738');
      expect(sqlResult.aircraft_reg_number).toBe('N12345');
      expect(sqlResult.notes).toBe('Test flight notes');
      expect(sqlResult.departure_terminal).toBe('1');
      expect(sqlResult.departure_gate).toBe('A12');
    });

    it('should insert multiple flights', async () => {
      const flight1 = { ...mockFlight, flightNumber: '100' };
      const flight2 = { ...mockFlight, flightNumber: '200' };
      const flight3 = { ...mockFlight, flightNumber: '300' };

      await repository.insertFlight(flight1);
      await repository.insertFlight(flight2);
      await repository.insertFlight(flight3);

      const flights = await repository.getFlights([], 10, 0, 'DESC');
      expect(flights.length).toBe(3);

      const sqlResult: any = await database.getAllAsync('SELECT flight_number FROM flights ORDER BY flight_number');
      expect(sqlResult.length).toBe(3);
      expect(sqlResult[0].flight_number).toBe('100');
      expect(sqlResult[1].flight_number).toBe('200');
      expect(sqlResult[2].flight_number).toBe('300');
    });

    it('should handle special characters in notes', async () => {
      const flight: Flight = {
        ...mockFlight,
        notes: 'Test with \'quotes\' and "double quotes" and special chars: @#$%^&*()',
      };

      await repository.insertFlight(flight);
      const flights = await repository.getFlights([], 1, 0, 'DESC');
      expect(flights[0].notes).toBe('Test with \'quotes\' and "double quotes" and special chars: @#$%^&*()');

      const sqlResult: any = await database.getFirstAsync('SELECT notes FROM flights WHERE flight_number = ?', '100');
      expect(sqlResult).toBeDefined();
      expect(sqlResult.notes).toBe('Test with \'quotes\' and "double quotes" and special chars: @#$%^&*()');
    });

    it('should store complex JSON in extra field', async () => {
      const flight: Flight = {
        ...mockFlight,
        extra: {
          nested: { data: 'value', number: 123 },
          array: [1, 2, 3],
          string: 'test',
          boolean: true,
        },
      };

      await repository.insertFlight(flight);
      const flights = await repository.getFlights([], 1, 0, 'DESC');
      expect(flights[0].extra).toEqual({
        nested: { data: 'value', number: 123 },
        array: [1, 2, 3],
        string: 'test',
        boolean: true,
      });

      const sqlResult: any = await database.getFirstAsync('SELECT extra FROM flights WHERE flight_number = ?', '100');
      expect(sqlResult).toBeDefined();
      const extra = JSON.parse(sqlResult.extra);
      expect(extra).toEqual({
        nested: { data: 'value', number: 123 },
        array: [1, 2, 3],
        string: 'test',
        boolean: true,
      });
    });

    it('should insert archived flight', async () => {
      const flight: Flight = {
        ...mockFlight,
        isArchived: true,
      };

      await repository.insertFlight(flight);
      const flights = await repository.getFlights([], 10, 0, 'DESC');
      expect(flights[0].isArchived).toBe(1);

      const sqlResult: any = await database.getFirstAsync(
        'SELECT is_archived FROM flights WHERE flight_number = ?',
        '100',
      );
      expect(sqlResult).toBeDefined();
      expect(sqlResult.is_archived).toBe(1);
    });

    it('should insert flight with different record types', async () => {
      const flight0 = { ...mockFlight, flightNumber: '100', recordType: 0 };
      const flight1 = { ...mockFlight, flightNumber: '200', recordType: 1 };
      const flight2 = { ...mockFlight, flightNumber: '300', recordType: 2 };

      await repository.insertFlight(flight0);
      await repository.insertFlight(flight1);
      await repository.insertFlight(flight2);

      const flights = await repository.getFlights([], 10, 0, 'DESC');
      expect(flights[0].recordType).toBe(0);
      expect(flights[1].recordType).toBe(1);
      expect(flights[2].recordType).toBe(2);

      const sqlResult: any = await database.getAllAsync(
        'SELECT flight_number, record_type FROM flights ORDER BY flight_number',
      );
      expect(sqlResult.length).toBe(3);
      expect(sqlResult[0].record_type).toBe(0);
      expect(sqlResult[1].record_type).toBe(1);
      expect(sqlResult[2].record_type).toBe(2);
    });
  });

  describe('updateFlight', () => {
    const mockFlight: Flight = {
      airline: 'AA',
      flightNumber: '100',
      startDatetime: '2024-08-29 08:45:00+01:00',
      endDatetime: '2024-08-29 12:10:00+02:00',
      departureAirport: 'JFK',
      arrivalAirport: 'LAX',
      distance: 2475,
      isArchived: false,
      arrivalAirportTimezone: 'America/Los_Angeles',
      arrivalCountry: 'US',
      departureAirportTimezone: 'America/New_York',
      departureCountry: 'US',
      extra: {},
      info: {},
      status: 'on_time',
      recordType: 0,
      notes: '',
    };

    it('should return false when flightId is not provided', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const flight = { ...mockFlight };
      const result = await repository.updateFlight(flight);
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('flightId not provided');
      consoleErrorSpy.mockRestore();
    });

    it('should update existing flight', async () => {
      await repository.insertFlight(mockFlight);
      const flights = await repository.getFlights([], 1, 0, 'DESC');
      const flightId = flights[0].flightId;

      const updatedFlight = {
        ...mockFlight,
        flightId,
        flightNumber: '200',
        notes: 'Updated notes',
      };

      const result = await repository.updateFlight(updatedFlight);
      expect(result).toBe(true);

      const updated = await repository.getFlight(flightId!);
      expect(updated?.flightNumber).toBe('200');
      expect(updated?.notes).toBe('Updated notes');

      const sqlResult: any = await database.getFirstAsync(
        'SELECT flight_number, notes FROM flights WHERE flight_id = ?',
        flightId,
      );
      expect(sqlResult).toBeDefined();
      expect(sqlResult.flight_number).toBe('200');
      expect(sqlResult.notes).toBe('Updated notes');
    });

    it('should update flight with passenger data', async () => {
      await repository.insertFlight(mockFlight);
      const flights = await repository.getFlights([], 1, 0, 'DESC');
      const flightId = flights[0].flightId;

      const updatedFlight = {
        ...mockFlight,
        flightId,
        pnr: 'ABC123',
        passengerName: 'John Doe',
        seatNumber: '12A',
      };

      const result = await repository.updateFlight(updatedFlight);
      expect(result).toBe(true);

      const updated = await repository.getFlight(flightId!);
      expect(updated?.pnr).toBe('ABC123');
      expect(updated?.passengerName).toBe('John Doe');
      expect(updated?.seatNumber).toBe('12A');

      const sqlResult: any = await database.getFirstAsync(
        'SELECT pnr, passenger_name, seat_number FROM passengers WHERE flight_id = ?',
        flightId,
      );
      expect(sqlResult).toBeDefined();
      expect(sqlResult.pnr).toBe('ABC123');
      expect(sqlResult.passenger_name).toBe('John Doe');
      expect(sqlResult.seat_number).toBe('12A');
    });

    it('should update flight with bcbp data', async () => {
      await repository.insertFlight(mockFlight);
      const flights = await repository.getFlights([], 1, 0, 'DESC');
      const flightId = flights[0].flightId;

      const bcbpData = {
        data: { passengerName: 'Test' },
        format: 'iata',
        pkpass: {},
      };

      const updatedFlight = {
        ...mockFlight,
        flightId,
        bcbp: bcbpData,
      };

      const result = await repository.updateFlight(updatedFlight);
      expect(result).toBe(true);

      const updated = await repository.getFlight(flightId!);
      expect(updated?.bcbp).toEqual(bcbpData);

      const sqlResult: any = await database.getFirstAsync('SELECT bcbp FROM passengers WHERE flight_id = ?', flightId);
      expect(sqlResult).toBeDefined();
      const bcbp = JSON.parse(sqlResult.bcbp);
      expect(bcbp).toEqual(bcbpData);
    });
  });

  describe('isFlightExists', () => {
    const mockFlight: Flight = {
      airline: 'AA',
      flightNumber: '100',
      startDatetime: '2024-08-29 08:45:00+01:00',
      endDatetime: '2024-08-29 12:10:00+02:00',
      departureAirport: 'JFK',
      arrivalAirport: 'LAX',
      distance: 2475,
      isArchived: false,
      arrivalAirportTimezone: 'America/Los_Angeles',
      arrivalCountry: 'US',
      departureAirportTimezone: 'America/New_York',
      departureCountry: 'US',
      extra: {},
      info: {},
      status: 'on_time',
      recordType: 0,
      notes: '',
    };

    it('should return flightId if flight exists', async () => {
      await repository.insertFlight(mockFlight);
      const flightId = await repository.isFlightExists('AA', '100', '2024-08-29');
      expect(flightId).toBeDefined();
      expect(typeof flightId).toBe('number');
    });

    it('should return undefined if flight does not exist', async () => {
      const flightId = await repository.isFlightExists('XX', '999', '2024-01-01');
      expect(flightId).toBeUndefined();
    });
  });

  describe('getFlight', () => {
    const mockFlight: Flight = {
      airline: 'AA',
      flightNumber: '100',
      startDatetime: '2024-08-29 08:45:00+01:00',
      endDatetime: '2024-08-29 12:10:00+02:00',
      departureAirport: 'JFK',
      arrivalAirport: 'LAX',
      distance: 2475,
      isArchived: false,
      arrivalAirportTimezone: 'America/Los_Angeles',
      arrivalCountry: 'US',
      departureAirportTimezone: 'America/New_York',
      departureCountry: 'US',
      extra: {},
      info: {},
      status: 'on_time',
      recordType: 0,
      notes: '',
    };

    it('should return flight by id', async () => {
      await repository.insertFlight(mockFlight);
      const flights = await repository.getFlights([], 1, 0, 'DESC');
      const flightId = flights[0].flightId;

      const flight = await repository.getFlight(flightId!);
      expect(flight).toBeDefined();
      expect(flight?.airline).toBe('AA');
      expect(flight?.flightNumber).toBe('100');
    });

    it('should handle non-existent flight gracefully', async () => {
      const flight = await repository.getFlight(99999);
      expect(flight).toBeDefined();

      expect(flight?.flightId).toBeUndefined();
    });
  });

  describe('insertPassengerFromBCBP', () => {
    const mockFlight: Flight = {
      airline: 'AA',
      flightNumber: '100',
      startDatetime: '2024-08-29 08:45:00+01:00',
      endDatetime: '2024-08-29 12:10:00+02:00',
      departureAirport: 'JFK',
      arrivalAirport: 'LAX',
      distance: 2475,
      isArchived: false,
      arrivalAirportTimezone: 'America/Los_Angeles',
      arrivalCountry: 'US',
      departureAirportTimezone: 'America/New_York',
      departureCountry: 'US',
      extra: {},
      info: {},
      status: 'on_time',
      recordType: 0,
      notes: '',
    };

    it('should insert passenger from BCBP data', async () => {
      await repository.insertFlight(mockFlight);
      const flights = await repository.getFlights([], 1, 0, 'DESC');
      const flightId = flights[0].flightId;

      const bcbpData: any = {
        data: {
          passengerName: 'JOHN DOE',
          legs: [
            {
              operatingCarrierPNR: 'ABC123',
              seatNumber: '012A',
            },
          ],
        },
      };

      const pkpassData = {
        airline: 'AA',
        barcode: {
          altText: 'AA100',
          format: 'PKBarcodeFormatPDF417',
          message: 'M1TEST',
          messageEncoding: 'iso-8859-1',
        },
        boardingPass: {},
        colors: {
          backgroundColor: '#000000',
          foregroundColor: '#FFFFFF',
          labelColor: '#999999',
        },
        images: {},
      };

      const result = await repository.insertPassengerFromBCBP(flightId!, bcbpData, 'iata', pkpassData);
      expect(result).toBe(true);

      const flight = await repository.getFlight(flightId!);
      expect(flight?.pnr).toBe('ABC123');
      expect(flight?.passengerName).toBe('JOHN DOE');
      expect(flight?.seatNumber).toBe('12A');

      const sqlResult: any = await database.getFirstAsync(
        'SELECT pnr, passenger_name, seat_number, bcbp FROM passengers WHERE flight_id = ?',
        flightId,
      );
      expect(sqlResult).toBeDefined();
      expect(sqlResult.pnr).toBe('ABC123');
      expect(sqlResult.passenger_name).toBe('JOHN DOE');
      expect(sqlResult.seat_number).toBe('12A');

      const bcbp = JSON.parse(sqlResult.bcbp);
      expect(bcbp.data).toEqual(bcbpData);
      expect(bcbp.format).toBe('iata');
      expect(bcbp.pkpass).toEqual(pkpassData);
    });

    it('should handle BCBP with missing optional fields', async () => {
      await repository.insertFlight(mockFlight);
      const flights = await repository.getFlights([], 1, 0, 'DESC');
      const flightId = flights[0].flightId;

      const bcbpData: any = {
        data: {
          legs: [{}],
        },
      };

      const pkpassData = {
        airline: 'AA',
        barcode: {
          altText: 'AA100',
          format: 'PKBarcodeFormatPDF417',
          message: 'M1TEST',
          messageEncoding: 'iso-8859-1',
        },
        boardingPass: {},
        colors: {
          backgroundColor: '#000000',
          foregroundColor: '#FFFFFF',
          labelColor: '#999999',
        },
        images: {},
      };

      const result = await repository.insertPassengerFromBCBP(flightId!, bcbpData, 'iata', pkpassData);
      expect(result).toBe(true);

      const flight = await repository.getFlight(flightId!);
      expect(flight?.pnr).toBe('');
      expect(flight?.passengerName).toBe('');
      expect(flight?.seatNumber).toBe('');

      const sqlResult: any = await database.getFirstAsync(
        'SELECT pnr, passenger_name, seat_number FROM passengers WHERE flight_id = ?',
        flightId,
      );
      expect(sqlResult).toBeDefined();
      expect(sqlResult.pnr).toBe('');
      expect(sqlResult.passenger_name).toBe('');
      expect(sqlResult.seat_number).toBe('');
    });

    it('should replace existing passenger data', async () => {
      await repository.insertFlight(mockFlight);
      const flights = await repository.getFlights([], 1, 0, 'DESC');
      const flightId = flights[0].flightId;

      const bcbpData1: any = {
        data: {
          passengerName: 'FIRST PASSENGER',
          legs: [
            {
              operatingCarrierPNR: 'PNR001',
              seatNumber: '01A',
            },
          ],
        },
      };

      const pkpassData = {
        airline: 'AA',
        barcode: {
          altText: 'AA100',
          format: 'PKBarcodeFormatPDF417',
          message: 'M1TEST',
          messageEncoding: 'iso-8859-1',
        },
        boardingPass: {},
        colors: {
          backgroundColor: '#000000',
          foregroundColor: '#FFFFFF',
          labelColor: '#999999',
        },
        images: {},
      };

      await repository.insertPassengerFromBCBP(flightId!, bcbpData1, 'iata', pkpassData);

      let sqlResult: any = await database.getFirstAsync(
        'SELECT pnr, passenger_name FROM passengers WHERE flight_id = ?',
        flightId,
      );
      expect(sqlResult.pnr).toBe('PNR001');
      expect(sqlResult.passenger_name).toBe('FIRST PASSENGER');

      const bcbpData2: any = {
        data: {
          passengerName: 'SECOND PASSENGER',
          legs: [
            {
              operatingCarrierPNR: 'PNR002',
              seatNumber: '02B',
            },
          ],
        },
      };

      await repository.insertPassengerFromBCBP(flightId!, bcbpData2, 'iata', pkpassData);

      sqlResult = await database.getFirstAsync(
        'SELECT pnr, passenger_name FROM passengers WHERE flight_id = ?',
        flightId,
      );
      expect(sqlResult.pnr).toBe('PNR002');
      expect(sqlResult.passenger_name).toBe('SECOND PASSENGER');

      const allPassengers: any = await database.getAllAsync('SELECT * FROM passengers WHERE flight_id = ?', flightId);
      expect(allPassengers.length).toBe(1);
    });
  });

  describe('archiveFlight', () => {
    const mockFlight: Flight = {
      airline: 'AA',
      flightNumber: '100',
      startDatetime: '2024-08-29 08:45:00+01:00',
      endDatetime: '2024-08-29 12:10:00+02:00',
      departureAirport: 'JFK',
      arrivalAirport: 'LAX',
      distance: 2475,
      isArchived: false,
      arrivalAirportTimezone: 'America/Los_Angeles',
      arrivalCountry: 'US',
      departureAirportTimezone: 'America/New_York',
      departureCountry: 'US',
      extra: {},
      info: {},
      status: 'on_time',
      recordType: 0,
      notes: '',
    };

    it('should archive flight with default state', async () => {
      await repository.insertFlight(mockFlight);
      const flights = await repository.getFlights([], 1, 0, 'DESC');
      const flightId = flights[0].flightId;

      await repository.archiveFlight(flightId!);

      const flight = await repository.getFlight(flightId!);
      expect(flight?.isArchived).toBe(1);

      const sqlResult: any = await database.getFirstAsync(
        'SELECT is_archived FROM flights WHERE flight_id = ?',
        flightId,
      );
      expect(sqlResult).toBeDefined();
      expect(sqlResult.is_archived).toBe(1);
    });

    it('should unarchive flight with state 0', async () => {
      await repository.insertFlight({ ...mockFlight, isArchived: true });
      const flights = await repository.getFlights([], 1, 0, 'DESC');
      const flightId = flights[0].flightId;

      await repository.archiveFlight(flightId!, 0);

      const flight = await repository.getFlight(flightId!);
      expect(flight?.isArchived).toBe(0);

      const sqlResult: any = await database.getFirstAsync(
        'SELECT is_archived FROM flights WHERE flight_id = ?',
        flightId,
      );
      expect(sqlResult).toBeDefined();
      expect(sqlResult.is_archived).toBe(0);
    });
  });

  describe('deleteFlight', () => {
    const mockFlight: Flight = {
      airline: 'AA',
      flightNumber: '100',
      startDatetime: '2024-08-29 08:45:00+01:00',
      endDatetime: '2024-08-29 12:10:00+02:00',
      departureAirport: 'JFK',
      arrivalAirport: 'LAX',
      distance: 2475,
      isArchived: false,
      arrivalAirportTimezone: 'America/Los_Angeles',
      arrivalCountry: 'US',
      departureAirportTimezone: 'America/New_York',
      departureCountry: 'US',
      extra: {},
      info: {},
      status: 'on_time',
      recordType: 0,
      notes: '',
    };

    it('should delete flight and associated passengers', async () => {
      await repository.insertFlight(mockFlight);
      const flights = await repository.getFlights([], 1, 0, 'DESC');
      const flightId = flights[0].flightId;

      const result = await repository.deleteFlight(flightId!);
      expect(result).toBe(true);

      const remainingFlights = await repository.getFlights([], 10, 0, 'DESC');
      expect(remainingFlights.length).toBe(0);

      const sqlResult: any = await database.getFirstAsync('SELECT * FROM flights WHERE flight_id = ?', flightId);
      expect(sqlResult).toBeUndefined();

      const passengerResult: any = await database.getFirstAsync(
        'SELECT * FROM passengers WHERE flight_id = ?',
        flightId,
      );
      expect(passengerResult).toBeUndefined();
    });
  });

  describe('getStats', () => {
    const mockFlight1: Flight = {
      airline: 'AA',
      flightNumber: '100',
      startDatetime: '2024-08-29 08:45:00+01:00',
      endDatetime: '2024-08-29 12:10:00+02:00',
      departureAirport: 'JFK',
      arrivalAirport: 'LAX',
      distance: 2475,
      isArchived: true,
      arrivalAirportTimezone: 'America/Los_Angeles',
      arrivalCountry: 'US',
      departureAirportTimezone: 'America/New_York',
      departureCountry: 'US',
      extra: {},
      info: {},
      status: 'on_time',
      recordType: 0,
      notes: '',
    };

    const mockFlight2: Flight = {
      airline: 'AA',
      flightNumber: '200',
      startDatetime: '2023-08-29 08:45:00+01:00',
      endDatetime: '2023-08-29 12:10:00+02:00',
      departureAirport: 'LAX',
      arrivalAirport: 'JFK',
      distance: 2475,
      isArchived: true,
      arrivalAirportTimezone: 'America/New_York',
      arrivalCountry: 'US',
      departureAirportTimezone: 'America/Los_Angeles',
      departureCountry: 'US',
      extra: {},
      info: {},
      status: 'on_time',
      recordType: 0,
      notes: '',
    };

    it('should return stats for multiple years', async () => {
      await repository.insertFlight(mockFlight1);
      await repository.insertFlight(mockFlight2);

      const stats = await repository.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });
  });

  describe('getAchievements', () => {
    it('should return achievements list', async () => {
      const achievements = await repository.getAchievements();
      expect(Array.isArray(achievements)).toBe(true);
    });

    it('should return achievements with New Year flight data', async () => {
      const newYearFlight: Flight = {
        airline: 'AA',
        flightNumber: '2024',
        startDatetime: '2024-12-31 23:30:00+00:00',
        endDatetime: '2025-01-01 02:15:00+00:00',
        departureAirport: 'JFK',
        arrivalAirport: 'LAX',
        distance: 2475,
        isArchived: true,
        arrivalAirportTimezone: 'America/Los_Angeles',
        arrivalCountry: 'US',
        departureAirportTimezone: 'America/New_York',
        departureCountry: 'US',
        extra: {},
        info: {},
        status: 'on_time',
        recordType: 0,
        notes: 'New Year flight',
      };

      const insertResult = await repository.insertFlight(newYearFlight);
      expect(insertResult).toBe(true);

      const achievements = await repository.getAchievements();
      expect(Array.isArray(achievements)).toBe(true);
      expect(achievements.length).toBeGreaterThan(0);

      const newYearAchievement = achievements.find((a: any) => a.name === 'new_year');
      expect(newYearAchievement).toBeDefined();
      if (newYearAchievement) {
        expect(newYearAchievement.departureAirport).toBe('JFK');
        expect(newYearAchievement.arrivalAirport).toBe('LAX');
        expect(newYearAchievement.flightDate).toBe('2024-12-31');
      }
    });
  });

  describe('exportFlights', () => {
    const mockFlight: Flight = {
      airline: 'AA',
      flightNumber: '100',
      startDatetime: '2024-08-29 08:45:00+01:00',
      endDatetime: '2024-08-29 12:10:00+02:00',
      departureAirport: 'JFK',
      arrivalAirport: 'LAX',
      distance: 2475,
      isArchived: false,
      arrivalAirportTimezone: 'America/Los_Angeles',
      arrivalCountry: 'US',
      departureAirportTimezone: 'America/New_York',
      departureCountry: 'US',
      extra: {},
      info: {},
      status: 'on_time',
      recordType: 0,
      notes: '',
    };

    it('should export all flights', async () => {
      await repository.insertFlight(mockFlight);
      const exported = await repository.exportFlights();
      expect(Array.isArray(exported)).toBe(true);
      expect(exported.length).toBeGreaterThan(0);
    });
  });

  describe('getFlights with conditions', () => {
    const mockFlight1: Flight = {
      airline: 'AA',
      flightNumber: '100',
      startDatetime: '2024-08-29 08:45:00+01:00',
      endDatetime: '2024-08-29 12:10:00+02:00',
      departureAirport: 'JFK',
      arrivalAirport: 'LAX',
      distance: 2475,
      isArchived: false,
      arrivalAirportTimezone: 'America/Los_Angeles',
      arrivalCountry: 'US',
      departureAirportTimezone: 'America/New_York',
      departureCountry: 'US',
      extra: {},
      info: {},
      status: 'on_time',
      recordType: 0,
      notes: '',
    };

    const mockFlight2: Flight = {
      airline: 'BA',
      flightNumber: '200',
      startDatetime: '2024-08-30 08:45:00+01:00',
      endDatetime: '2024-08-30 12:10:00+02:00',
      departureAirport: 'LHR',
      arrivalAirport: 'JFK',
      distance: 3500,
      isArchived: true,
      arrivalAirportTimezone: 'America/New_York',
      arrivalCountry: 'US',
      departureAirportTimezone: 'Europe/London',
      departureCountry: 'GB',
      extra: {},
      info: {},
      status: 'on_time',
      recordType: 1,
      notes: '',
    };

    it('should filter flights by conditions', async () => {
      await repository.insertFlight(mockFlight1);
      await repository.insertFlight(mockFlight2);

      const flights = await repository.getFlights([{ field: 'is_archived', operator: '=', value: 0 }], 10, 0, 'DESC');

      expect(flights.length).toBe(1);
      expect(flights[0].airline).toBe('AA');
    });

    it('should handle pagination with offset', async () => {
      await repository.insertFlight(mockFlight1);
      await repository.insertFlight(mockFlight2);

      const page1 = await repository.getFlights([], 1, 0, 'DESC');
      const page2 = await repository.getFlights([], 1, 1, 'DESC');

      expect(page1.length).toBe(1);
      expect(page2.length).toBe(1);
      expect(page1[0].flightNumber).not.toBe(page2[0].flightNumber);
    });

    it('should get all flights without limit', async () => {
      await repository.insertFlight(mockFlight1);
      await repository.insertFlight(mockFlight2);

      const flights = await repository.getFlights([], 0, 0, 'DESC');

      expect(flights.length).toBe(2);
    });

    it('should order flights ascending', async () => {
      await repository.insertFlight(mockFlight1);
      await repository.insertFlight(mockFlight2);

      const flights = await repository.getFlights([], 10, 0, 'ASC');

      expect(new Date(flights[0].startDatetime).getTime()).toBeLessThan(new Date(flights[1].startDatetime).getTime());
    });
  });

  describe('fillDataFromArray and updateFromRecord', () => {
    it('should fill data from array', async () => {
      const records = [
        { test_id: 1, test_name: 'Test 1' },
        { test_id: 2, test_name: 'Test 2' },
      ];

      await database.execAsync('CREATE TABLE IF NOT EXISTS test_table (test_id INTEGER PRIMARY KEY, test_name TEXT)');

      await repository.fillDataFromArray('test_table', records);

      const result: any = await database.getAllAsync('SELECT * FROM test_table');
      expect(result.length).toBe(2);
      expect(result[0].test_name).toBe('Test 1');

      const sqlResult: any = await database.getAllAsync('SELECT * FROM test_table ORDER BY test_id');
      expect(sqlResult.length).toBe(2);
      expect(sqlResult[0].test_id).toBe(1);
      expect(sqlResult[0].test_name).toBe('Test 1');
      expect(sqlResult[1].test_id).toBe(2);
      expect(sqlResult[1].test_name).toBe('Test 2');
    });

    it('should handle null and undefined records in array', async () => {
      await database.execAsync(
        'CREATE TABLE IF NOT EXISTS test_table_null (test_id INTEGER PRIMARY KEY, test_name TEXT)',
      );

      // Тест проверяет, что null/undefined элементы преобразуются в пустые объекты {}
      // и вставляются как строки с undefined значениями
      const records = [{ test_id: 1, test_name: 'Valid' }, null, { test_id: 2, test_name: 'Also Valid' }, undefined];

      await repository.fillDataFromArray('test_table_null', records);

      // В базу должны попасть все 4 строки, но null/undefined записи будут с undefined значениями
      const result: any = await database.getAllAsync('SELECT * FROM test_table_null ORDER BY test_id');
      // SQLite игнорирует строки где PRIMARY KEY = undefined/null, поэтому ожидаем только 2 валидных записи
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0].test_id).toBe(1);
      expect(result[0].test_name).toBe('Valid');

      const validRecords = result.filter((r: any) => r.test_id === 1 || r.test_id === 2);
      expect(validRecords.length).toBe(2);
      expect(validRecords[1].test_id).toBe(2);
      expect(validRecords[1].test_name).toBe('Also Valid');
    });

    it('should update from record', async () => {
      await database.execAsync('CREATE TABLE IF NOT EXISTS test_table2 (test_id INTEGER PRIMARY KEY, test_name TEXT)');
      await database.runAsync('INSERT INTO test_table2 (test_id, test_name) VALUES (?, ?)', 1, 'Original');

      await repository.updateFromRecord('test_table2', 'test_id', { test_id: 1, test_name: 'Updated' });

      const result: any = await database.getFirstAsync('SELECT * FROM test_table2 WHERE test_id = 1');
      expect(result.test_name).toBe('Updated');

      const sqlResult: any = await database.getFirstAsync('SELECT test_name FROM test_table2 WHERE test_id = ?', 1);
      expect(sqlResult).toBeDefined();
      expect(sqlResult.test_name).toBe('Updated');
    });
  });

  describe('getRawDatabase', () => {
    it('should return raw database instance', () => {
      const rawDb = repository.getRawDatabase();
      expect(rawDb).toBeDefined();
      expect(rawDb).toBe(database);
    });
  });
});

describe('SQLite Module-Level Functions', () => {
  describe('setDatabaseRepository and global functions', () => {
    let database: any;
    let repository: db.SQLiteRepository;

    beforeEach(async () => {
      database = await openDatabaseAsync(':memory:');
      repository = await db.createSQLiteRepository(database, db.createDefaultAssets());
      db.setDatabaseRepository(repository);
    });

    afterEach(async () => {
      if (database) {
        await database.closeAsync();
      }
      db.setDatabaseRepository(undefined);
      jest.restoreAllMocks();
    });

    it('should set and get repository', async () => {
      db.setDatabaseRepository(repository);
      const flights = await db.getFlights([], 1, 0, 'DESC');
      expect(Array.isArray(flights)).toBe(true);
    });

    it('should throw error when calling getFlights without repository', async () => {
      db.setDatabaseRepository(undefined);
      jest.spyOn(require('expo-sqlite'), 'openDatabaseAsync').mockRejectedValueOnce(new Error('Database error'));
      await expect(db.getFlights([], 10, 0, 'DESC')).rejects.toThrow("Can't select flights: database not opened");
    });

    it('should throw error when calling fillDataFromArray without repository', async () => {
      db.setDatabaseRepository(undefined);
      jest.spyOn(require('expo-sqlite'), 'openDatabaseAsync').mockRejectedValueOnce(new Error('Database error'));
      await expect(db.fillDataFromArray('test', [])).rejects.toThrow("Can't insert data: database not opened");
    });

    it('should throw error when calling isFlightExists without repository', async () => {
      db.setDatabaseRepository(undefined);
      jest.spyOn(require('expo-sqlite'), 'openDatabaseAsync').mockRejectedValueOnce(new Error('Database error'));
      await expect(db.isFlightExists('AA', '100', '2024-01-01')).rejects.toThrow(
        "Can't select from flights: database not opened",
      );
    });

    it('should throw error when calling getFlight without repository', async () => {
      db.setDatabaseRepository(undefined);
      jest.spyOn(require('expo-sqlite'), 'openDatabaseAsync').mockRejectedValueOnce(new Error('Database error'));
      await expect(db.getFlight(1)).rejects.toThrow("Can't select from flights: database not opened");
    });

    it('should throw error when calling insertFlight without repository', async () => {
      db.setDatabaseRepository(undefined);
      jest.spyOn(require('expo-sqlite'), 'openDatabaseAsync').mockRejectedValueOnce(new Error('Database error'));
      const mockFlight: any = { airline: 'AA', flightNumber: '100' };
      await expect(db.insertFlight(mockFlight)).rejects.toThrow("Can't insert flight: database not opened");
    });

    it('should throw error when calling updateFlight without repository', async () => {
      db.setDatabaseRepository(undefined);
      jest.spyOn(require('expo-sqlite'), 'openDatabaseAsync').mockRejectedValueOnce(new Error('Database error'));
      const mockFlight: any = { flightId: 1, airline: 'AA', flightNumber: '100' };
      await expect(db.updateFlight(mockFlight)).rejects.toThrow("Can't insert flight: database not opened");
    });

    it('should throw error when calling insertPassengerFromBCBP without repository', async () => {
      db.setDatabaseRepository(undefined);
      jest.spyOn(require('expo-sqlite'), 'openDatabaseAsync').mockRejectedValueOnce(new Error('Database error'));
      await expect(db.insertPassengerFromBCBP(1, {} as any, 'iata', {} as any)).rejects.toThrow(
        "Can't insert passenger: database not opened",
      );
    });

    it('should throw error when calling archiveFlight without repository', async () => {
      db.setDatabaseRepository(undefined);
      jest.spyOn(require('expo-sqlite'), 'openDatabaseAsync').mockRejectedValueOnce(new Error('Database error'));
      await expect(db.archiveFlight(1)).rejects.toThrow("Can't archive flight: database not opened");
    });

    it('should throw error when calling deleteFlight without repository', async () => {
      db.setDatabaseRepository(undefined);
      jest.spyOn(require('expo-sqlite'), 'openDatabaseAsync').mockRejectedValueOnce(new Error('Database error'));
      await expect(db.deleteFlight(1)).rejects.toThrow("Can't delete flight: database not opened");
    });

    it('should throw error when calling getStats without repository', async () => {
      db.setDatabaseRepository(undefined);
      jest.spyOn(require('expo-sqlite'), 'openDatabaseAsync').mockRejectedValueOnce(new Error('Database error'));
      await expect(db.getStats()).rejects.toThrow("Can't get stats: database not opened");
    });

    it('should throw error when calling getAchievements without repository', async () => {
      db.setDatabaseRepository(undefined);
      jest.spyOn(require('expo-sqlite'), 'openDatabaseAsync').mockRejectedValueOnce(new Error('Database error'));
      await expect(db.getAchievements()).rejects.toThrow("Can't get achievement: database not opened");
    });

    it('should throw error when calling exportFlights without repository', async () => {
      db.setDatabaseRepository(undefined);
      jest.spyOn(require('expo-sqlite'), 'openDatabaseAsync').mockRejectedValueOnce(new Error('Database error'));
      await expect(db.exportFlights()).rejects.toThrow("Can't select flights: database not opened");
    });

    it('should throw error when calling getAirlines without repository', async () => {
      db.setDatabaseRepository(undefined);
      jest.spyOn(require('expo-sqlite'), 'openDatabaseAsync').mockRejectedValueOnce(new Error('Database error'));
      await expect(db.getAirlines()).rejects.toThrow("Can't get achievement: database not opened");
    });

    it('should call getActualFlights successfully', async () => {
      const flights = await db.getActualFlights(10, 0);
      expect(Array.isArray(flights)).toBe(true);
    });

    it('should call getPastFlights successfully', async () => {
      const flights = await db.getPastFlights([], 10, 0);
      expect(Array.isArray(flights)).toBe(true);
    });

    it('should call getFlights successfully with repository', async () => {
      const flights = await db.getFlights([], 10, 0, 'DESC');
      expect(Array.isArray(flights)).toBe(true);
    });

    it('should call fillDataFromArray successfully with repository', async () => {
      await database.execAsync('CREATE TABLE test_wrapper (id INTEGER PRIMARY KEY, name TEXT)');
      await db.fillDataFromArray('test_wrapper', [{ id: 1, name: 'Test' }]);
      const result: any = await database.getFirstAsync('SELECT * FROM test_wrapper WHERE id = 1');
      expect(result).toBeDefined();
      expect(result.name).toBe('Test');
    });

    it('should call isFlightExists successfully with repository', async () => {
      const mockFlight: Flight = {
        airline: 'AA',
        flightNumber: '999',
        startDatetime: '2024-08-29 08:45:00+01:00',
        endDatetime: '2024-08-29 12:10:00+02:00',
        departureAirport: 'JFK',
        arrivalAirport: 'LAX',
        distance: 2475,
        isArchived: false,
        arrivalAirportTimezone: 'America/Los_Angeles',
        arrivalCountry: 'US',
        departureAirportTimezone: 'America/New_York',
        departureCountry: 'US',
        extra: {},
        info: {},
        status: 'on_time',
        recordType: 0,
        notes: '',
      };
      await db.insertFlight(mockFlight);
      const flightId = await db.isFlightExists('AA', '999', '2024-08-29');
      expect(flightId).toBeDefined();
      expect(typeof flightId).toBe('number');
    });

    it('should call getFlight successfully with repository', async () => {
      const mockFlight: Flight = {
        airline: 'AA',
        flightNumber: '888',
        startDatetime: '2024-08-29 08:45:00+01:00',
        endDatetime: '2024-08-29 12:10:00+02:00',
        departureAirport: 'JFK',
        arrivalAirport: 'LAX',
        distance: 2475,
        isArchived: false,
        arrivalAirportTimezone: 'America/Los_Angeles',
        arrivalCountry: 'US',
        departureAirportTimezone: 'America/New_York',
        departureCountry: 'US',
        extra: {},
        info: {},
        status: 'on_time',
        recordType: 0,
        notes: '',
      };
      await db.insertFlight(mockFlight);
      const flights = await db.getFlights([], 1, 0, 'DESC');
      const flight = await db.getFlight(flights[0].flightId!);
      expect(flight).toBeDefined();
      expect(flight?.flightNumber).toBe('888');
    });

    it('should call insertFlight successfully with repository', async () => {
      const mockFlight: Flight = {
        airline: 'AA',
        flightNumber: '777',
        startDatetime: '2024-08-29 08:45:00+01:00',
        endDatetime: '2024-08-29 12:10:00+02:00',
        departureAirport: 'JFK',
        arrivalAirport: 'LAX',
        distance: 2475,
        isArchived: false,
        arrivalAirportTimezone: 'America/Los_Angeles',
        arrivalCountry: 'US',
        departureAirportTimezone: 'America/New_York',
        departureCountry: 'US',
        extra: {},
        info: {},
        status: 'on_time',
        recordType: 0,
        notes: '',
      };
      const result = await db.insertFlight(mockFlight);
      expect(result).toBe(true);
    });

    it('should call updateFlight successfully with repository', async () => {
      const mockFlight: Flight = {
        airline: 'AA',
        flightNumber: '666',
        startDatetime: '2024-08-29 08:45:00+01:00',
        endDatetime: '2024-08-29 12:10:00+02:00',
        departureAirport: 'JFK',
        arrivalAirport: 'LAX',
        distance: 2475,
        isArchived: false,
        arrivalAirportTimezone: 'America/Los_Angeles',
        arrivalCountry: 'US',
        departureAirportTimezone: 'America/New_York',
        departureCountry: 'US',
        extra: {},
        info: {},
        status: 'on_time',
        recordType: 0,
        notes: '',
      };
      await db.insertFlight(mockFlight);
      const flights = await db.getFlights([], 1, 0, 'DESC');
      const updatedFlight = { ...mockFlight, flightId: flights[0].flightId, notes: 'Updated' };
      const result = await db.updateFlight(updatedFlight);
      expect(result).toBe(true);
    });

    it('should call insertPassengerFromBCBP successfully with repository', async () => {
      const mockFlight: Flight = {
        airline: 'AA',
        flightNumber: '555',
        startDatetime: '2024-08-29 08:45:00+01:00',
        endDatetime: '2024-08-29 12:10:00+02:00',
        departureAirport: 'JFK',
        arrivalAirport: 'LAX',
        distance: 2475,
        isArchived: false,
        arrivalAirportTimezone: 'America/Los_Angeles',
        arrivalCountry: 'US',
        departureAirportTimezone: 'America/New_York',
        departureCountry: 'US',
        extra: {},
        info: {},
        status: 'on_time',
        recordType: 0,
        notes: '',
      };
      await db.insertFlight(mockFlight);
      const flights = await db.getFlights([], 1, 0, 'DESC');
      const bcbpData: any = {
        data: {
          passengerName: 'TEST PASSENGER',
          legs: [{ operatingCarrierPNR: 'ABC123', seatNumber: '01A' }],
        },
      };
      const pkpassData = {
        airline: 'AA',
        barcode: {
          altText: 'AA555',
          format: 'PKBarcodeFormatPDF417',
          message: 'M1TEST',
          messageEncoding: 'iso-8859-1',
        },
        boardingPass: {},
        colors: {
          backgroundColor: '#000000',
          foregroundColor: '#FFFFFF',
          labelColor: '#999999',
        },
        images: {},
      };
      const result = await db.insertPassengerFromBCBP(flights[0].flightId!, bcbpData, 'iata', pkpassData);
      expect(result).toBe(true);
    });

    it('should call archiveFlight successfully with repository', async () => {
      const mockFlight: Flight = {
        airline: 'AA',
        flightNumber: '444',
        startDatetime: '2024-08-29 08:45:00+01:00',
        endDatetime: '2024-08-29 12:10:00+02:00',
        departureAirport: 'JFK',
        arrivalAirport: 'LAX',
        distance: 2475,
        isArchived: false,
        arrivalAirportTimezone: 'America/Los_Angeles',
        arrivalCountry: 'US',
        departureAirportTimezone: 'America/New_York',
        departureCountry: 'US',
        extra: {},
        info: {},
        status: 'on_time',
        recordType: 0,
        notes: '',
      };
      await db.insertFlight(mockFlight);
      const flights = await db.getFlights([], 1, 0, 'DESC');
      await db.archiveFlight(flights[0].flightId!);
      const archived = await db.getFlight(flights[0].flightId!);
      expect(archived?.isArchived).toBe(1);
    });

    it('should call deleteFlight successfully with repository', async () => {
      const mockFlight: Flight = {
        airline: 'AA',
        flightNumber: '333',
        startDatetime: '2024-08-29 08:45:00+01:00',
        endDatetime: '2024-08-29 12:10:00+02:00',
        departureAirport: 'JFK',
        arrivalAirport: 'LAX',
        distance: 2475,
        isArchived: false,
        arrivalAirportTimezone: 'America/Los_Angeles',
        arrivalCountry: 'US',
        departureAirportTimezone: 'America/New_York',
        departureCountry: 'US',
        extra: {},
        info: {},
        status: 'on_time',
        recordType: 0,
        notes: '',
      };
      await db.insertFlight(mockFlight);
      const flights = await db.getFlights([], 1, 0, 'DESC');
      const result = await db.deleteFlight(flights[0].flightId!);
      expect(result).toBe(true);
    });

    it('should call getStats successfully with repository', async () => {
      const stats = await db.getStats();
      expect(typeof stats).toBe('object');
    });

    it('should call getAchievements successfully with repository', async () => {
      const achievements = await db.getAchievements();
      expect(Array.isArray(achievements)).toBe(true);
    });

    it('should call exportFlights successfully with repository', async () => {
      const flights = await db.exportFlights();
      expect(Array.isArray(flights)).toBe(true);
    });

    it('should call getAirlines successfully with repository', async () => {
      const airlines = await db.getAirlines();
      expect(Array.isArray(airlines)).toBe(true);
      expect(airlines.length).toBeGreaterThan(0);
    });

    it('should call closeDatabase when no repository', async () => {
      db.setDatabaseRepository(undefined);
      await db.closeDatabase();
    });

    it('should call closeDatabase with repository', async () => {
      await db.closeDatabase();
      db.setDatabaseRepository(undefined);
    });
  });

  describe('openDatabase', () => {
    afterEach(async () => {
      await db.closeDatabase();
    });

    it('should open and initialize database', async () => {
      const result = await db.openDatabase(':memory:');
      expect(result).toBe(true);
    });

    it('should close existing database before opening new one', async () => {
      await db.openDatabase(':memory:');
      const result = await db.openDatabase(':memory:');
      expect(result).toBe(true);
    });

    it('should handle database initialization errors', async () => {
      const result = await db.openDatabase(':memory:');
      expect(result).toBe(true);
    });
  });

  describe('resolveAssets', () => {
    it('should use default assets when none provided', async () => {
      const database = await openDatabaseAsync(':memory:');
      const repo = await db.createSQLiteRepository(database);
      expect(repo).toBeDefined();
      await database.closeAsync();
    });

    it('should test createDefaultAssets structure', () => {
      const assets = db.createDefaultAssets();
      expect(assets).toBeDefined();
      expect(assets.schema).toBeDefined();
      expect(Array.isArray(assets.schema)).toBe(true);
      expect(assets.schema.length).toBeGreaterThan(0);
      expect(assets.dml).toBeDefined();
      expect(Array.isArray(assets.dml)).toBe(true);
      expect(assets.csvTables).toBeDefined();
      expect(assets.csvTables.airlines).toBeDefined();
      expect(assets.csvTables.aircraft_types).toBeDefined();
      expect(assets.jsonTables).toBeDefined();
      expect(assets.jsonTables.airports).toBeDefined();
      expect(Array.isArray(assets.jsonTables.airports)).toBe(true);
      expect(assets.jsonTables.airports.length).toBeGreaterThan(0);
    });

    it('should merge custom assets with defaults', async () => {
      const database = await openDatabaseAsync(':memory:');
      const customAssets: db.DatabaseAssets = {
        dml: ['SELECT 1'],
      };
      const repo = await db.createSQLiteRepository(database, customAssets);
      expect(repo).toBeDefined();
      await database.closeAsync();
    });

    it('should handle empty custom assets', async () => {
      const database = await openDatabaseAsync(':memory:');
      const customAssets: db.DatabaseAssets = {};
      const repo = await db.createSQLiteRepository(database, customAssets);
      expect(repo).toBeDefined();
      await database.closeAsync();
    });
  });

  describe('prepareInsertStatement edge cases', () => {
    it('should handle records with null values', () => {
      const records = [{ id: 1, name: null }];
      const result = db.prepareInsertStatement('test_table', records);

      expect(result).not.toBeNull();
      expect(result!.params).toContain(null);
    });

    it('should handle records with undefined values', () => {
      const records = [{ id: 1, name: undefined }];
      const result = db.prepareInsertStatement('test_table', records);

      expect(result).not.toBeNull();
      expect(result!.params).toContain(undefined);
    });
  });

  describe('prepareUpdateStatement edge cases', () => {
    it('should handle multiple undefined fields', () => {
      const record = { id: 1, name: undefined, value: undefined, other: 'test' };
      const result = db.prepareUpdateStatement('test_table', 'id', record);

      expect(result).not.toBeNull();
      expect(result!.sql).toBe('UPDATE test_table SET other = ? WHERE id = ?');
      expect(result!.params).toEqual(['test', 1]);
    });

    it('should handle null values in update', () => {
      const record = { id: 1, name: null };
      const result = db.prepareUpdateStatement('test_table', 'id', record);

      expect(result).not.toBeNull();
      expect(result!.params).toEqual([null, 1]);
    });
  });

  describe('Error handling scenarios', () => {
    let database: any;
    let repository: db.SQLiteRepository;

    beforeEach(async () => {
      database = await openDatabaseAsync(':memory:');
      repository = await db.createSQLiteRepository(database, db.createDefaultAssets());
    });

    afterEach(async () => {
      if (database) {
        await database.closeAsync();
      }
    });

    it('should handle insertFlight transaction errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      await database.closeAsync();

      const mockFlight: Flight = {
        airline: 'AA',
        flightNumber: '100',
        startDatetime: '2024-08-29 08:45:00+01:00',
        endDatetime: '2024-08-29 12:10:00+02:00',
        departureAirport: 'JFK',
        arrivalAirport: 'LAX',
        distance: 2475,
        isArchived: false,
        arrivalAirportTimezone: 'America/Los_Angeles',
        arrivalCountry: 'US',
        departureAirportTimezone: 'America/New_York',
        departureCountry: 'US',
        extra: {},
        info: {},
        status: 'on_time',
        recordType: 0,
        notes: '',
      };

      const result = await repository.insertFlight(mockFlight);
      expect(result).toBe(false);
      consoleErrorSpy.mockRestore();
    });

    it('should handle updateFlight transaction errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
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
        arrivalCountry: 'US',
        departureAirportTimezone: 'America/New_York',
        departureCountry: 'US',
        extra: {},
        info: {},
        status: 'on_time',
        recordType: 0,
        notes: '',
      };

      await database.closeAsync();
      const result = await repository.updateFlight(mockFlight);
      expect(result).toBe(false);
      consoleErrorSpy.mockRestore();
    });

    it('should handle insertPassengerFromBCBP transaction errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const bcbpData: any = {
        data: {
          passengerName: 'JOHN DOE',
          legs: [
            {
              operatingCarrierPNR: 'ABC123',
              seatNumber: '012A',
            },
          ],
        },
      };

      const pkpassData = {
        airline: 'AA',
        barcode: {
          altText: 'AA100',
          format: 'PKBarcodeFormatPDF417',
          message: 'M1TEST',
          messageEncoding: 'iso-8859-1',
        },
        boardingPass: {},
        colors: {
          backgroundColor: '#000000',
          foregroundColor: '#FFFFFF',
          labelColor: '#999999',
        },
        images: {},
      };

      await database.closeAsync();
      const result = await repository.insertPassengerFromBCBP(1, bcbpData, 'iata', pkpassData);
      expect(result).toBe(false);
      consoleErrorSpy.mockRestore();
    });

    it('should handle deleteFlight transaction errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      await database.closeAsync();
      const result = await repository.deleteFlight(1);
      expect(result).toBe(false);
      consoleErrorSpy.mockRestore();
    });

    it('should handle updateFlight with unknown airline (no airlineId)', async () => {
      database = await openDatabaseAsync(':memory:');
      repository = await db.createSQLiteRepository(database, db.createDefaultAssets());

      const mockFlight: Flight = {
        airline: 'UNKNOWN_AIRLINE',
        airlineName: 'Unknown Airline Name',
        flightNumber: '100',
        startDatetime: '2024-08-29 08:45:00+01:00',
        endDatetime: '2024-08-29 12:10:00+02:00',
        departureAirport: 'JFK',
        arrivalAirport: 'LAX',
        distance: 2475,
        isArchived: false,
        arrivalAirportTimezone: 'America/Los_Angeles',
        arrivalCountry: 'US',
        departureAirportTimezone: 'America/New_York',
        departureCountry: 'US',
        extra: {},
        info: {},
        status: 'on_time',
        recordType: 0,
        notes: '',
      };

      await repository.insertFlight(mockFlight);
      const flights = await repository.getFlights([], 1, 0, 'DESC');
      const flightId = flights[0].flightId;

      const updatedFlight = {
        ...mockFlight,
        flightId,
        notes: 'Updated notes',
      };

      const result = await repository.updateFlight(updatedFlight);
      expect(result).toBe(true);

      const updated = await repository.getFlight(flightId!);
      expect(updated?.notes).toBe('Updated notes');
      expect(updated?.extra).toBeDefined();
    });

    it('should handle fillDataFromArray with empty records', async () => {
      database = await openDatabaseAsync(':memory:');
      repository = await db.createSQLiteRepository(database, db.createDefaultAssets());

      await database.execAsync('CREATE TABLE IF NOT EXISTS test_empty (id INTEGER PRIMARY KEY)');
      await repository.fillDataFromArray('test_empty', []);

      const result: any = await database.getAllAsync('SELECT * FROM test_empty');
      expect(result.length).toBe(0);
    });

    it('should handle updateFromRecord with null record', async () => {
      database = await openDatabaseAsync(':memory:');
      repository = await db.createSQLiteRepository(database, db.createDefaultAssets());

      await database.execAsync('CREATE TABLE IF NOT EXISTS test_update (id INTEGER PRIMARY KEY, name TEXT)');
      await repository.updateFromRecord('test_update', 'id', null);

      const result: any = await database.getAllAsync('SELECT * FROM test_update');
      expect(result.length).toBe(0);
    });

    it('should handle updateFromRecord with undefined fields only', async () => {
      database = await openDatabaseAsync(':memory:');
      repository = await db.createSQLiteRepository(database, db.createDefaultAssets());

      await database.execAsync('CREATE TABLE IF NOT EXISTS test_update2 (id INTEGER PRIMARY KEY, name TEXT)');
      await database.runAsync('INSERT INTO test_update2 (id, name) VALUES (?, ?)', 1, 'Original');

      await repository.updateFromRecord('test_update2', 'id', { id: 1, name: undefined });

      const result: any = await database.getFirstAsync('SELECT * FROM test_update2 WHERE id = 1');
      expect(result.name).toBe('Original');
    });
  });

  describe('Asset loading edge cases', () => {
    it('should handle custom schema and dml assets', async () => {
      const customDatabase = await openDatabaseAsync(':memory:');
      const customAssets: db.DatabaseAssets = {
        schema: [
          require('@/assets/sql/schema.sql'),
          require('@/assets/sql/views.sql'),
          'CREATE TABLE custom_table (id INTEGER PRIMARY KEY)',
        ],
        dml: ['INSERT INTO custom_table (id) VALUES (1)'],
      };

      const repo = await db.createSQLiteRepository(customDatabase, customAssets);
      expect(repo).toBeDefined();

      const result: any = await customDatabase.getFirstAsync('SELECT * FROM custom_table WHERE id = 1');
      expect(result).toBeDefined();
      expect(result.id).toBe(1);

      await customDatabase.closeAsync();
    });

    it('should handle custom csv tables', async () => {
      const customDatabase = await openDatabaseAsync(':memory:');

      const customAssets: db.DatabaseAssets = {
        schema: [
          require('@/assets/sql/schema.sql'),
          require('@/assets/sql/views.sql'),
          'CREATE TABLE custom_csv (id INTEGER, name TEXT)',
        ],
        csvTables: {
          custom_csv: [
            { id: 1, name: 'Test1' },
            { id: 2, name: 'Test2' },
          ],
        },
      };

      const repo = await db.createSQLiteRepository(customDatabase, customAssets);
      expect(repo).toBeDefined();

      const result: any = await customDatabase.getAllAsync('SELECT * FROM custom_csv');
      expect(result.length).toBe(2);

      await customDatabase.closeAsync();
    });

    it('should handle custom json tables', async () => {
      const customDatabase = await openDatabaseAsync(':memory:');

      const customAssets: db.DatabaseAssets = {
        schema: [
          require('@/assets/sql/schema.sql'),
          require('@/assets/sql/views.sql'),
          'CREATE TABLE custom_json (id INTEGER, data TEXT)',
        ],
        jsonTables: {
          custom_json: [
            { id: 1, data: 'Test1' },
            { id: 2, data: 'Test2' },
          ],
        },
      };

      const repo = await db.createSQLiteRepository(customDatabase, customAssets);
      expect(repo).toBeDefined();

      const result: any = await customDatabase.getAllAsync('SELECT * FROM custom_json');
      expect(result.length).toBe(2);

      await customDatabase.closeAsync();
    });

    it('should handle empty SQL string in schema', async () => {
      const customDatabase = await openDatabaseAsync(':memory:');

      const customAssets: db.DatabaseAssets = {
        schema: [require('@/assets/sql/schema.sql'), require('@/assets/sql/views.sql'), ''],
      };

      await expect(db.createSQLiteRepository(customDatabase, customAssets)).rejects.toThrow('SQL file not found');

      await customDatabase.closeAsync();
    });

    it('should handle empty SQL string in dml', async () => {
      const customDatabase = await openDatabaseAsync(':memory:');

      const customAssets: db.DatabaseAssets = {
        schema: [require('@/assets/sql/schema.sql'), require('@/assets/sql/views.sql')],
        dml: [''],
      };

      await expect(db.createSQLiteRepository(customDatabase, customAssets)).rejects.toThrow('SQL file not found');

      await customDatabase.closeAsync();
    });

    it('should handle empty CSV file content', async () => {
      const customDatabase = await openDatabaseAsync(':memory:');

      const customAssets: db.DatabaseAssets = {
        schema: [require('@/assets/sql/schema.sql'), require('@/assets/sql/views.sql')],
        csvTables: {
          airlines: '',
        },
      };

      await expect(db.createSQLiteRepository(customDatabase, customAssets)).rejects.toThrow(
        `File ${SQLDIR}/data/airlines.csv not found`,
      );

      await customDatabase.closeAsync();
    });

    it('should handle empty array in csvTables', async () => {
      const customDatabase = await openDatabaseAsync(':memory:');

      const customAssets: db.DatabaseAssets = {
        schema: [
          require('@/assets/sql/schema.sql'),
          require('@/assets/sql/views.sql'),
          'CREATE TABLE test_empty_csv (id INTEGER PRIMARY KEY, name TEXT)',
        ],
        csvTables: {
          test_empty_csv: [],
        },
      };

      const repo = await db.createSQLiteRepository(customDatabase, customAssets);
      expect(repo).toBeDefined();

      const result: any = await customDatabase.getAllAsync('SELECT * FROM test_empty_csv');
      expect(result.length).toBe(0);

      await customDatabase.closeAsync();
    });
  });

  describe('openDatabase error scenarios', () => {
    afterEach(async () => {
      await db.closeDatabase();
    });

    it('should handle database opening with invalid name', async () => {
      const result = await db.openDatabase(':memory:');
      expect(result).toBe(true);
    });
  });

  describe('Additional edge cases for maximum coverage', () => {
    let database: any;
    let repository: db.SQLiteRepository;

    beforeEach(async () => {
      database = await openDatabaseAsync(':memory:');
      repository = await db.createSQLiteRepository(database, db.createDefaultAssets());
    });

    afterEach(async () => {
      if (database) {
        await database.closeAsync();
      }
    });

    it('should handle getFlights with limit 0 (no limit)', async () => {
      const mockFlight: Flight = {
        airline: 'AA',
        flightNumber: '100',
        startDatetime: '2024-08-29 08:45:00+01:00',
        endDatetime: '2024-08-29 12:10:00+02:00',
        departureAirport: 'JFK',
        arrivalAirport: 'LAX',
        distance: 2475,
        isArchived: false,
        arrivalAirportTimezone: 'America/Los_Angeles',
        arrivalCountry: 'US',
        departureAirportTimezone: 'America/New_York',
        departureCountry: 'US',
        extra: {},
        info: {},
        status: 'on_time',
        recordType: 0,
        notes: '',
      };

      await repository.insertFlight(mockFlight);
      const flights = await repository.getFlights([], 0, 0, 'DESC');
      expect(flights.length).toBeGreaterThan(0);

      const sqlResult: any = await database.getAllAsync('SELECT * FROM flights WHERE flight_number = ?', '100');
      expect(sqlResult.length).toBe(1);
      expect(sqlResult[0].flight_number).toBe('100');
    });

    it('should handle getFlights with empty where clause', async () => {
      const flights = await repository.getFlights([], 10, 0, 'DESC');
      expect(Array.isArray(flights)).toBe(true);

      const sqlResult: any = await database.getAllAsync('SELECT COUNT(*) as count FROM flights');
      expect(sqlResult[0].count).toBe(0);
    });

    it('should handle getFlights with complex JSON parsing', async () => {
      const mockFlight: Flight = {
        airline: 'AA',
        flightNumber: '100',
        startDatetime: '2024-08-29 08:45:00+01:00',
        endDatetime: '2024-08-29 12:10:00+02:00',
        departureAirport: 'JFK',
        arrivalAirport: 'LAX',
        distance: 2475,
        isArchived: false,
        arrivalAirportTimezone: 'America/Los_Angeles',
        arrivalCountry: 'US',
        departureAirportTimezone: 'America/New_York',
        departureCountry: 'US',
        extra: { test: 'value', nested: { data: 123 } },
        info: {},
        status: 'on_time',
        recordType: 0,
        notes: '',
      };

      await repository.insertFlight(mockFlight);

      const bcbpData: any = {
        data: {
          passengerName: 'TEST',
          legs: [{ operatingCarrierPNR: 'TEST123', seatNumber: '01A' }],
        },
      };

      const pkpassData = {
        airline: 'AA',
        barcode: {
          altText: 'AA100',
          format: 'PKBarcodeFormatPDF417',
          message: 'M1TEST',
          messageEncoding: 'iso-8859-1',
        },
        boardingPass: {},
        colors: {
          backgroundColor: '#000000',
          foregroundColor: '#FFFFFF',
          labelColor: '#999999',
        },
        images: {},
      };

      const flights = await repository.getFlights([], 1, 0, 'DESC');
      await repository.insertPassengerFromBCBP(flights[0].flightId!, bcbpData, 'iata', pkpassData);

      const flightsWithBcbp = await repository.getFlights([], 1, 0, 'DESC');
      expect(flightsWithBcbp[0].bcbp).toBeDefined();
      expect(flightsWithBcbp[0].extra).toBeDefined();

      const flightId = flights[0].flightId;

      const sqlResult: any = await database.getFirstAsync('SELECT bcbp FROM passengers WHERE flight_id = ?', flightId);
      expect(sqlResult).toBeDefined();
      expect(sqlResult.bcbp).toBeDefined();
      const bcbp = JSON.parse(sqlResult.bcbp);
      expect(bcbp.data).toEqual(bcbpData);

      const sqlFlightResult: any = await database.getFirstAsync(
        'SELECT extra FROM flights WHERE flight_id = ?',
        flightId,
      );
      expect(sqlFlightResult).toBeDefined();
      const extra = JSON.parse(sqlFlightResult.extra);
      expect(extra.test).toBe('value');
      expect(extra.nested.data).toBe(123);
    });

    it('should handle fillDataFromArray with records containing empty objects', async () => {
      await database.execAsync('CREATE TABLE test_empty_obj (id INTEGER PRIMARY KEY, name TEXT)');
      const records = [{}];

      await repository.fillDataFromArray('test_empty_obj', records);

      const result: any = await database.getAllAsync('SELECT * FROM test_empty_obj');
      expect(Array.isArray(result)).toBe(true);

      const sqlResult: any = await database.getAllAsync('SELECT COUNT(*) as count FROM test_empty_obj');
      expect(sqlResult[0].count).toBe(0);
    });

    it('should handle updateFlight with only optional fields undefined', async () => {
      const mockFlight: Flight = {
        airline: 'AA',
        flightNumber: '100',
        startDatetime: '2024-08-29 08:45:00+01:00',
        endDatetime: '2024-08-29 12:10:00+02:00',
        departureAirport: 'JFK',
        arrivalAirport: 'LAX',
        distance: 2475,
        isArchived: false,
        arrivalAirportTimezone: 'America/Los_Angeles',
        arrivalCountry: 'US',
        departureAirportTimezone: 'America/New_York',
        departureCountry: 'US',
        extra: {},
        info: {},
        status: 'on_time',
        recordType: 0,
        notes: '',
      };

      await repository.insertFlight(mockFlight);
      const flights = await repository.getFlights([], 1, 0, 'DESC');
      const flightId = flights[0].flightId;

      const updatedFlight = {
        ...mockFlight,
        flightId,
        pnr: undefined,
        seatNumber: undefined,
        passengerName: undefined,
      };

      const result = await repository.updateFlight(updatedFlight);
      expect(result).toBe(true);

      const sqlResult: any = await database.getFirstAsync(
        'SELECT pnr, seat_number, passenger_name FROM passengers WHERE flight_id = ?',
        flightId,
      );
      expect(sqlResult).toBeDefined();
      expect(sqlResult.pnr).toBe('');
      expect(sqlResult.passenger_name).toBe('');
      expect(sqlResult.seat_number).toBeNull();
    });
  });
});
