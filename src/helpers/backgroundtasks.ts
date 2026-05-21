import { AppRegistry, NativeModules } from 'react-native';

import { AEDBX_API_URL, AEROAPI_API_URL, getSetting, setSetting, settings } from '@/constants/settings';
import { flightsCheckTask } from '@/helpers/airdata';
import { showConfirmation } from '@/helpers/common';
import t from '@/helpers/localization';
import type { Flight } from '@/types';

const BACKGROUND_TASK_NAME = 'flightsCheckTask';
const BATTERY_OPTIMIZATION_PROMPT_ATTEMPTED_KEY = 'BATTERY_OPTIMIZATION_PROMPT_ATTEMPTED';

const { AirPlainBgModule } = NativeModules;

export interface NativeBackgroundTaskConfig {
  aerodataboxApiKey?: string;
  aerodataboxApiUrl?: string;
  aeroapiApiKey?: string;
  aeroapiApiUrl?: string;
  currentApi: string;
  enabled: boolean;
}

export interface NativeBackgroundFlightSnapshot {
  actualEndDatetime?: string;
  actualStartDatetime?: string;
  airline: string;
  arrivalTerminal?: string;
  baggageBelt?: string;
  departureCheckInDesk?: string;
  departureGate?: string;
  departureTerminal?: string;
  endDatetime: string;
  flightId?: number;
  flightNumber: string;
  isArchived: boolean;
  recordType: number;
  startDatetime: string;
  status: string;
}

AppRegistry.registerHeadlessTask(BACKGROUND_TASK_NAME, () => {
  return async (data?: { executionMode?: string }) => {
    await flightsCheckTask({ executionMode: data?.executionMode === 'headless' ? 'headless' : 'interactive' });
  };
});

export function buildNativeBackgroundTaskConfig(): NativeBackgroundTaskConfig {
  return {
    aerodataboxApiKey: settings.AEDBX_API_KEY,
    aerodataboxApiUrl: AEDBX_API_URL,
    aeroapiApiKey: settings.AEROAPI_API_KEY,
    aeroapiApiUrl: AEROAPI_API_URL,
    currentApi: settings.CURRENT_API,
    enabled: settings.ONLY_MANUAL_REFRESH === 'false',
  };
}

export async function syncBackgroundTaskConfig(
  config: NativeBackgroundTaskConfig = buildNativeBackgroundTaskConfig(),
): Promise<void> {
  try {
    AirPlainBgModule.syncBackgroundConfig(JSON.stringify(config));
  } catch (error) {
    console.debug('Failed to sync background config:', error);
  }
}

export async function syncBackgroundFlights(flights: Flight[]): Promise<void> {
  try {
    const payload: NativeBackgroundFlightSnapshot[] = flights.map((flight) => ({
      actualEndDatetime: flight.actualEndDatetime,
      actualStartDatetime: flight.actualStartDatetime,
      airline: flight.airline,
      arrivalTerminal: flight.arrivalTerminal,
      baggageBelt: flight.baggageBelt,
      departureCheckInDesk: flight.departureCheckInDesk,
      departureGate: flight.departureGate,
      departureTerminal: flight.departureTerminal,
      endDatetime: flight.endDatetime,
      flightId: flight.flightId,
      flightNumber: flight.flightNumber,
      isArchived: flight.isArchived,
      recordType: flight.recordType,
      startDatetime: flight.startDatetime,
      status: flight.status,
    }));
    AirPlainBgModule.syncBackgroundFlights(JSON.stringify(payload));
  } catch (error) {
    console.debug('Failed to sync background flights:', error);
  }
}

export async function checkBatteryOptimization(): Promise<boolean> {
  try {
    const isOptimized = await AirPlainBgModule.checkBatteryOptimization();
    return isOptimized;
  } catch (error) {
    console.debug('Failed to check battery optimization:', error);
    return false;
  }
}

export function requestBatteryOptimizationExemption(): void {
  try {
    AirPlainBgModule.requestBatteryOptimizationExemption();
  } catch (error) {
    console.debug('Failed to request battery optimization exemption:', error);
  }
}

export async function maybePromptBatteryOptimizationExemption(options?: { force?: boolean }): Promise<void> {
  if (settings.ONLY_MANUAL_REFRESH !== 'false') {
    return;
  }

  if (!options?.force && getSetting(BATTERY_OPTIMIZATION_PROMPT_ATTEMPTED_KEY, 'false') === 'true') {
    return;
  }

  const isBatteryOptimizationIgnored = await checkBatteryOptimization();
  if (isBatteryOptimizationIgnored) {
    return;
  }

  if (!options?.force) {
    setSetting(BATTERY_OPTIMIZATION_PROMPT_ATTEMPTED_KEY, 'true');
  }

  showConfirmation({
    title: t('settings.background_optimization_title'),
    description: t('settings.background_optimization_description'),
    closeButton: t('buttons.close'),
    confirmButton: t('settings.background_optimization_confirm'),
    showOnlyCloseButton: false,
    onConfirm: () => requestBatteryOptimizationExemption(),
  });
}

export function startBackgroundTask(): void {
  try {
    AirPlainBgModule.startBackgroundTask();
  } catch (error) {
    console.debug('Background task not available (missing permissions), app will work normally:', error);
  }
}

export function stopBackgroundTask(): void {
  try {
    AirPlainBgModule.stopBackgroundTask();
  } catch (error) {
    console.debug('Failed to stop background task:', error);
  }
}
