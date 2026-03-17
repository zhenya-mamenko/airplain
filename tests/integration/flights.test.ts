import NetInfo from '@react-native-community/netinfo';

import * as aerodatabox from '@/helpers/flights/aerodatabox';
import * as aeroapi from '@/helpers/flights/flightaware';
import { getFlightData, getLastFlightDataError, testApiConnection } from '@/helpers/flights/index';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(),
  },
}));

jest.mock('@/constants/settings', () => ({
  AEDBX_API_URL: 'https://aedbx.example/api',
  AEROAPI_API_URL: 'https://aeroapi.example/api',
  settings: {
    AEDBX_API_KEY: 'aedbx-key',
    AEROAPI_API_KEY: 'aeroapi-key',
    CURRENT_API: 'aerodatabox',
  },
}));

jest.mock('@/helpers/flights/aerodatabox', () => ({
  checkApi: jest.fn(),
  getFlightData: jest.fn(),
  getLastFlightDataError: jest.fn(),
}));

jest.mock('@/helpers/flights/flightaware', () => ({
  checkApi: jest.fn(),
  getFlightData: jest.fn(),
  getLastFlightDataError: jest.fn(),
}));

const mockedNetInfoFetch = NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>;
const mockedAerodataboxCheckApi = aerodatabox.checkApi as jest.MockedFunction<typeof aerodatabox.checkApi>;
const mockedAerodataboxGetFlightData = aerodatabox.getFlightData as jest.MockedFunction<
  typeof aerodatabox.getFlightData
>;
const mockedAerodataboxGetLastFlightDataError = aerodatabox.getLastFlightDataError as jest.MockedFunction<
  typeof aerodatabox.getLastFlightDataError
>;
const mockedAeroapiCheckApi = aeroapi.checkApi as jest.MockedFunction<typeof aeroapi.checkApi>;
const mockedAeroapiGetFlightData = aeroapi.getFlightData as jest.MockedFunction<typeof aeroapi.getFlightData>;
const mockedAeroapiGetLastFlightDataError = aeroapi.getLastFlightDataError as jest.MockedFunction<
  typeof aeroapi.getLastFlightDataError
>;

describe('Flights API facade', () => {
  beforeEach(() => {
    mockedNetInfoFetch.mockResolvedValue({ isConnected: true } as any);

    mockedAerodataboxCheckApi.mockReset();
    mockedAerodataboxGetFlightData.mockReset();
    mockedAerodataboxGetLastFlightDataError.mockReset();
    mockedAeroapiCheckApi.mockReset();
    mockedAeroapiGetFlightData.mockReset();
    mockedAeroapiGetLastFlightDataError.mockReset();

    mockedAerodataboxGetLastFlightDataError.mockReturnValue(null);
    mockedAeroapiGetLastFlightDataError.mockReturnValue(null);
  });

  test('fallbacks to aerodatabox getFlightData when CURRENT_API is invalid', async () => {
    const { settings } = jest.requireMock('@/constants/settings');
    settings.CURRENT_API = 'invalid-provider';

    mockedAerodataboxGetFlightData.mockResolvedValue(null);

    await getFlightData('AA', '123', '2024-01-01');

    expect(mockedAerodataboxGetFlightData).toHaveBeenCalledWith(
      'AA',
      '123',
      '2024-01-01',
      'https://aedbx.example/api',
      'aedbx-key',
    );
    expect(mockedAeroapiGetFlightData).not.toHaveBeenCalled();
  });

  test('fallbacks to aerodatabox checkApi when CURRENT_API is invalid', async () => {
    const { settings } = jest.requireMock('@/constants/settings');
    settings.CURRENT_API = 'invalid-provider';

    mockedAerodataboxCheckApi.mockResolvedValue(true);

    const result = await testApiConnection();

    expect(result).toBe(true);
    expect(mockedAerodataboxCheckApi).toHaveBeenCalledWith('https://aedbx.example/api', 'aedbx-key');
    expect(mockedAeroapiCheckApi).not.toHaveBeenCalled();
  });

  test('stores unauthorized error reason from selected provider', async () => {
    const { settings } = jest.requireMock('@/constants/settings');
    settings.CURRENT_API = 'aerodatabox';

    mockedAerodataboxGetFlightData.mockResolvedValue(null);
    mockedAerodataboxGetLastFlightDataError.mockReturnValue('unauthorized');

    await getFlightData('AA', '123', '2024-01-01');

    expect(getLastFlightDataError()).toBe('unauthorized');
  });

  test('stores offline error reason when network is unavailable', async () => {
    mockedNetInfoFetch.mockResolvedValue({ isConnected: false } as any);

    await getFlightData('AA', '123', '2024-01-01');

    expect(getLastFlightDataError()).toBe('offline');
    expect(mockedAerodataboxGetFlightData).not.toHaveBeenCalled();
    expect(mockedAeroapiGetFlightData).not.toHaveBeenCalled();
  });

  test('stores offline error reason when connection exists but internet is unreachable', async () => {
    mockedNetInfoFetch.mockResolvedValue({ isConnected: true, isInternetReachable: false } as any);

    await getFlightData('AA', '123', '2024-01-01');

    expect(getLastFlightDataError()).toBe('offline');
    expect(mockedAerodataboxGetFlightData).not.toHaveBeenCalled();
    expect(mockedAeroapiGetFlightData).not.toHaveBeenCalled();
  });

  test('testApiConnection uses runtime apiName and key overrides', async () => {
    mockedAeroapiCheckApi.mockResolvedValue(true);

    const result = await testApiConnection({
      apiName: 'aeroapi',
      aeroapiApiKey: 'unsaved-runtime-key',
    });

    expect(result).toBe(true);
    expect(mockedAeroapiCheckApi).toHaveBeenCalledWith('https://aeroapi.example/api', 'unsaved-runtime-key');
    expect(mockedAerodataboxCheckApi).not.toHaveBeenCalled();
  });

  test('testApiConnection returns false when internet is unreachable', async () => {
    mockedNetInfoFetch.mockResolvedValue({ isConnected: true, isInternetReachable: false } as any);

    const result = await testApiConnection();

    expect(result).toBe(false);
    expect(mockedAerodataboxCheckApi).not.toHaveBeenCalled();
    expect(mockedAeroapiCheckApi).not.toHaveBeenCalled();
  });
});
