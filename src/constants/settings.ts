import Storage from 'expo-sqlite/kv-store';
import { nativeApplicationVersion } from 'expo-application';


export function setSetting(key: string, value: string) {
  Storage.setItemSync(key, value);
}

export function getSetting(key: string, defaultValue?: string): string {
  return Storage.getItemSync(key) ?? defaultValue ?? '';
}

export function deleteSetting(key: string) {
  Storage.removeItemSync(key);
}


export const APP_VERSION = nativeApplicationVersion ?? '0.0.1';

export const WEATHER_API_URL = process.env.EXPO_PUBLIC_WEATHER_API_URL;
export const AEDBX_API_URL = process.env.EXPO_PUBLIC_AEDBX_API_URL;
export const AEROAPI_API_URL = process.env.EXPO_PUBLIC_AEROAPI_API_URL;

export const DBNAME = 'airplain.db';
export const SQLDIR = '@/assets/sql';

export const settings = {
  TEMPERATURE_UNITS: getSetting('TEMPERATURE_UNITS', 'c'),
  TEMPERATURE_TYPE: getSetting('TEMPERATURE_TYPE', 'feelslike'),

  WEATHER_API_KEY: getSetting('WEATHER_API_KEY',  process.env.EXPO_PUBLIC_WEATHER_API_KEY),

  AEDBX_API_KEY: getSetting('AEDBX_API_KEY', process.env.EXPO_PUBLIC_AEDBX_API_KEY),
  AEROAPI_API_KEY: getSetting('AEROAPI_API_KEY', process.env.EXPO_PUBLIC_AEROAPI_API_KEY),
  CURRENT_API: getSetting('CURRENT_API', 'aerodatabox'),

  REFRESH_INTERVAL: parseInt(getSetting('REFRESH_INTERVAL', '1')),
  FLIGHTS_LIMIT: parseInt(getSetting('FLIGHTS_LIMIT', '1000')),
  ONLY_MANUAL_REFRESH: getSetting('ONLY_MANUAL_REFRESH', 'true'),
  FORCE_REQUEST_API_ON_MANUAL_REFRESH: getSetting('FORCE_REQUEST_API_ON_MANUAL_REFRESH', 'false'),
}
