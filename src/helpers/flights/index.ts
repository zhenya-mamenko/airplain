import NetInfo from '@react-native-community/netinfo';

import { AEDBX_API_URL, AEDBX_RAPID_API_URL, AEROAPI_API_URL, settings } from '@/constants/settings';
import * as aerodatabox from '@/helpers/flights/aerodatabox';
import * as aeroapi from '@/helpers/flights/flightaware';
import type { Flight } from '@/types';

export type FlightDataErrorType = 'unauthorized' | 'offline' | 'request_failed' | null;

let lastFlightDataError: FlightDataErrorType = null;

export function getLastFlightDataError(): FlightDataErrorType {
  return lastFlightDataError;
}

interface ApiData {
  url: string | undefined;
  module: any;
  headers: { [key: string]: string };
}

interface ApiOverrides {
  aerodataboxApiKey?: string;
  aeroapiApiKey?: string;
  aerodataboxRapidApiKey?: string;
}

const apiList: { [key: string]: () => ApiData } = {
  aerodatabox: (): ApiData => ({
    url: AEDBX_API_URL,
    module: aerodatabox,
    headers: {
      'x-magicapi-key': settings.AEDBX_API_KEY,
    },
  }),
  aeroapi: (): ApiData => ({
    url: AEROAPI_API_URL,
    module: aeroapi,
    headers: {
      'x-apikey': settings.AEROAPI_API_KEY,
    },
  }),
  aerodatabox_rapid: (): ApiData => ({
    url: AEDBX_RAPID_API_URL,
    module: aerodatabox,
    headers: {
      'x-rapidapi-key': settings.AEDBX_RAPID_API_KEY,
      'x-rapidapi-host': AEDBX_RAPID_API_URL!.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    },
  }),
};

function getApi(name: string = settings.CURRENT_API, overrides?: ApiOverrides): ApiData | null {
  const apiFactory = apiList[name] ?? apiList.aerodatabox;
  if (!apiFactory) {
    return null;
  }
  const api = apiFactory();
  switch (name) {
    case 'aerodatabox':
      api.headers['x-magicapi-key'] =
        overrides?.aerodataboxApiKey !== undefined ? overrides.aerodataboxApiKey : settings.AEDBX_API_KEY;
      break;
    case 'aeroapi':
      api.headers['x-apikey'] =
        overrides?.aeroapiApiKey !== undefined ? overrides.aeroapiApiKey : settings.AEROAPI_API_KEY;
      break;
    case 'aerodatabox_rapid':
      api.headers['x-rapidapi-key'] =
        overrides?.aerodataboxRapidApiKey !== undefined
          ? overrides.aerodataboxRapidApiKey
          : settings.AEDBX_RAPID_API_KEY;
      break;
  }

  if (!api?.url) {
    return null;
  }
  return api;
}

export const getFlightData = async (airline: string, flightNumber: string, date: string): Promise<Flight | null> => {
  lastFlightDataError = null;
  console.debug(`Fetching flight data from API: ${airline} ${flightNumber} ${date}`);
  const state = await NetInfo.fetch();
  if (!state.isConnected || state.isInternetReachable === false) {
    lastFlightDataError = 'offline';
    return null;
  }
  const api = getApi();
  if (!api || !api.url || !api.module) {
    lastFlightDataError = 'request_failed';
    return null;
  }
  const result = await api.module.getFlightData(airline, flightNumber, date, api.url, api.headers);
  if (result) {
    return result;
  }
  if (typeof api.module.getLastFlightDataError === 'function') {
    lastFlightDataError = api.module.getLastFlightDataError();
  } else {
    lastFlightDataError = 'request_failed';
  }
  return null;
};

export const testApiConnection = async (options?: {
  apiName?: string;
  aerodataboxApiKey?: string;
  aeroapiApiKey?: string;
  aerodataboxRapidApiKey?: string;
}): Promise<boolean> => {
  console.debug(`Testing network`);
  const state = await NetInfo.fetch();
  if (!state.isConnected || state.isInternetReachable === false) {
    return false;
  }
  console.debug(`Network state: ${JSON.stringify(state)}`);
  const api = getApi(options?.apiName ?? settings.CURRENT_API, {
    aerodataboxApiKey: options?.aerodataboxApiKey,
    aeroapiApiKey: options?.aeroapiApiKey,
    aerodataboxRapidApiKey: options?.aerodataboxRapidApiKey,
  });

  if (!api || !api.url || !api.module) {
    return false;
  }

  console.debug(`Testing API connection: ${api.url}`);
  return await api.module.checkApi(api.url, api.headers);
};
