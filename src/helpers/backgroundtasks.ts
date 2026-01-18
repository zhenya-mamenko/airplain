import { AppRegistry, NativeModules } from 'react-native';

import { flightsCheckTask } from '@/helpers/airdata';

const BACKGROUND_TASK_NAME = 'flightsCheckTask';

const { AirPlainBgModule } = NativeModules;

AppRegistry.registerHeadlessTask(BACKGROUND_TASK_NAME, () => {
  return async () => {
    await flightsCheckTask();
  };
});

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
