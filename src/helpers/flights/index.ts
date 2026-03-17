import NetInfo from '@react-native-community/netinfo';

import { AEDBX_API_URL, AEROAPI_API_URL, settings } from '@/constants/settings';
import * as aerodatabox from '@/helpers/flights/aerodatabox';
import * as aeroapi from '@/helpers/flights/flightaware';
import type { Flight } from '@/types';

export type FlightDataErrorType = 'unauthorized' | 'offline' | 'request_failed' | null;

let lastFlightDataError: FlightDataErrorType = null;

export function getLastFlightDataError(): FlightDataErrorType {
  return lastFlightDataError;
}

interface ApiData {
  key: string | undefined;
  url: string | undefined;
  module: any;
}

interface ApiOverrides {
  aerodataboxApiKey?: string;
  aeroapiApiKey?: string;
}

const apiList: { [key: string]: () => ApiData } = {
  aerodatabox: (): ApiData => ({
    key: settings.AEDBX_API_KEY,
    url: AEDBX_API_URL,
    module: aerodatabox,
  }),
  aeroapi: (): ApiData => ({
    key: settings.AEROAPI_API_KEY,
    url: AEROAPI_API_URL,
    module: aeroapi,
  }),
};

function getApi(name: string = settings.CURRENT_API, overrides?: ApiOverrides): ApiData | null {
  const apiFactory = apiList[name] ?? apiList.aerodatabox;
  if (!apiFactory) {
    return null;
  }
  const api = apiFactory();
  if (name === 'aerodatabox' && overrides?.aerodataboxApiKey !== undefined) {
    api.key = overrides.aerodataboxApiKey;
  }
  if (name === 'aeroapi' && overrides?.aeroapiApiKey !== undefined) {
    api.key = overrides.aeroapiApiKey;
  }
  if (!api?.key || !api?.url) {
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
  if (!api || !api.key || !api.url || !api.module) {
    lastFlightDataError = 'request_failed';
    return null;
  }
  const result = await api.module.getFlightData(airline, flightNumber, date, api.url, api.key);
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
}): Promise<boolean> => {
  const state = await NetInfo.fetch();
  if (!state.isConnected || state.isInternetReachable === false) {
    return false;
  }
  const api = getApi(options?.apiName ?? settings.CURRENT_API, {
    aerodataboxApiKey: options?.aerodataboxApiKey,
    aeroapiApiKey: options?.aeroapiApiKey,
  });
  if (!api || !api.key || !api.url || !api.module) {
    return false;
  }
  return await api.module.checkApi(api.url, api.key);
};
