import { parseWeather, loadWeather } from '@/helpers/weather';
import { fetch } from '@/helpers/common';
import {
  SvgLightWind,
  SvgModerateWind,
  SvgHeaveWind,
} from '@/constants/svg/weather';
import { weatherIcons } from '@/constants/weather';
import { settings, WEATHER_API_URL } from '@/constants/settings';

jest.mock('@/helpers/common', () => ({
  fetch: jest.fn(),
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
        current: {
          is_day: 1,
          condition: { code: 1000 },
          wind_kph: 25,
          temp_c: 15,
          temp_f: 59,
        },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockWeatherData),
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
});
