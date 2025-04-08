import { getAirportData, loadAirlines, getAirlineData, getAirlinesData, airlineLogoUri } from '@/helpers/airdata';


const mockedAirlines = [
  {
    airlineId: 175,
    airlineCode: "BA",
    airlineName: "British Airways",
    checkInLink: "https://www.britishairways.com/travel/olcilandingpageauthreq/public/en_gb/device-mobile",
    checkInTime: 24
  },
  {
    airlineId: 406,
    airlineCode: "F9",
    airlineName: "Frontier Airlines",
    checkInLink: "https://www.flyfrontier.com/travel/my-trips/manage-trip/",
    checkInTime: 24
  }
];

jest.mock('@/helpers/sqlite', () => ({
  __esModule: true,
  getAirlines: async () => mockedAirlines,
  getActualFlights: async () => [],
  archiveFlight: jest.fn(),
  updateFlight: jest.fn(),
}));

jest.mock('@/constants/settings', () => ({
  __esModule: true,
  deleteSetting: jest.fn(),
  getSetting: jest.fn(),
  setSetting: jest.fn(),
  settings: {}
}));

jest.mock('@/helpers/common', () => ({
  __esModule: true,
  stopBackgroundTask: jest.fn(),
  makeCheckInLink: jest.fn(),
}));

jest.mock('@/helpers/flights', () => ({
  __esModule: true,
  getFlightData: async () => null,
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: {
    DEFAULT: 1
  },
  AndroidNotificationVisibility: {
    PUBLIC: 1
  },
}));


describe('airdata helper', () => {

  loadAirlines();

  test('getAirportData', () => {
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
    const airportUnknown = getAirportData('XXX');
    expect(airportUnknown).toBeUndefined();
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
    expect(airlineLogoUri('BA')).toEqual({ uri: 'https://images.kiwi.com/airlines/64x64/BA.png' });
    expect(airlineLogoUri('BA', true)).toBe('https://images.kiwi.com/airlines/64x64/BA.png');
  });

});
