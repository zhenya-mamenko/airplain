import { processExportData, processImportData } from '@/helpers/import-export';

jest.mock('@/helpers/sqlite', () => ({
  __esModule: true,
  isFlightExists: jest.fn(),
}));

const mockedAirlines = [
  {
    airlineId: 175,
    airlineCode: 'BA',
    airlineName: 'British Airways',
    checkInLink:
      'https://www.britishairways.com/travel/olcilandingpageauthreq/public/en_gb/device-mobile',
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

jest.mock('@/helpers/airdata', () => ({
  __esModule: true,
  getAirlineData: jest.fn((code: string) =>
    mockedAirlines.find((x) => x.airlineCode === code),
  ),
}));

import { isFlightExists } from '@/helpers/sqlite';

const mockedIsFlightExists = jest.mocked(isFlightExists);

describe('processExportData', () => {
  it('should return empty string for empty flights array', () => {
    const result = processExportData([]);
    expect(result).toBe('');
  });

  it('should export data correctly excluding specified fields', () => {
    const flights = [
      {
        flight_id: 1,
        airline_id: 2,
        airline_name: 'Test Airline',
        is_archived: 0,
        record_type: 0,
        extra: 'extra',
        notes: 'notes',
        check_in_link: 'link',
        check_in_time: 'time',
        departure_airport: 'JFK',
        arrival_airport: 'LAX',
        status: 'arrived',
      },
    ];
    const result = processExportData(flights);
    expect(result).toBe(
      'departure_airport,arrival_airport,status\nJFK,LAX,arrived',
    );
  });

  it('should handle multiple flights', () => {
    const flights = [
      { departure_airport: 'JFK', arrival_airport: 'LAX', status: 'arrived' },
      { departure_airport: 'LAX', arrival_airport: 'SFO', status: 'scheduled' },
    ];
    const result = processExportData(flights);
    expect(result).toBe(
      'departure_airport,arrival_airport,status\nJFK,LAX,arrived\nLAX,SFO,scheduled',
    );
  });

  it('should exclude specified fields from export', () => {
    const flights = [
      {
        flight_id: 1,
        airline_id: 2,
        airline_name: 'Test Airline',
        is_archived: 0,
        record_type: 0,
        extra: 'extra',
        notes: 'notes',
        check_in_link: 'link',
        check_in_time: 'time',
        departure_airport: 'JFK',
        arrival_airport: 'LAX',
        status: 'arrived',
      },
    ];
    const result = processExportData(flights);
    const lines = result.split('\n');
    const headers = lines[0].split(',');
    const excludedFields = [
      'flight_id',
      'airline_id',
      'airline_name',
      'is_archived',
      'record_type',
      'extra',
      'notes',
      'check_in_link',
      'check_in_time',
    ];
    excludedFields.forEach((field) => {
      expect(headers).not.toContain(field);
    });
  });
});

describe('processImportData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array for empty records', async () => {
    const result = await processImportData([]);
    expect(result).toEqual([]);
  });

  it('should process valid record correctly', async () => {
    mockedIsFlightExists.mockResolvedValue(0);

    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        departure_airport_timezone: 'EST',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        arrival_airport_timezone: 'PST',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
        actual_end_datetime: '2023-01-01T13:00:00Z',
        actual_start_datetime: '2023-01-01T10:00:00Z',
        departure_terminal: 'T1',
        departure_check_in_desk: 'D1',
        departure_gate: 'G1',
        arrival_terminal: 'T2',
        baggage_belt: 'B1',
        aircraft_type: 'Boeing 737',
        aircraft_reg_number: 'N123AA',
        status: 'arrived',
      },
    ];

    const result = await processImportData(records);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      flight_number: '123',
      departure_airport: 'JFK',
      arrival_airport: 'LAX',
      airline_id: 175,
      status: 'arrived',
      record_type: 0,
      is_archived: 1,
    });
  });

  it('should skip record with invalid airline length', async () => {
    const records = [
      {
        airline: 'AAA', // Invalid length
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
      },
    ];

    const result = await processImportData(records);
    expect(result).toEqual([]);
  });

  it('should skip record with invalid airport length', async () => {
    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JF', // Invalid length
        departure_country: 'US',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
      },
    ];

    const result = await processImportData(records);
    expect(result).toEqual([]);
  });

  it('should skip record with invalid start_datetime', async () => {
    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        start_datetime: 'invalid-date',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
      },
    ];

    const result = await processImportData(records);
    expect(result).toEqual([]);
  });

  it('should skip record with invalid end_datetime', async () => {
    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: 'invalid-date',
        distance: '2475',
      },
    ];

    const result = await processImportData(records);
    expect(result).toEqual([]);
  });

  it('should skip record if flight already exists', async () => {
    mockedIsFlightExists.mockResolvedValue(1);

    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
      },
    ];

    const result = await processImportData(records);
    expect(result).toEqual([]);
  });

  it('should handle missing airline data', async () => {
    mockedIsFlightExists.mockResolvedValue(0);

    const records = [
      {
        airline: 'AA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        departure_airport_timezone: 'EST',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        arrival_airport_timezone: 'PST',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
      },
    ];

    const result = await processImportData(records);
    expect(result[0].airline_id).toBeNull();
    expect(result[0].extra).toBe('{"airline":"AA","airline_name":"AA"}');
  });

  it('should set default status and archive based on dates', async () => {
    mockedIsFlightExists.mockResolvedValue(0);

    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        departure_airport_timezone: 'EST',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        arrival_airport_timezone: 'PST',
        start_datetime: pastDate,
        end_datetime: pastDate,
        distance: '2475',
      },
    ];

    const result = await processImportData(records);
    expect(result[0].status).toBe('scheduled');
    expect(result[0].is_archived).toBe(1);
  });

  it('should set default status to arrived for future flights', async () => {
    mockedIsFlightExists.mockResolvedValue(0);

    const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        departure_airport_timezone: 'EST',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        arrival_airport_timezone: 'PST',
        start_datetime: futureDate,
        end_datetime: futureDate,
        distance: '2475',
      },
    ];

    const result = await processImportData(records);
    expect(result[0].status).toBe('arrived');
    expect(result[0].is_archived).toBe(0);
  });

  it('should preserve canceled status', async () => {
    mockedIsFlightExists.mockResolvedValue(0);

    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        departure_airport_timezone: 'EST',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        arrival_airport_timezone: 'PST',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
        status: 'canceled',
      },
    ];

    const result = await processImportData(records);
    expect(result[0].status).toBe('canceled');
  });

  it('should preserve diverted status', async () => {
    mockedIsFlightExists.mockResolvedValue(0);

    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        departure_airport_timezone: 'EST',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        arrival_airport_timezone: 'PST',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
        status: 'diverted',
      },
    ];

    const result = await processImportData(records);
    expect(result[0].status).toBe('diverted');
  });

  it('should skip record with invalid departure_airport length', async () => {
    mockedIsFlightExists.mockResolvedValue(0);

    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JF', // invalid length 2
        departure_country: 'US',
        departure_airport_timezone: 'EST',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        arrival_airport_timezone: 'PST',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
      },
    ];

    const result = await processImportData(records);
    expect(result).toEqual([]);
  });

  it('should skip record with invalid arrival_airport length', async () => {
    mockedIsFlightExists.mockResolvedValue(0);

    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        departure_airport_timezone: 'EST',
        arrival_airport: 'LA', // invalid length 2
        arrival_country: 'US',
        arrival_airport_timezone: 'PST',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
      },
    ];

    const result = await processImportData(records);
    expect(result).toEqual([]);
  });

  it('should skip record with invalid departure_country length', async () => {
    mockedIsFlightExists.mockResolvedValue(0);

    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'U', // invalid length 1
        departure_airport_timezone: 'EST',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        arrival_airport_timezone: 'PST',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
      },
    ];

    const result = await processImportData(records);
    expect(result).toEqual([]);
  });

  it('should skip record with invalid arrival_country length', async () => {
    mockedIsFlightExists.mockResolvedValue(0);

    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        departure_airport_timezone: 'EST',
        arrival_airport: 'LAX',
        arrival_country: 'U', // invalid length 1
        arrival_airport_timezone: 'PST',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
      },
    ];

    const result = await processImportData(records);
    expect(result).toEqual([]);
  });

  it('should only include fields from const fields in result', async () => {
    mockedIsFlightExists.mockResolvedValue(0);

    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        departure_airport_timezone: 'EST',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        arrival_airport_timezone: 'PST',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
        extra_field: 'should be removed',
      },
    ];

    const result = await processImportData(records);
    expect(result[0]).not.toHaveProperty('extra_field');
    expect(result[0]).toHaveProperty('airline_id');
    expect(result[0]).toHaveProperty('status');
  });

  it('should skip record with missing required fields', async () => {
    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        // Missing departure_airport, etc.
        arrival_airport: 'LAX',
        arrival_country: 'US',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
      },
    ];
    const result = await processImportData(records);
    expect(result).toEqual([]);
  });

  it('should set distance to 0 for invalid distance', async () => {
    mockedIsFlightExists.mockResolvedValue(0);
    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        departure_airport_timezone: 'EST',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        arrival_airport_timezone: 'PST',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: 'invalid',
      },
    ];
    const result = await processImportData(records);
    expect(result[0].distance).toBe(0);
  });

  it('should skip record with invalid actual_start_datetime', async () => {
    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        departure_airport_timezone: 'EST',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        arrival_airport_timezone: 'PST',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
        actual_start_datetime: 'invalid-date',
      },
    ];
    const result = await processImportData(records);
    expect(result).toEqual([]);
  });

  it('should skip record with invalid actual_end_datetime', async () => {
    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        departure_airport_timezone: 'EST',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        arrival_airport_timezone: 'PST',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
        actual_end_datetime: 'invalid-date',
      },
    ];
    const result = await processImportData(records);
    expect(result).toEqual([]);
  });

  it('should set actual_start_datetime from start_datetime if missing', async () => {
    mockedIsFlightExists.mockResolvedValue(0);
    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        departure_airport_timezone: 'EST',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        arrival_airport_timezone: 'PST',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
        // actual_start_datetime missing
      },
    ];
    const result = await processImportData(records);
    expect(result[0].actual_start_datetime).toBe('2023-01-01T10:00:00Z');
  });

  it('should set actual_end_datetime from end_datetime if missing', async () => {
    mockedIsFlightExists.mockResolvedValue(0);
    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        departure_airport_timezone: 'EST',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        arrival_airport_timezone: 'PST',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
        // actual_end_datetime missing
      },
    ];
    const result = await processImportData(records);
    expect(result[0].actual_end_datetime).toBe('2023-01-01T13:00:00Z');
  });

  it('should set status to arrived for invalid status', async () => {
    mockedIsFlightExists.mockResolvedValue(0);
    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        departure_airport_timezone: 'EST',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        arrival_airport_timezone: 'PST',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
        status: 'invalid-status',
      },
    ];
    const result = await processImportData(records);
    expect(result[0].status).toBe('arrived');
  });

  it('should delete null or undefined fields', async () => {
    mockedIsFlightExists.mockResolvedValue(0);
    const records = [
      {
        airline: 'BA',
        flight_number: '123',
        departure_airport: 'JFK',
        departure_country: 'US',
        departure_airport_timezone: 'EST',
        arrival_airport: 'LAX',
        arrival_country: 'US',
        arrival_airport_timezone: 'PST',
        start_datetime: '2023-01-01T10:00:00Z',
        end_datetime: '2023-01-01T13:00:00Z',
        distance: '2475',
        departure_terminal: null,
        baggage_belt: undefined,
        aircraft_type: 'null',
      },
    ];
    const result = await processImportData(records);
    expect(result[0]).not.toHaveProperty('departure_terminal');
    expect(result[0]).not.toHaveProperty('baggage_belt');
    expect(result[0]).not.toHaveProperty('aircraft_type');
  });
});
