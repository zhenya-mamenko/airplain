import { flightsCheckTask } from '@/helpers/airdata';
import { AppRegistry } from 'react-native';


const BACKGROUND_TASK_NAME = 'flightsCheckTask';

AppRegistry.registerHeadlessTask(BACKGROUND_TASK_NAME, () => {
  return async () => {
    await flightsCheckTask();
  }
});
