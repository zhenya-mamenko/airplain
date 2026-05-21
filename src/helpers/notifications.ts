import * as Notifications from 'expo-notifications';

import { deleteSetting, getSetting, setSetting } from '@/constants/settings';
import t from '@/helpers/localization';
import type { Flight } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
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

type ScheduledFlightReminderKey = 'beforeFlight3h' | 'onlineCheckInOpen';

interface ScheduledFlightReminder {
  notificationId: string;
  scheduledFor: string;
}

interface ScheduledFlightReminderNotificationData extends Record<string, unknown> {
  flightId: number;
  reminderKey: ScheduledFlightReminderKey;
  type: 'scheduledFlightReminder';
  url: string;
}

type ScheduledFlightRemindersState = Partial<Record<ScheduledFlightReminderKey, ScheduledFlightReminder>>;

const scheduledFlightNotificationsKey = (flightId: number) => `flight-scheduled-notifications-${flightId}`;
const flightNotificationsStateKey = (flightId: number) => `flight-notifications-${flightId}`;

const getScheduledFlightReminders = (flightId: number): ScheduledFlightRemindersState => {
  try {
    return JSON.parse(getSetting(scheduledFlightNotificationsKey(flightId), '{}'));
  } catch {
    return {};
  }
};

const setScheduledFlightReminders = (flightId: number, reminders: ScheduledFlightRemindersState) => {
  if (Object.keys(reminders).length === 0) {
    deleteSetting(scheduledFlightNotificationsKey(flightId));
    return;
  }
  setSetting(scheduledFlightNotificationsKey(flightId), JSON.stringify(reminders));
};

const getFlightNotificationsState = (flightId: number): Record<string, boolean> => {
  try {
    return JSON.parse(getSetting(flightNotificationsStateKey(flightId), '{}'));
  } catch {
    return {};
  }
};

const setFlightNotificationFlag = (flightId: number, reminderKey: ScheduledFlightReminderKey) => {
  const notificationsState = getFlightNotificationsState(flightId);
  notificationsState[reminderKey] = true;
  setSetting(flightNotificationsStateKey(flightId), JSON.stringify(notificationsState));
};

const reconcileDeliveredScheduledFlightReminders = (flightId: number, now: Date) => {
  const reminders = getScheduledFlightReminders(flightId);
  let hasChanges = false;

  for (const [reminderKey, reminder] of Object.entries(reminders) as Array<
    [ScheduledFlightReminderKey, ScheduledFlightReminder]
  >) {
    const scheduledFor = new Date(reminder.scheduledFor);
    if (Number.isNaN(scheduledFor.getTime()) || scheduledFor > now) {
      continue;
    }

    setFlightNotificationFlag(flightId, reminderKey);
    delete reminders[reminderKey];
    hasChanges = true;
  }

  if (hasChanges) {
    setScheduledFlightReminders(flightId, reminders);
  }
};

const clearScheduledFlightReminder = (flightId: number, reminderKey: ScheduledFlightReminderKey) => {
  const reminders = getScheduledFlightReminders(flightId);
  if (!reminders[reminderKey]) {
    return;
  }

  delete reminders[reminderKey];
  setScheduledFlightReminders(flightId, reminders);
};

const isScheduledFlightReminderKey = (value: unknown): value is ScheduledFlightReminderKey =>
  value === 'beforeFlight3h' || value === 'onlineCheckInOpen';

const readScheduledFlightReminderData = (data: unknown): ScheduledFlightReminderNotificationData | null => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const reminderData = data as Partial<ScheduledFlightReminderNotificationData>;
  if (
    reminderData.type !== 'scheduledFlightReminder' ||
    typeof reminderData.flightId !== 'number' ||
    !isScheduledFlightReminderKey(reminderData.reminderKey)
  ) {
    return null;
  }

  return {
    flightId: reminderData.flightId,
    reminderKey: reminderData.reminderKey,
    type: 'scheduledFlightReminder',
    url: typeof reminderData.url === 'string' ? reminderData.url : `/flights/actual?flightId=${reminderData.flightId}`,
  };
};

const handleScheduledFlightReminderDelivery = (data: unknown) => {
  const reminderData = readScheduledFlightReminderData(data);
  if (!reminderData) {
    return;
  }

  setFlightNotificationFlag(reminderData.flightId, reminderData.reminderKey);
  clearScheduledFlightReminder(reminderData.flightId, reminderData.reminderKey);
};

const getFlightNotificationTitle = (flight: Flight) =>
  `${t('flights.flight')} ${flight.airline} ${flight.flightNumber}`;

const scheduleReminder = async (
  title: string,
  body: string,
  date: Date,
  data: ScheduledFlightReminderNotificationData,
) => {
  return Notifications.scheduleNotificationAsync({
    content: {
      body,
      data,
      title,
    },
    trigger: {
      channelId: 'flight',
      date,
      type: Notifications.SchedulableTriggerInputTypes.DATE,
    },
  });
};

Notifications.addNotificationReceivedListener((notification) => {
  handleScheduledFlightReminderDelivery(notification.request.content.data);
});

Notifications.addNotificationResponseReceivedListener((response) => {
  handleScheduledFlightReminderDelivery(response.notification.request.content.data);
});

export const hasScheduledFlightReminder = (
  flightId: number | undefined,
  reminderKey: ScheduledFlightReminderKey,
): boolean => {
  if (!flightId) {
    return false;
  }
  return !!getScheduledFlightReminders(flightId)[reminderKey];
};

export const cancelScheduledFlightReminder = async (
  flightId: number | undefined,
  reminderKey: ScheduledFlightReminderKey,
): Promise<void> => {
  if (!flightId) {
    return;
  }

  const reminders = getScheduledFlightReminders(flightId);
  const reminder = reminders[reminderKey];
  if (!reminder) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
  } catch {}
  clearScheduledFlightReminder(flightId, reminderKey);
};

export const cancelScheduledFlightReminders = async (flightId: number | undefined): Promise<void> => {
  if (!flightId) {
    return;
  }

  const reminders = getScheduledFlightReminders(flightId);
  await Promise.all(
    Object.values(reminders).map(async (reminder) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      } catch {}
    }),
  );
  deleteSetting(scheduledFlightNotificationsKey(flightId));
};

export const syncScheduledFlightReminders = async (flight: Flight): Promise<void> => {
  if (!flight.flightId) {
    return;
  }

  const now = new Date();
  reconcileDeliveredScheduledFlightReminders(flight.flightId, now);

  await cancelScheduledFlightReminders(flight.flightId);

  if (flight.isArchived) {
    return;
  }

  const reminders: ScheduledFlightRemindersState = {};
  const startDatetime = new Date(flight.actualStartDatetime ?? flight.startDatetime);
  const title = getFlightNotificationTitle(flight);

  const beforeFlight3hDate = new Date(startDatetime.getTime() - 3 * 60 * 60 * 1000);
  if (beforeFlight3hDate > now) {
    const notificationId = await scheduleReminder(title, t('notifications.before_flight_3h'), beforeFlight3hDate, {
      flightId: flight.flightId,
      reminderKey: 'beforeFlight3h',
      type: 'scheduledFlightReminder',
      url: `/flights/actual?flightId=${flight.flightId}`,
    });
    reminders.beforeFlight3h = {
      notificationId,
      scheduledFor: beforeFlight3hDate.toISOString(),
    };
  }

  if (flight.checkInTime && flight.checkInTime > 3) {
    const onlineCheckInDate = new Date(startDatetime.getTime() - flight.checkInTime * 60 * 60 * 1000);
    if (onlineCheckInDate > now) {
      const notificationId = await scheduleReminder(title, t('notifications.online_check_in_open'), onlineCheckInDate, {
        flightId: flight.flightId,
        reminderKey: 'onlineCheckInOpen',
        type: 'scheduledFlightReminder',
        url: `/flights/actual?flightId=${flight.flightId}`,
      });
      reminders.onlineCheckInOpen = {
        notificationId,
        scheduledFor: onlineCheckInDate.toISOString(),
      };
    }
  }

  setScheduledFlightReminders(flight.flightId, reminders);
};

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
  console.debug(`showCommonNotification ${title} sent`);
};

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
  console.debug(`showFlightNotification ${title} sent`);
};

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
  console.debug(`showUrgentNotification ${title} sent`);
};
