import * as Notifications from 'expo-notifications';
import { type Href, router, useNavigationContainerRef } from 'expo-router';
import { useEffect, useRef } from 'react';

export default function useNotificationObserver(appIsReady: boolean) {
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  const navigationRef = useNavigationContainerRef();
  const handledResponse = useRef<Notifications.NotificationResponse | null>(null);

  useEffect(() => {
    if (!appIsReady || !lastNotificationResponse) {
      return;
    }

    const url = lastNotificationResponse.notification.request.content.data?.url;
    if (!url) {
      return;
    }
    if (typeof url !== 'string') {
      console.warn('Cannot open notification: URL must be a string', url);
      return;
    }

    const openNotification = () => {
      if (!navigationRef.isReady() || handledResponse.current === lastNotificationResponse) {
        return;
      }
      handledResponse.current = lastNotificationResponse;
      try {
        router.replace(url as Href);
      } catch (error) {
        console.warn('Cannot open notification', error);
      }
    };

    // The root navigator mounts only after the splash screen, so wait for it on cold start.
    const unsubscribeReady = navigationRef.addListener('ready', openNotification);
    const unsubscribeState = navigationRef.addListener('state', openNotification);
    openNotification();
    return () => {
      unsubscribeReady();
      unsubscribeState();
    };
  }, [appIsReady, lastNotificationResponse, navigationRef]);
}
