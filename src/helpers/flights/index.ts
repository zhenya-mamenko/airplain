import NetInfo from '@react-native-community/netinfo';
import { AEDBX_API_URL, AEROAPI_API_URL, settings } from '@/constants/settings';
import type { Flight } from '@/types';
import * as aerodatabox from '@/helpers/flights/aerodatabox';
import * as aeroapi from '@/helpers/flights/flightaware';


interface ApiData {
  key: string | undefined;
  url: string | undefined;
  module: any;
}

const apiList: {[key: string]: Function} = {
  'aerodatabox': (): ApiData => ({ key: settings.AEDBX_API_KEY, url: AEDBX_API_URL, module: aerodatabox }),
  'aeroapi': (): ApiData => ({ key: settings.AEROAPI_API_KEY, url: AEROAPI_API_URL, module: aeroapi }),
};

function getApi(name: string = settings.CURRENT_API): ApiData | null {
  const api = apiList[name]();
  if (!api?.key || !api?.url) {
    return null;
  }
  return api;
}

export const getFlightData = async (airline: string, flightNumber: string, date: Date): Promise<Flight | null> => {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    return null;
  }
  const api = getApi();
  if (!api || !api.key || !api.url || !api.module) {
    return null;
  }
  const flightDate = (date ?? new Date()).toISOString().split('T')[0];
  return await api.module.getFlightData(airline, flightNumber, flightDate, api.url, api.key);
}
