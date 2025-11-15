import { AppRegistry } from 'react-native';

import { flightsCheckTask } from '@/helpers/airdata';

const BACKGROUND_TASK_NAME = 'flightsCheckTask';

AppRegistry.registerHeadlessTask(BACKGROUND_TASK_NAME, () => {
  return async () => {
    await flightsCheckTask();
  };
});
