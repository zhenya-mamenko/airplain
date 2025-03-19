import t from '@/helpers/localization';
import * as Notifications from 'expo-notifications';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

Notifications.setNotificationChannelAsync('common', {
  importance: Notifications.AndroidImportance.DEFAULT,
  lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  name: t('notifications.channels.common'),
  sound: 'default',
});

Notifications.setNotificationChannelAsync('flight', {
  importance: Notifications.AndroidImportance.MAX,
  lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  name: t('notifications.channels.flight'),
  sound: 'default',
});

Notifications.setNotificationChannelAsync('urgent', {
  enableLights: true,
  enableVibrate: true,
  importance: Notifications.AndroidImportance.MAX,
  lightColor: '#FF0000',
  lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  name: t('notifications.channels.urgent'),
  sound: 'default',
  vibrationPattern: [0, 250, 250, 250],
});

export const showCommonNotification = async (title: string, body: string, data?: any) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      body,
      data,
      title,
    },
    trigger: {
      channelId: 'common',
    },
  });
}

export const showFlightNotification = async (title: string, body: string, data?: any) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      body,
      data,
      title,
    },
    trigger: {
      channelId: 'flight',
    },
  });
}

export const showUrgentNotification = async (title: string, body: string, data?: any) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      body,
      color: '#BA1A1A',
      data,
      title,
    },
    trigger: {
      channelId: 'urgent',
    },
  });
}
