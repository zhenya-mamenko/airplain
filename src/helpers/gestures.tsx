import { Alert, Dimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import emitter from '@/helpers/emitter';
import { deleteFlight } from '@/helpers/sqlite';
import { router } from 'expo-router';
import t from '@/helpers/localization';
import { useThemeColor } from '@/hooks/useColors';
import { setFlightArchiveState } from '@/helpers/airdata';
import { refreshFlights } from '@/helpers/common';


const changeArchivedState = async (flightId: number, state: number) => {
  await setFlightArchiveState(flightId, state);
  refreshFlights(false);
}

const doEdit = (flightId: number) => {
  router.push({ pathname: '/edit', params: { flightId }});
}

const doDelete = async (flightId: number) => {
  if (await deleteFlight(flightId)) {
    refreshFlights(false);
  }
}

export const makeCardGestures = (
  flightId: number,
  isArchived: boolean,
  possibleUnarchive: boolean = false,
  refs?: any,
) => {

  const colorPrimary = useThemeColor('colors.primary');
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.4;
  const translateX = useSharedValue(0);
  const border = useSharedValue(`${colorPrimary}00`);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    borderColor: border.value,
  }));

  const showConfirmation = (flightId: number) => {
    Alert.alert(
      t('messages.confirm_delete_title'),
      t('messages.confirm_delete_description'),
      [
        {
          text: t('buttons.cancel'),
          style: 'cancel',
          onPress: () => {
            border.value = withTiming(`${colorPrimary}00`, { duration: 100 });
          },
        },
        {
          text: t('buttons.delete'),
          style: 'destructive',
          onPress: () => {
            border.value = withTiming(`${colorPrimary}00`, { duration: 100 }, () => {
              runOnJS(doDelete)(flightId)
            });
          },
        }
      ],
      {
        cancelable: true,
        onDismiss: () => border.value = withTiming(`${colorPrimary}00`, { duration: 100 }),
      }
    );
  }

  const pan = Gesture.Pan()
    .minDistance(20)
    .onUpdate((event) => {
      if (Math.abs(event.velocityX) > Math.abs(event.velocityY) && event.translationX > 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 300 }, () => {
          runOnJS(changeArchivedState)(flightId, 1);
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const panUnarchive = Gesture.Pan()
    .minDistance(40)
    .onUpdate((event) => {
      if (Math.abs(event.velocityX) > Math.abs(event.velocityY) && event.translationX < 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 300 }, () => {
          runOnJS(changeArchivedState)(flightId, 0);
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const tap = Gesture.Tap()
    .maxDuration(250)
    .numberOfTaps(1)
    .requireExternalGestureToFail(refs ?? [])
    .onEnd((e, success) => {
      border.value = withTiming(`${colorPrimary}FF`, { duration: 100 }, () => {
        border.value = withTiming(`${colorPrimary}00`, { duration: 100 }, () => {
          if (success) {
            runOnJS(doEdit)(flightId);
          }
        });
      });
    });

  const longpress = Gesture.LongPress()
    .onStart(e => {
      border.value = withTiming(`${colorPrimary}FF`, { duration: 200 });
    })
    .onEnd((e, success) => {
      if (success) {
        runOnJS(showConfirmation)(flightId);
      } else {
        border.value = `${colorPrimary}00`;
      }
    });

  const mixin: any[] = [tap, longpress];
  if (!isArchived) {
    mixin.push(pan);
  }
  if (possibleUnarchive) {
    mixin.push(panUnarchive);
  }

  return { gestures: Gesture.Race(...mixin), animatedStyle };
}
