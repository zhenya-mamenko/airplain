import { camelCase, snakeCase, flightToFlightData, flightToDepartingFlightData, flightToLandedFlightData, haversine, makeCheckInLink } from '@/helpers/common';


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

  test('haversine', () => {
    const lat1 = 40.7128;
    const lon1 = -74.0060;
    const lat2 = 34.0522;
    const lon2 = -118.2437;
    const result = haversine(lat1, lon1, lat2, lon2);
    expect(result).toBeCloseTo(3935.74, 0);
  });

  test('makeCheckInLink', () => {
    const checkInLink = 'https://example.com/checkin?DEP_DATE_EU={DEP_DATE_EU}&IATA_DEP={IATA_DEP}&FIRST={FIRST}&LAST={LAST}&PNR={PNR}&FLT_NO={FLT_NO}';
    const date = '2023-10-26';
    const departureAirport = 'LAX';
    const pnr = 'ABCDEF';
    const flightNumber = '123';
    const result = makeCheckInLink(checkInLink, date, departureAirport, pnr, flightNumber);
    expect(result).toBe('https://example.com/checkin?DEP_DATE_EU=2023-10-26&IATA_DEP=LAX&FIRST=firstname&LAST=surname&PNR=ABCDEF&FLT_NO=123');
  });

  test('String.prototype.splice', () => {
    const str = 'hello world';

    expect(str.splice(6, 'аwesome')).toBe('hello аwesome');
    expect(str.splice(0, 'fckin')).toBe('fckin world');
    expect(str.splice(3, 'LO WO')).toBe('helLO WOrld');
  });

});
