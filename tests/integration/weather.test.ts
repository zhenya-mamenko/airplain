import { WEATHER_API_URL, settings } from '@/constants/settings';
import { SvgHeaveWind, SvgLightWind, SvgModerateWind } from '@/constants/svg/weather';
import { weatherIcons } from '@/constants/weather';
import { celciusToFahrenheit, fetch } from '@/helpers/common';
import { loadForecast, loadWeather, parseWeather } from '@/helpers/weather';

jest.mock('@/helpers/common', () => ({
  fetch: jest.fn(),
  celciusToFahrenheit: jest.fn((celsius: number) => (celsius * 9) / 5 + 32),
}));

jest.mock('@/constants/settings', () => ({
  __esModule: true,
  WEATHER_API_URL: 'https://example.com/api',
  settings: {
    TEMPERATURE_TYPE: 'temp',
    TEMPERATURE_UNITS: 'c',
    WEATHER_API_KEY: 'test-api-key',
  },
}));

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
const mockCelciusToFahrenheit = celciusToFahrenheit as jest.MockedFunction<typeof celciusToFahrenheit>;

describe('weather helper', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('parseWeather', () => {
    test('parseWeather return null if data is null', () => {
      const result = parseWeather(null, 'black');
      expect(result).toBeNull();
    });

    test('parseWeather return weather data with correct temperature and icons', () => {
      const data = {
        is_day: 1,
        condition: { code: 1000 },
        wind_kph: 25,
        temp_c: 15,
        temp_f: 59,
      };
      const result = parseWeather(data, 'black');
      expect(result).not.toBeNull();
      expect(result?.temperature).toBe(15);
      expect(result?.temperatureOut).toBe('+15°');
      expect(result?.icons.length).toBe(2);
      expect(result?.icons[0].type).toBe(weatherIcons.day['1000']);
      expect(result?.icons[1].type).toBe(SvgModerateWind);
      expect(result?.code).toBe(1000);
    });

    test('parseWeather return weather data with correct negative temperature', () => {
      const data = {
        is_day: 1,
        condition: { code: 1000 },
        wind_kph: 25,
        temp_c: -15,
        temp_f: 5,
      };
      const result = parseWeather(data, 'black');
      expect(result).not.toBeNull();
      expect(result?.temperature).toBe(-15);
      expect(result?.temperatureOut).toBe('–15°');
    });

    test('parseWeather return weather data with correct zero temperature', () => {
      const data = {
        is_day: 1,
        condition: { code: 1000 },
        wind_kph: 25,
        temp_c: 0,
        temp_f: 32,
      };
      const result = parseWeather(data, 'black');
      expect(result).not.toBeNull();
      expect(result?.temperature).toBe(0);
      expect(result?.temperatureOut).toBe('0°');
    });

    test('parseWeather return weather data with correct wind icons', () => {
      const data = {
        is_day: 1,
        condition: { code: 1000 },
        wind_kph: 50,
        temp_c: 15,
        temp_f: 59,
      };
      const result = parseWeather(data, 'black');
      expect(result).not.toBeNull();
      expect(result?.icons.length).toBe(2);
      expect(result?.icons[1].type).toBe(SvgHeaveWind);

      data.wind_kph = 30;
      const result2 = parseWeather(data, 'black');
      expect(result2).not.toBeNull();
      expect(result2?.icons.length).toBe(2);
      expect(result2?.icons[1].type).toBe(SvgModerateWind);

      data.wind_kph = 15;
      const result3 = parseWeather(data, 'black');
      expect(result3).not.toBeNull();
      expect(result3?.icons.length).toBe(2);
      expect(result3?.icons[1].type).toBe(SvgLightWind);

      data.wind_kph = 10;
      const result4 = parseWeather(data, 'black');
      expect(result4).not.toBeNull();
      expect(result4?.icons.length).toBe(1);
    });

    test('parseWeather return weather data with correct night icon', () => {
      const data = {
        is_day: 0,
        condition: { code: 1000 },
        wind_kph: 25,
        temp_c: 15,
        temp_f: 59,
      };
      const result = parseWeather(data, 'black');
      expect(result).not.toBeNull();
      expect(result?.icons.length).toBe(2);
      expect(result?.icons[0].type).toBe(weatherIcons.night['1000']);
    });

    test('parseWeather return weather data with multiple icons', () => {
      const data = {
        is_day: 1,
        condition: { code: 1087 },
        wind_kph: 25,
        temp_c: 15,
        temp_f: 59,
      };
      const result = parseWeather(data, 'black');
      expect(result).not.toBeNull();
      expect(result?.icons.length).toBe(3);
      expect(result?.icons[0].type).toBe(weatherIcons.day['1087'][0]);
      expect(result?.icons[1].type).toBe(weatherIcons.day['1087'][1]);
      expect(result?.icons[2].type).toBe(SvgModerateWind);
    });

    test('parseWeather use correct temperature type and units', () => {
      const data = {
        is_day: 1,
        condition: { code: 1000 },
        wind_kph: 25,
        temp_c: 15,
        temp_f: 59,
      };
      settings.TEMPERATURE_TYPE = 'temp';
      settings.TEMPERATURE_UNITS = 'f';
      const result = parseWeather(data, 'black');
      expect(result).not.toBeNull();
      expect(result?.temperature).toBe(59);
      expect(result?.temperatureOut).toBe('+59°');
    });
  });

  describe('loadWeather', () => {
    test('loadWeather return null if latitude or longitude is not provided', async () => {
      const result = await loadWeather(undefined as any, 20);
      expect(result).toBeNull();
      const result2 = await loadWeather(10, undefined as any);
      expect(result2).toBeNull();
    });

    test('loadWeather return null if fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));
      const result = await loadWeather(10, 20);
      expect(result).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        `${WEATHER_API_URL}/current.json?key=${settings.WEATHER_API_KEY}&aqi=no&q=10,20`,
        { timeout: 3000 },
      );
    });

    test('loadWeather return null if response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as any);
      const result = await loadWeather(10, 20);
      expect(result).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        `${WEATHER_API_URL}/current.json?key=${settings.WEATHER_API_KEY}&aqi=no&q=10,20`,
        { timeout: 3000 },
      );
    });

    test('loadWeather return weather data if the API call is successful', async () => {
      const mockWeatherData = {
        is_day: 1,
        condition: { code: 1000 },
        wind_kph: 25,
        temp_c: 15,
        temp_f: 59,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ current: mockWeatherData }),
      } as any);
      const result = await loadWeather(10, 20);
      expect(result).toEqual(mockWeatherData);
      expect(mockFetch).toHaveBeenCalledWith(
        `${WEATHER_API_URL}/current.json?key=${settings.WEATHER_API_KEY}&aqi=no&q=10,20`,
        { timeout: 3000 },
      );
    });

    test('loadWeather return null if WEATHER_API_KEY is not set', async () => {
      settings.WEATHER_API_KEY = '';
      const result = await loadWeather(10, 20);
      expect(result).toBeNull();
    });
  });

  describe('loadForecast', () => {
    beforeEach(() => {
      settings.WEATHER_API_KEY = 'test-api-key';
      mockCelciusToFahrenheit.mockClear();
    });

    test('loadForecast return null if required parameters are missing', async () => {
      const result1 = await loadForecast(undefined as any, 20, '2024-01-15', 12);
      expect(result1).toBeNull();

      const result2 = await loadForecast(10, undefined as any, '2024-01-15', 12);
      expect(result2).toBeNull();

      const result3 = await loadForecast(10, 20, undefined as any, 12);
      expect(result3).toBeNull();

      const result4 = await loadForecast(10, 20, '2024-01-15', undefined as any);
      expect(result4).toBeNull();
    });

    test('loadForecast return null if WEATHER_API_KEY is not set', async () => {
      settings.WEATHER_API_KEY = '';
      const result = await loadForecast(10, 20, '2024-01-15', 12);
      expect(result).toBeNull();
    });

    test('loadForecast return null if fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));
      const result = await loadForecast(10, 20, '2024-01-15', 12);
      expect(result).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        `${WEATHER_API_URL}/forecast.json?key=test-api-key&days=1&dt=2024-01-15&hour=12&alerts=no&aqi=no&q=10,20`,
        { timeout: 3000 },
      );
    });

    test('loadForecast return null if response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as any);
      const result = await loadForecast(10, 20, '2024-01-15', 12);
      expect(result).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        `${WEATHER_API_URL}/forecast.json?key=test-api-key&days=1&dt=2024-01-15&hour=12&alerts=no&aqi=no&q=10,20`,
        { timeout: 3000 },
      );
    });

    test('loadForecast return null if forecast data is missing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ forecast: {} }),
      } as any);
      const result = await loadForecast(10, 20, '2024-01-15', 12);
      expect(result).toBeNull();
    });

    test('loadForecast return forecast data with converted temperatures', async () => {
      const mockForecastData = {
        temp_c: 20,
        feelslike_c: 18,
        wind_kph: 15,
        condition: { code: 1000 },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          forecast: {
            forecastday: [
              {
                hour: [mockForecastData],
              },
            ],
          },
        }),
      } as any);

      const result = await loadForecast(10, 20, '2024-01-15', 12);

      expect(result).not.toBeNull();
      expect(result?.temp_c).toBe(20);
      expect(result?.feelslike_c).toBe(18);
      expect(result?.temp_f).toBe(68);
      expect(result?.feelslike_f).toBe(64.4);
      expect(result?.windchill_f).toBe(64.4);
      expect(mockCelciusToFahrenheit).toHaveBeenCalledTimes(3);
      expect(mockCelciusToFahrenheit).toHaveBeenCalledWith(20);
      expect(mockCelciusToFahrenheit).toHaveBeenCalledWith(18);
      expect(mockFetch).toHaveBeenCalledWith(
        `${WEATHER_API_URL}/forecast.json?key=test-api-key&days=1&dt=2024-01-15&hour=12&alerts=no&aqi=no&q=10,20`,
        { timeout: 3000 },
      );
    });
  });
});
