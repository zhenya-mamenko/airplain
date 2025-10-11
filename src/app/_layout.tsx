import '@/helpers/backgroundtasks';
import {
  StrictMode,
  useEffect,
  useState,
  useContext,
  useRef,
  useCallback,
} from 'react';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { loadAsync } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import t from '@/helpers/localization';
import { useThemeColor } from '@/hooks/useColors';
import { openDatabase, closeDatabase } from '@/helpers/sqlite';
import { prepareAchievements } from '@/helpers/achievements';
import {
  GlobalContextProvider,
  GlobalContext,
} from '@/components/GlobalContext';
import { useImage } from '@shopify/react-native-skia';
import emitter from '@/helpers/emitter';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { View, StyleSheet } from 'react-native';
import FlightsFilterModal from '@/components/FlightsFilterModal';
import useDynamicColorScheme from '@/hooks/useDynamicColorScheme';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { loadAirlines } from '@/helpers/airdata';

function useNotificationObserver() {
  useEffect(() => {
    let isMounted = true;

    function redirect(notification: Notifications.Notification) {
      const url = notification.request.content.data?.url;
      if (url) {
        router.replace(url);
      }
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!isMounted || !response?.notification) {
        return;
      }
      redirect(response?.notification);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        redirect(response.notification);
      },
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);
}

export const unstable_settings = {
  initialRouteName: '/(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  useNotificationObserver();

  return (
    <GlobalContextProvider>
      <FlightsFilterModal />
      <RootLayout />
    </GlobalContextProvider>
  );
}

function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [animationStarted, setAnimationStarted] = useState(false);

  const bgImage = useImage(require('@/assets/images/profile-background.png'));
  const { stampsColors, setAchievements } = useContext(GlobalContext);
  const themeName = useDynamicColorScheme();

  const planeYPosition = useSharedValue(0);
  const planeShadowOpacity = useSharedValue(1);
  const planeShadowScale = useSharedValue(1);
  const planeShadowBlur = useSharedValue(0);

  const refreshAchievementsCallback = useRef<() => Promise<void>>(() =>
    Promise.resolve(),
  );
  useEffect(() => {
    refreshAchievementsCallback.current = async () => {
      const achievements = await prepareAchievements(
        stampsColors,
        bgImage,
        themeName ?? 'light',
      );
      setAchievements(achievements);
    };
    emitter.on('refreshAchievements', refreshAchievementsCallback.current);
    return () => {
      emitter.off('refreshAchievements', refreshAchievementsCallback.current);
    };
  }, [bgImage, themeName]);

  useEffect(() => {
    if (!animationStarted) {
      planeYPosition.value = withRepeat(
        withTiming(-30, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );

      planeShadowOpacity.value = withRepeat(
        withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );

      planeShadowScale.value = withRepeat(
        withTiming(0.7, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );

      planeShadowBlur.value = withRepeat(
        withTiming(5, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );

      setAnimationStarted(true);
    }
  }, []);

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  useEffect(() => {
    async function prepare() {
      try {
        await loadAsync(FontAwesome5.font);
        await loadAsync(MaterialCommunityIcons.font);
        const isDbOpened = await openDatabase();
        if (isDbOpened) {
          await loadAirlines();
          await refreshAchievementsCallback.current();
          await sleep(1000);
          setAppIsReady(isDbOpened);
        }
      } catch (error) {
        console.error(error);
        if (error) throw error;
      }
    }

    if (!!bgImage) prepare();

    return () => {
      closeDatabase();
    };
  }, [bgImage]);

  const planeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: planeYPosition.value }],
    };
  });

  const shadowAnimatedStyle = useAnimatedStyle(() => {
    const shadowIntensity = interpolate(
      planeYPosition.value,
      [-30, 0],
      [0.2, 0.6],
    );

    const shadowSharpness = interpolate(
      planeYPosition.value,
      [-30, 0],
      [20, 5],
    );

    const shadowSize = interpolate(planeYPosition.value, [-30, 0], [1.1, 0.8]);

    return {
      opacity: shadowIntensity,
      transform: [{ scale: shadowSize }, { translateY: 40 }],
      shadowRadius: shadowSharpness,
      shadowOpacity: 0.8,
    };
  });

  const onImageLoaded = useCallback(() => {
    try {
      SplashScreen.hide();
    } catch (e) {}
  }, []);

  if (!appIsReady) {
    return (
      <View style={styles.container}>
        <View style={styles.animationContainer}>
          <Animated.Image
            source={require('@/assets/images/splash.png')}
            style={[styles.planeShadow, shadowAnimatedStyle]}
            resizeMode="contain"
          />
          <Animated.Image
            source={require('@/assets/images/splash.png')}
            style={[styles.planeImage, planeAnimatedStyle]}
            resizeMode="contain"
            onLoadEnd={onImageLoaded}
          />
        </View>
      </View>
    );
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const headerTintColor = useThemeColor('textColors.primary');
  const backgroundColor = useThemeColor('colors.primary');

  return (
    <Stack>
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="pass"
        options={{
          headerTintColor,
          headerStyle: {
            backgroundColor,
          },
          presentation: 'card',
          title: t('boardingpass.title'),
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          headerTintColor,
          headerStyle: {
            backgroundColor,
          },
          presentation: 'card',
          title: t('add.title'),
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          headerTintColor,
          headerStyle: {
            backgroundColor,
          },
          presentation: 'card',
          title: t('edit.title'),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#33b3df',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  planeImage: {
    zIndex: 2,
    width: 110,
    height: 110,
  },
  planeShadow: {
    position: 'absolute',
    width: 110,
    height: 110,
    tintColor: 'rgba(0,0,0,0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    borderRadius: 30,
  },
});
