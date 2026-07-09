import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

import { Slot, router, usePathname } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Text } from 'react-native-picasso';

import t from '@/helpers/localization';
import { usePaletteColor, useThemeColor } from '@/hooks/useColors';
import useDynamicColorScheme from '@/hooks/useDynamicColorScheme';

export const unstable_settings = {
  initialRouteName: 'actual',
};

const FlightsWrapper = () => {
  const pathname = usePathname();
  const activeTab = pathname.endsWith('/past') ? 'past' : 'actual';
  const themeName = useDynamicColorScheme() || 'light';
  const colorPrimary = useThemeColor('textColors.primary');
  const bgPrimary = useThemeColor('colors.primary');
  const bgPrimaryContainer = useThemeColor('colors.primaryContainer');
  const colorInactive = themeName === 'light' ? usePaletteColor('NV-90') : usePaletteColor('NV-40');

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          backgroundColor: bgPrimary,
          flexDirection: 'row',
          paddingHorizontal: 8,
          paddingTop: 6,
        }}
      >
        <Pressable
          android_ripple={{
            color: bgPrimaryContainer,
            radius: 24,
          }}
          onPress={() => {
            if (activeTab !== 'actual') {
              router.replace('/(tabs)/flights/actual');
            }
          }}
          style={{
            alignItems: 'center',
            borderBottomWidth: 2,
            borderBottomColor: activeTab === 'actual' ? colorPrimary : 'transparent',
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            minHeight: 44,
            opacity: activeTab === 'actual' ? 1 : 0.76,
            paddingHorizontal: 6,
          }}
          testID="flights-actual-tab-button"
        >
          <FontAwesome5
            name="plane-departure"
            color={activeTab === 'actual' ? colorPrimary : colorInactive}
            size={14}
            style={{ marginRight: 6 }}
          />
          <Text
            className="size-md weight-semi-bold"
            style={{ color: activeTab === 'actual' ? colorPrimary : colorInactive }}
          >
            {t('flights.actual')}
          </Text>
        </Pressable>

        <Pressable
          android_ripple={{
            color: bgPrimaryContainer,
            radius: 24,
          }}
          onPress={() => {
            if (activeTab !== 'past') {
              router.replace('/(tabs)/flights/past');
            }
          }}
          style={{
            alignItems: 'center',
            borderBottomWidth: 2,
            borderBottomColor: activeTab === 'past' ? colorPrimary : 'transparent',
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            minHeight: 44,
            opacity: activeTab === 'past' ? 1 : 0.76,
            paddingHorizontal: 6,
          }}
          testID="flights-past-tab-button"
        >
          <FontAwesome5
            name="plane-arrival"
            color={activeTab === 'past' ? colorPrimary : colorInactive}
            size={14}
            style={{ marginRight: 6 }}
          />
          <Text
            className="size-md weight-semi-bold"
            style={{ color: activeTab === 'past' ? colorPrimary : colorInactive }}
          >
            {t('flights.past')}
          </Text>
        </Pressable>
      </View>

      <Slot />
    </View>
  );
};

export default FlightsWrapper;
