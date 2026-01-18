import {
  camelCase,
  fetch,
  flightToDepartingFlightData,
  flightToFlightData,
  flightToLandedFlightData,
  haversine,
  makeCheckInLink,
  readFileToString,
  snakeCase,
} from '@/helpers/common';

jest.mock('@/constants/settings', () => ({
  __esModule: true,
  getSetting: (s: string) => s,
}));

describe('common helper', () => {
  test('camelCase', () => {
    const obj = {
      test_key: 'test_value',
      test_key_2: 'test_value_2',
    };
    const result = camelCase(obj);
    expect(result).toEqual({
      testKey: 'test_value',
      testKey2: 'test_value_2',
    });
  });

  test('snakeCase', () => {
    const obj = {
      testKey: 'test_value',
      testKey2: 'test_value_2',
    };
    const result = snakeCase(obj);
    expect(result).toEqual({
      test_key: 'test_value',
      test_key2: 'test_value_2',
    });
  });

  test('flightToFlightData', () => {
    const flight = {
      actualEndDatetime: '2023-10-26T12:00:00Z',
      actualStartDatetime: '2023-10-26T10:00:00Z',
      airline: 'AA',
      arrivalAirport: 'JFK',
      arrivalAirportTimezone: 'America/New_York',
      departureAirport: 'LAX',
      departureAirportTimezone: 'America/Los_Angeles',
      distance: 2475,
      endDatetime: '2023-10-26T12:00:00Z',
      flightId: 1,
      flightNumber: '123',
      isArchived: false,
      info: {
        onlineCheckInOpen: true,
        onlineCheckInLink: 'https://example.com/checkin',
        state: 'boarding',
        stateTime: 10,
      },
      seatNumber: '1A',
      startDatetime: '2023-10-26T10:00:00Z',
      status: 'scheduled',
    };
    const result = flightToFlightData(flight as any);
    expect(result).toEqual({
      actualEndDatetime: 1698321600,
      actualStartDatetime: 1698314400,
      airline: 'AA',
      arrivalAirport: 'JFK',
      arrivalAirportTimezone: 'America/New_York',
      departureAirport: 'LAX',
      departureAirportTimezone: 'America/Los_Angeles',
      distance: 2475,
      endDatetime: 1698321600,
      flightId: 1,
      flightNumber: '123',
      isArchived: false,
      isOnlineCheckInOpen: true,
      onlineCheckInLink: 'https://example.com/checkin',
      seatNumber: '1A',
      startDatetime: 1698314400,
      status: 'scheduled',
      state: 'boarding',
      stateTime: 10,
    });
  });

  test('flightToFlightData with undefined actualDatetimes', () => {
    const flight = {
      airline: 'AA',
      arrivalAirport: 'JFK',
      arrivalAirportTimezone: 'America/New_York',
      departureAirport: 'LAX',
      departureAirportTimezone: 'America/Los_Angeles',
      distance: 2475,
      endDatetime: '2023-10-26T12:00:00Z',
      flightId: 1,
      flightNumber: '123',
      isArchived: false,
      info: {
        onlineCheckInOpen: false,
        state: 'boarding',
        stateTime: 10,
      },
      seatNumber: '1A',
      startDatetime: '2023-10-26T10:00:00Z',
      status: 'scheduled',
    };
    const result = flightToFlightData(flight as any);
    expect(result.actualEndDatetime).toBeUndefined();
    expect(result.actualStartDatetime).toBeUndefined();
  });

  test('flightToFlightData with undefined stateTime', () => {
    const flight = {
      actualEndDatetime: '2023-10-26T12:00:00Z',
      actualStartDatetime: '2023-10-26T10:00:00Z',
      airline: 'AA',
      arrivalAirport: 'JFK',
      arrivalAirportTimezone: 'America/New_York',
      departureAirport: 'LAX',
      departureAirportTimezone: 'America/Los_Angeles',
      distance: 2475,
      endDatetime: '2023-10-26T12:00:00Z',
      flightId: 1,
      flightNumber: '123',
      isArchived: false,
      info: {
        onlineCheckInOpen: true,
        onlineCheckInLink: 'https://example.com/checkin',
        state: 'boarding',
      },
      seatNumber: '1A',
      startDatetime: '2023-10-26T10:00:00Z',
      status: 'scheduled',
    };
    const result = flightToFlightData(flight as any);
    expect(result.stateTime).toBeUndefined();
  });

  test('flightToDepartingFlightData', () => {
    const flight = {
      actualEndDatetime: '2023-10-26T12:00:00Z',
      actualStartDatetime: '2023-10-26T10:00:00Z',
      airline: 'AA',
      arrivalAirport: 'JFK',
      arrivalAirportTimezone: 'America/New_York',
      arrivalTerminal: 'T4',
      bcbpPkpass: { data: 'test' },
      departureAirport: 'LAX',
      departureAirportTimezone: 'America/Los_Angeles',
      departureCheckInDesk: '123',
      departureGate: '42',
      departureTerminal: 'T1',
      distance: 2475,
      endDatetime: '2023-10-26T12:00:00Z',
      flightId: 1,
      flightNumber: '123',
      isArchived: false,
      info: {
        onlineCheckInOpen: true,
        onlineCheckInLink: 'https://example.com/checkin',
        state: 'boarding',
        stateTime: 10,
      },
      seatNumber: '1A',
      startDatetime: '2023-10-26T10:00:00Z',
      status: 'scheduled',
    };
    const result = flightToDepartingFlightData(flight as any);
    expect(result).toEqual({
      actualEndDatetime: 1698321600,
      actualStartDatetime: 1698314400,
      airline: 'AA',
      arrivalAirport: 'JFK',
      arrivalAirportTimezone: 'America/New_York',
      arrivalTerminal: 'T4',
      boardingPass: { data: 'test' },
      departureAirport: 'LAX',
      departureAirportTimezone: 'America/Los_Angeles',
      departureCheckInDesk: '123',
      departureGate: '42',
      departureTerminal: 'T1',
      distance: 2475,
      endDatetime: 1698321600,
      flightId: 1,
      flightNumber: '123',
      isArchived: false,
      isOnlineCheckInOpen: true,
      onlineCheckInLink: 'https://example.com/checkin',
      seatNumber: '1A',
      startDatetime: 1698314400,
      state: 'boarding',
      stateTime: 10,
      status: 'scheduled',
    });
  });

  test('flightToDepartingFlightData with undefined actualDatetimes and stateTime', () => {
    const flight = {
      airline: 'AA',
      arrivalAirport: 'JFK',
      arrivalAirportTimezone: 'America/New_York',
      arrivalTerminal: 'T4',
      bcbpPkpass: { data: 'test' },
      departureAirport: 'LAX',
      departureAirportTimezone: 'America/Los_Angeles',
      departureCheckInDesk: '123',
      departureGate: '42',
      departureTerminal: 'T1',
      distance: 2475,
      endDatetime: '2023-10-26T12:00:00Z',
      flightId: 1,
      flightNumber: '123',
      isArchived: false,
      info: {
        onlineCheckInOpen: false,
        state: 'boarding',
      },
      seatNumber: '1A',
      startDatetime: '2023-10-26T10:00:00Z',
      status: 'scheduled',
    };
    const result = flightToDepartingFlightData(flight as any);
    expect(result.actualEndDatetime).toBeUndefined();
    expect(result.actualStartDatetime).toBeUndefined();
    expect(result.stateTime).toBeUndefined();
  });

  test('flightToLandedFlightData', () => {
    const flight = {
      actualEndDatetime: '2023-10-26T12:00:00Z',
      actualStartDatetime: '2023-10-26T10:00:00Z',
      airline: 'AA',
      arrivalAirport: 'JFK',
      arrivalAirportTimezone: 'America/New_York',
      arrivalTerminal: 'T4',
      baggageBelt: '7',
      departureAirport: 'LAX',
      departureAirportTimezone: 'America/Los_Angeles',
      departureCheckInDesk: '123',
      departureGate: '42',
      departureTerminal: 'T1',
      distance: 2475,
      endDatetime: '2023-10-26T12:00:00Z',
      flightId: 1,
      flightNumber: '123',
      isArchived: false,
      isDifferentTimezone: true,
      startDatetime: '2023-10-26T10:00:00Z',
      status: 'scheduled',
    };
    const result = flightToLandedFlightData(flight as any);
    expect(result).toEqual({
      actualEndDatetime: 1698321600,
      actualStartDatetime: 1698314400,
      airline: 'AA',
      arrivalAirport: 'JFK',
      arrivalAirportTimezone: 'America/New_York',
      arrivalTerminal: 'T4',
      baggageBelt: '7',
      departureAirport: 'LAX',
      departureAirportTimezone: 'America/Los_Angeles',
      departureCheckInDesk: '123',
      departureGate: '42',
      departureTerminal: 'T1',
      distance: 2475,
      endDatetime: 1698321600,
      flightId: 1,
      flightNumber: '123',
      isArchived: false,
      isDifferentTimezone: true,
      startDatetime: 1698314400,
      status: 'scheduled',
    });
  });

  test('flightToLandedFlightData with undefined actualDatetimes', () => {
    const flight = {
      airline: 'AA',
      arrivalAirport: 'JFK',
      arrivalAirportTimezone: 'America/New_York',
      arrivalTerminal: 'T4',
      baggageBelt: '7',
      departureAirport: 'LAX',
      departureAirportTimezone: 'America/Los_Angeles',
      departureCheckInDesk: '123',
      departureGate: '42',
      departureTerminal: 'T1',
      distance: 2475,
      endDatetime: '2023-10-26T12:00:00Z',
      flightId: 1,
      flightNumber: '123',
      isArchived: false,
      isDifferentTimezone: true,
      startDatetime: '2023-10-26T10:00:00Z',
      status: 'scheduled',
    };
    const result = flightToLandedFlightData(flight as any);
    expect(result.actualEndDatetime).toBeUndefined();
    expect(result.actualStartDatetime).toBeUndefined();
  });

  test('haversine', () => {
    const lat1 = 40.7128;
    const lon1 = -74.006;
    const lat2 = 34.0522;
    const lon2 = -118.2437;
    const result = haversine(lat1, lon1, lat2, lon2);
    expect(result).toBeCloseTo(3935.74, 0);
  });

  test('makeCheckInLink', () => {
    const checkInLink =
      'https://example.com/checkin?DEP_DATE_EU={DEP_DATE_EU}&IATA_DEP={IATA_DEP}&FIRST={FIRST}&LAST={LAST}&PNR={PNR}&FLT_NO={FLT_NO}';
    const date = '2023-10-26';
    const departureAirport = 'LAX';
    const pnr = 'ABCDEF';
    const flightNumber = '123';
    const result = makeCheckInLink(checkInLink, date, departureAirport, pnr, flightNumber);
    expect(result).toBe(
      'https://example.com/checkin?DEP_DATE_EU=2023-10-26&IATA_DEP=LAX&FIRST=firstname&LAST=surname&PNR=ABCDEF&FLT_NO=123',
    );
  });

  test('makeCheckInLink with null PNR', () => {
    const checkInLink = 'https://example.com/checkin?pnr={PNR}';
    const result = makeCheckInLink(checkInLink, '2024-01-01', 'JFK', null as any, '123');
    expect(result).toBe('https://example.com/checkin?pnr=');
  });

  test('String.prototype.splice', () => {
    const str = 'hello world';

    expect(str.splice(6, 'аwesome')).toBe('hello аwesome');
    expect(str.splice(0, 'fckin')).toBe('fckin world');
    expect(str.splice(3, 'LO WO')).toBe('helLO WOrld');
  });
});

describe('readFileToString', () => {
  it('should return string value when file is loaded via Asset.loadAsync', async () => {
    const result = await readFileToString('CREATE TABLE test (id INTEGER)');
    expect(result).toBe('CREATE TABLE test (id INTEGER)');
  });

  it('should return null when file is empty string', async () => {
    const result = await readFileToString('');
    expect(result).toBe(null);
  });

  it('should return null when localUri is undefined', async () => {
    const result = await readFileToString(undefined as any);
    expect(result).toBe(null);
  });

  it('should return null when localUri is null', async () => {
    const result = await readFileToString(null as any);
    expect(result).toBe(null);
  });

  it('should call File.text() when file is an asset object', async () => {
    const result = await readFileToString(1);
    expect(result).toBe(1);
  });
});

describe('fetch', () => {
  let mockFetch: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    mockFetch.mockRestore();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should successfully fetch with default timeout', async () => {
    const mockResponse = { status: 200, json: async () => ({ data: 'test' }) };
    mockFetch.mockResolvedValue(mockResponse as any);

    const result = await fetch('https://example.com/api');

    expect(result).toBe(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/api', {
      signal: expect.any(AbortSignal),
    });
  });

  it('should successfully fetch with custom timeout', async () => {
    const mockResponse = { status: 200, json: async () => ({ data: 'test' }) };
    mockFetch.mockResolvedValue(mockResponse as any);

    const result = await fetch('https://example.com/api', { timeout: 10000 });

    expect(result).toBe(mockResponse);
  });

  it('should successfully fetch with custom fetch options', async () => {
    const mockResponse = { status: 200, json: async () => ({ data: 'test' }) };
    mockFetch.mockResolvedValue(mockResponse as any);

    const result = await fetch('https://example.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' }),
      timeout: 3000,
    });

    expect(result).toBe(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' }),
      signal: expect.any(AbortSignal),
    });
  });

  it('should abort fetch when timeout is reached', async () => {
    jest.useFakeTimers();

    const mockAbort = jest.fn();
    const mockController = {
      abort: mockAbort,
      signal: { aborted: false } as AbortSignal,
    };

    jest.spyOn(global, 'AbortController').mockImplementation(() => mockController as any);

    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ status: 200 } as any), 10000);
        }),
    );

    fetch('https://example.com');

    jest.advanceTimersByTime(5000);

    expect(mockAbort).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('should handle fetch errors', async () => {
    const mockError = new Error('Network error');
    mockFetch.mockRejectedValue(mockError);

    await expect(fetch('https://example.com/api')).rejects.toThrow('Network error');
  });

  it('should handle abort errors', async () => {
    jest.useFakeTimers();

    const mockAbort = jest.fn();
    const mockSignal = { aborted: false } as AbortSignal;
    const mockController = {
      abort: mockAbort,
      signal: mockSignal,
    };

    jest.spyOn(global, 'AbortController').mockImplementation(() => mockController as any);

    mockFetch.mockImplementation(() => {
      return Promise.reject(new DOMException('The operation was aborted', 'AbortError'));
    });

    const fetchPromise = fetch('https://example.com/api', { timeout: 100 });

    jest.advanceTimersByTime(100);

    await expect(fetchPromise).rejects.toThrow('The operation was aborted');

    jest.useRealTimers();
  });

  it('should pass empty options correctly', async () => {
    const mockResponse = { status: 200, json: async () => ({ data: 'test' }) };
    mockFetch.mockResolvedValue(mockResponse as any);

    const result = await fetch('https://example.com/api', {});

    expect(result).toBe(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        signal: expect.any(Object),
      }),
    );
  });

  it('should handle timeout value of 0', async () => {
    const mockResponse = { status: 200, json: async () => ({ data: 'test' }) };
    mockFetch.mockResolvedValue(mockResponse as any);

    const result = await fetch('https://example.com/api', { timeout: 0 });

    expect(result).toBe(mockResponse);
  });
});
