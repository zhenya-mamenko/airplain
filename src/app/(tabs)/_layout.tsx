import React, { useContext, useEffect, useState } from 'react';
import { Pressable, StatusBar } from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, usePathname } from 'expo-router';
import { ThemeProvider, View, Text } from 'react-native-picasso';
import useDynamicColorScheme from '@/hooks/useDynamicColorScheme';
import { useThemeColors } from '@/hooks/useColors';
import useTheme from '@/hooks/useTheme';
import t from '@/helpers/localization';
import type { TabData } from '@/types';
import emitter from '@/helpers/emitter';
import { router } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'flights',
};

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome5>['name'];
  color: string;
}) {
  return <FontAwesome5 size={22} style={{ marginBottom: -3 }} {...props} />;
}

const defaultTabs: TabData[] = [
  {
    icon: 'plane',
    route: 'flights',
    title: 'flights.title',
  },
  {
    icon: 'trophy',
    route: 'stats',
    title: 'stats.title',
  },
  {
    icon: 'user-alt',
    route: 'profile',
    title: 'profile.title',
  },
  {
    icon: 'cogs',
    route: 'settings',
    title: 'settings.title',
  },
];

export default function TabLayout(props: { tabs?: TabData[] } = {}) {
  const tabs = props.tabs ?? defaultTabs;
  const themeName = useDynamicColorScheme() || 'light';
  const theme = useTheme(themeName);

  const [
    colorBgPrimary,
    colorBg,
    colorPrimary,
    colorShadow,
    colorBgSecondary,
    colorBgPrimaryContainer,
  ] = useThemeColors([
    'colors.primary',
    'colors.background',
    'textColors.primary',
    'colors.shadow',
    'colors.secondary',
    'colors.primaryContainer',
  ]);

  const [filterState, setFilterState] = useState<'filter' | 'filter-outline'>(
    'filter-outline',
  );
  const flightsType = usePathname().split('/').at(-1);

  useEffect(() => {
    const setFlightFilterStateCallback = (
      filterState: 'filter' | 'filter-outline',
    ) => {
      setFilterState(filterState);
    };
    emitter.on('setFlightFilterState', setFlightFilterStateCallback);
    return () => {
      emitter.off('setFlightFilterState', setFlightFilterStateCallback);
    };
  }, []);

  const addFlight = async () => {
    router.push({ pathname: '/add' });
  };

  return (
    // @ts-ignore
    <ThemeProvider theme={theme}>
      <StatusBar
        backgroundColor={colorBgPrimary}
        barStyle={`${themeName}-content`}
      />
      <Tabs
        screenOptions={{
          animation: 'none',
          headerTintColor: colorPrimary,
          headerStyle: {
            backgroundColor: colorBgPrimary,
          },
          tabBarActiveTintColor: colorBgPrimary,
          tabBarInactiveTintColor: colorBgSecondary,
          tabBarStyle: {
            backgroundColor: colorBg,
          },
        }}
      >
        {tabs.map((tab) => (
          <Tabs.Screen
            key={tab.route}
            name={tab.route}
            options={{
              headerShadowVisible: tab.route.split('/')[0] !== 'flights',
              headerBackgroundContainerStyle: {
                boxShadow:
                  tab.route.split('/')[0] === 'flights'
                    ? 'none'
                    : `0 0 2px ${colorShadow}`,
              },
              headerRight:
                tab.route.split('/')[0] === 'flights'
                  ? ({ tintColor }) => (
                      <>
                        <Pressable
                          android_ripple={{
                            color: colorBgPrimaryContainer,
                            radius: 16,
                          }}
                          style={{ padding: 16 }}
                          testID="flights-add-button"
                          onPress={addFlight}
                        >
                          <FontAwesome5
                            name="plus"
                            size={18}
                            style={{ margin: 4, color: tintColor }}
                          />
                        </Pressable>
                      </>
                    )
                  : undefined,
              headerTitle: ({ tintColor, children }) => (
                <View className="flex-row justifycontent-start alignitems-center">
                  <Text
                    className="size-lg weight-bold"
                    style={{ color: tintColor }}
                  >
                    {children}
                  </Text>
                  {tab.route.split('/')[0] === 'flights' &&
                    (flightsType === 'past' ? (
                      <Pressable
                        android_ripple={{
                          color: colorBgPrimaryContainer,
                          radius: 14,
                        }}
                        style={{ padding: 20 }}
                        testID="flights-filter-button"
                        onPress={() => {
                          emitter.emit('setFlightFilterModalState', true);
                        }}
                      >
                        <MaterialCommunityIcons
                          name={filterState}
                          size={18}
                          style={{ marginTop: 6, color: tintColor }}
                        />
                      </Pressable>
                    ) : (
                      <MaterialCommunityIcons
                        name={filterState}
                        size={18}
                        style={{
                          marginTop: 6,
                          color: tintColor,
                          opacity: 0.38,
                          padding: 20,
                        }}
                      />
                    ))}
                </View>
              ),
              tabBarButtonTestID: `${tab.route}-tab-button`,
              tabBarIcon: ({ color }) => (
                <TabBarIcon name={tab.icon as any} color={color} />
              ),
              title: t(tab.title),
            }}
          />
        ))}
        <Tabs.Screen name="index" options={{ href: null, title: '' }} />
      </Tabs>
    </ThemeProvider>
  );
}
