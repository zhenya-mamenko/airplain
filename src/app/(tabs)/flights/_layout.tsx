import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import t from '@/helpers/localization';
import { usePaletteColor, useThemeColor } from '@/hooks/useColors';
import useDynamicColorScheme from '@/hooks/useDynamicColorScheme';
import {
  MaterialTopTabNavigationEventMap,
  MaterialTopTabNavigationOptions,
  createMaterialTopTabNavigator,
} from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';
import { ParamListBase, TabNavigationState } from '@react-navigation/native';

const { Navigator } = createMaterialTopTabNavigator();

const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

const FlightsWrapper = () => {
  const themeName = useDynamicColorScheme() || 'light';
  const colorPrimary = useThemeColor('textColors.primary');
  const bgPrimary = useThemeColor('colors.primary');
  const colorInactive =
    themeName === 'light' ? usePaletteColor('NV-90') : usePaletteColor('NV-40');

  return (
    <MaterialTopTabs
      screenOptions={{
        animationEnabled: false,
        tabBarActiveTintColor: colorPrimary,
        tabBarInactiveTintColor: colorInactive,
        tabBarIndicatorStyle: { backgroundColor: colorPrimary },
        tabBarPressColor: 'transparent',
        tabBarStyle: { backgroundColor: bgPrimary },
        tabBarItemStyle: { flexDirection: 'row', marginTop: -8 },
        swipeEnabled: false,
      }}
    >
      <MaterialTopTabs.Screen
        name="actual"
        options={{
          title: t('flights.actual'),
          tabBarIcon: ({ color }) => (
            <FontAwesome5
              name="plane-departure"
              color={color}
              size={14}
              style={{ marginRight: 4, marginTop: -4 }}
            />
          ),
        }}
      />
      <MaterialTopTabs.Screen
        name="past"
        options={{
          title: t('flights.past'),
          tabBarIcon: ({ color }) => (
            <FontAwesome5
              name="plane-arrival"
              color={color}
              size={14}
              style={{ marginRight: 4, marginTop: -4 }}
            />
          ),
        }}
      />
    </MaterialTopTabs>
  );
};

export default FlightsWrapper;
