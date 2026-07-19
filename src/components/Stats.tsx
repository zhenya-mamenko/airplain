import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Image as _Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, TextStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView, Pressable } from 'react-native-gesture-handler';
import { Text, View, createPicassoComponent } from 'react-native-picasso';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { ViewStyle } from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

import YearSelector from '@/components/YearSelector';
import flags from '@/constants/flags.json';
import { airlineLogoUri, getAirlineData, getAirportData } from '@/helpers/airdata';
import emitter from '@/helpers/emitter';
import t, { useLocale } from '@/helpers/localization';
import { getStats } from '@/helpers/sqlite';
import { useThemeColor } from '@/hooks/useColors';
import type { StatsData } from '@/types';

const Image = createPicassoComponent(_Image);

interface CardProps {
  caption: string;
  flex?: number;
  leftmost?: boolean;
  size?: string;
  units?: string;
  value?: number | string;
  year: string;
}

const Card: React.FC<CardProps> = (props) => {
  const { caption, value, year, units, leftmost, size = 'lgx', flex = 1 } = props;

  const [displayValue, setDisplayValue] = useState(value);
  const [oldYear, setOldYear] = useState(year);
  const opacity = useSharedValue(1);

  const sizePx = (() => {
    switch (size) {
      case 'xxl':
        return 56;
      case 'xl':
        return 32;
      case 'lgx':
        return 28;
      case 'lg':
        return 24;
      default:
        return 20;
    }
  })();
  const [content, setContent] = useState<Array<React.JSX.Element>>([]);
  const valueColor = useThemeColor('textColors.surface');
  const unitsColor = useThemeColor('textColors.primaryContainer');

  useEffect(() => {
    function createContent() {
      const c: Array<React.JSX.Element> = [];
      const v = value?.toString()?.split('|') ?? [''];
      const u = units?.toString()?.split('|') ?? [''];
      v.forEach((v, i) => {
        c.push(
          <Animated.Text
            key={`value${i}`}
            style={{
              fontWeight: 'bold',
              color: valueColor,
              fontSize: sizePx,
              fontVariant: ['tabular-nums'],
            }}
          >
            {v}
          </Animated.Text>,
        );
        if (u[i]) {
          c.push(
            <Animated.Text key={`units${i}`} style={{ color: unitsColor, fontSize: sizePx }}>
              {u[i]}
            </Animated.Text>,
          );
        }
      });
      setDisplayValue(value);
      setOldYear(year);
      setContent(c);
    }

    if (content.length === 0) {
      createContent();
    } else if (value !== displayValue || year !== oldYear) {
      opacity.value = withTiming(0, { duration: 400 }, (finished) => {
        if (finished) {
          scheduleOnRN(createContent);
          opacity.value = withTiming(1, { duration: 400 });
        }
      });
    }
  }, [value, year, units]);

  const animatedStyle = useAnimatedStyle(
    () => ({
      opacity: opacity.value,
    }),
    [],
  );

  return (
    <View
      className={`flex-column alignitems-start justifycontent-start flex-${flex} py-xs
      p${flex == 1 ? 'x' : !leftmost ? 'r' : 'l'}-sm ${leftmost ? 'mr-lg' : ''}`}
    >
      <Text className={`size-xs color-primaryContainer mb-xs`} style={{ fontVariant: ['small-caps'] }}>
        {t(`stats.${caption}`).toLocaleLowerCase()}
      </Text>
      <Animated.View
        style={[
          animatedStyle,
          {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
          },
        ]}
      >
        {content}
      </Animated.View>
    </View>
  );
};

const rowStyle: ViewStyle = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
};

const captionStyle: TextStyle = {
  width: '12%',
  fontSize: 14,
  textAlign: 'left',
  fontWeight: 'bold',
  fontVariant: ['small-caps'],
};

const captionTextStyle: TextStyle = {
  width: '78%',
  fontSize: 14,
  textAlign: 'left',
  fontVariant: ['small-caps'],
};

const captionTextStyleLong: TextStyle = {
  width: '90%',
  fontSize: 14,
  textAlign: 'left',
  fontVariant: ['small-caps'],
};

const captionCountStyle: TextStyle = {
  width: '10%',
  fontSize: 12,
  fontWeight: 'bold',
  textAlign: 'right',
  fontVariant: ['tabular-nums'],
};

export interface StatsRowRendererProps {
  animatedStyle: any;
  captionStyle: TextStyle;
  captionTextStyle: TextStyle;
  captionTextStyleLong: TextStyle;
  captionCountStyle: TextStyle;
  rowStyle: ViewStyle;
  colorPrimaryContainer?: string;
  locale?: string;
}

export const statsRowRenderers = {
  countries: (item: any, index: number, props: StatsRowRendererProps) => (
    <Animated.View key={index} style={[props.animatedStyle, props.rowStyle]}>
      <Text numberOfLines={1} style={props.captionStyle}>
        {item.flag}
      </Text>
      <Text ellipsizeMode="tail" numberOfLines={1} style={props.captionTextStyle}>
        {t(`achievements.${item.country}`).toLocaleLowerCase()}
      </Text>
      <Text numberOfLines={1} style={props.captionCountStyle}>
        {item.count}
      </Text>
    </Animated.View>
  ),
  airlines: (item: any, index: number, props: StatsRowRendererProps) => (
    <Animated.View key={index} style={[props.animatedStyle, props.rowStyle]}>
      <View style={{ width: '12%' }}>
        <Image
          className="radius-xs b-1 bordercolor-secondaryContainer"
          recyclingKey={item.airline}
          source={item.logo}
          style={{ width: 16, height: 16, backgroundColor: props.colorPrimaryContainer }}
        />
      </View>
      <Text ellipsizeMode="tail" numberOfLines={1} style={props.captionTextStyle}>
        {item.airline.toLocaleLowerCase()}
      </Text>
      <Text numberOfLines={1} style={props.captionCountStyle}>
        {item.count}
      </Text>
    </Animated.View>
  ),
  airports: (item: any, index: number, props: StatsRowRendererProps) => (
    <Animated.View key={index} style={[props.animatedStyle, props.rowStyle]}>
      <Text numberOfLines={1} style={props.captionStyle}>
        {item.airport.toLocaleLowerCase()}
      </Text>
      <Text ellipsizeMode="tail" numberOfLines={1} style={props.captionTextStyle}>
        {getAirportData(item.airport, props.locale)?.airport_name.toLocaleLowerCase()}
      </Text>
      <Text numberOfLines={1} style={props.captionCountStyle}>
        {item.count}
      </Text>
    </Animated.View>
  ),
  aircrafts: (item: any, index: number, props: StatsRowRendererProps) => (
    <Animated.View key={index} style={[props.animatedStyle, props.rowStyle]}>
      <Text ellipsizeMode="tail" numberOfLines={1} style={props.captionTextStyleLong}>
        {item.aircraft.toLocaleLowerCase() || t('stats.unknown').toLocaleLowerCase()}
      </Text>
      <Text numberOfLines={1} style={props.captionCountStyle}>
        {item.count}
      </Text>
    </Animated.View>
  ),
};

interface Top10CardProps {
  animatedStyle: unknown;
  caption: string;
  colorPrimaryContainer?: string;
  data: Array<unknown>;
  locale?: string;
}
const Top10Card: React.FC<Top10CardProps> = (props) => {
  const { animatedStyle, caption, colorPrimaryContainer, data, locale } = props;
  if (!data || data.length === 0) {
    return null;
  }
  const color = useThemeColor('textColors.surface');
  const colorBgPrimaryContainer = useThemeColor('colors.primaryContainer');
  const valueColor = useThemeColor('textColors.surface');
  captionStyle.color = valueColor;
  captionTextStyle.color = valueColor;
  captionTextStyleLong.color = valueColor;
  captionCountStyle.color = valueColor;

  const title = t('stats.top10', { type: t(`stats.${caption}`) });
  const rendererProps: StatsRowRendererProps = {
    animatedStyle,
    captionStyle,
    captionTextStyle,
    captionTextStyleLong,
    captionCountStyle,
    rowStyle,
    colorPrimaryContainer,
    locale,
  };
  const renderRow = statsRowRenderers[caption as keyof typeof statsRowRenderers];

  return (
    <View className="flex-column alignitems-start justifycontent-start bg-surface m-sm mt-xs pb-md radius-md b-1 bordercolor-outline elevated">
      <View className="flex-row radiustr-md radiustl-md pl-md pr-sm py-smm bb-1 bordercolor-outlineVariant bg-secondaryContainer">
        <Text className="size-mdl color-surface ml-xs flex-1">{title}</Text>
        {data.length > 10 && (
          <Pressable
            android_ripple={{
              color: colorBgPrimaryContainer,
              radius: 14,
            }}
            testID="stats-top10-button"
            onPress={() => {
              router.push({
                pathname: '/stats-list',
                params: { value: JSON.stringify(data), caption, renderRowStr: renderRow.toString() },
              });
            }}
          >
            <MaterialCommunityIcons color={color} name="arrow-right" size={20} style={{ padding: 4 }} />
          </Pressable>
        )}
      </View>
      <View className="flex-column px-md pt-md">
        {data.slice(0, 10).map((item, index) => renderRow(item, index, rendererProps))}
      </View>
    </View>
  );
};

export default function Stats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData>();
  const [year, setYear] = useState<string>('all');
  const getStatsRef = useRef(async () => {});
  const locale = useLocale();

  useEffect(() => {
    getStatsRef.current = async () => {
      setLoading(true);
      const stats = await getStats();
      setStats(stats);
      setTimeout(() => setLoading(false), 500);
    };

    const getStatsCallback = () => getStatsRef.current();
    emitter.on('updateStats', getStatsCallback);

    getStatsRef.current();

    return () => emitter.off('updateStats', getStatsCallback);
  }, []);

  const years = (() => {
    const result = Object.keys(stats || {});
    result.sort((a, b) => {
      if (a === 'all') return -1;
      if (b === 'all') return 1;
      return parseInt(b) - parseInt(a);
    });
    return result;
  })();

  const countryCodes = stats?.[year]?.countryCodes
    ?.split(',')
    .map((code) => flags.find((x) => x.country_code === code)?.flag)
    .join('');
  const domesticFlights = stats?.[year]?.domesticFlights;
  const internationalFlights = stats?.[year]?.internationalFlights;
  const longHaulFlights = stats?.[year]?.longHaulFlights;
  const airportsData =
    stats?.[year]?.airportsData?.split('|').map((item) => {
      const parts = item.split(':');
      return { airport: parts[0], count: parseInt(parts[1]) };
    }) || [];
  airportsData.sort((a, b) => b.count - a.count);
  const countriesData =
    stats?.[year]?.countriesData?.split('|').map((item) => {
      const parts = item.split(':');
      return {
        country: parts[0],
        flag: flags.find((x) => x.country_code === parts[0])?.flag,
        count: parseInt(parts[1]),
      };
    }) || [];
  countriesData.sort((a, b) => b.count - a.count);
  const airlinesData =
    stats?.[year]?.airlinesData?.split('|').map((item) => {
      const parts = item.split(':');
      const airline = getAirlineData(parts[0]);
      return {
        airline: airline?.airlineName ?? parts[0],
        logo: airlineLogoUri(airline?.airlineCode ?? parts[0]),
        count: parseInt(parts[1]),
      };
    }) || [];
  airlinesData.sort((a, b) => b.count - a.count);
  const aircraftsData =
    stats?.[year]?.aircraftsData?.split('|').map((item) => {
      const parts = item.split(':');
      return {
        aircraft: parts[0],
        count: parseInt(parts[1]),
      };
    }) || [];
  aircraftsData.sort((a, b) => b.count - a.count);

  const value = {
    countryCodes,
    domesticFlights,
    internationalFlights,
    longHaulFlights,
    airportsData,
    countriesData,
    airlinesData,
    aircraftsData,
  };

  const [displayValue, setDisplayValue] = useState(value);
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(
    () => ({
      opacity: opacity.value,
    }),
    [],
  );

  useEffect(() => {
    if (JSON.stringify(value) !== JSON.stringify(displayValue)) {
      opacity.value = withTiming(0, { duration: 400 }, (finished) => {
        if (finished) {
          scheduleOnRN(setDisplayValue, value);
          opacity.value = withTiming(1, { duration: 400 });
        }
      });
    }
  }, [value, loading]);

  const panGesture = Gesture.Pan()
    .minDistance(5)
    .onEnd((e) => {
      const { velocityX, velocityY } = e;
      if (Math.abs(velocityX) > Math.abs(velocityY)) {
        const delta = velocityX > 0 ? -1 : 1;
        const index = years.indexOf(year);
        if (index + delta >= 0 && index + delta < years.length) {
          scheduleOnRN(setYear, years[index + delta]);
        }
      }
    });

  const ad = stats?.[year]?.avgDuration ?? 0;
  let avgDuration: Array<number> = [Math.floor(ad / 60)];
  let avgDurationUnits: Array<string> = [t('measurements.h') + ' '];
  if (ad % 60 >= 5) {
    const md = Math.floor((ad % 60) / 5) + 1;
    if (md !== 12) {
      avgDuration = [avgDuration[0], md * 5];
      avgDurationUnits = [avgDurationUnits[0], t('measurements.m')];
    } else {
      avgDuration[0] += 1;
    }
  }
  let avgDelay = stats?.[year]?.avgDelay ?? 0;
  avgDelay = avgDelay > 0 ? avgDelay : 0;

  const shadowColor = useThemeColor('textColors.secondaryContainer');
  const colorSurfaceVariant = useThemeColor('colors.surfaceVariant');
  const colorPrimary = useThemeColor('colors.primary');
  const colorPrimaryContainer = useThemeColor('textColors.primaryContainer');
  const valueColor = useThemeColor('textColors.surface');

  const loaderView = (
    <View className="bg-surfaceVariant flex-1 alignitems-center justifycontent-center">
      <ActivityIndicator size="large" color={colorPrimary} />
    </View>
  );

  const flightsStyle: TextStyle = {
    width: 30,
    fontSize: 12,
    color: valueColor,
    fontWeight: 'bold',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  };

  const statsView = (
    <ScrollView keyboardShouldPersistTaps="always" style={{ flex: 1, backgroundColor: colorSurfaceVariant }}>
      <View className="bg-surfaceVariant flex-column flex-1">
        <YearSelector current={year} years={years} onYearChange={(year) => setYear(year)} />
        <GestureHandlerRootView style={{ flex: 1 }}>
          <GestureDetector gesture={panGesture}>
            <View collapsable={false}>
              <View className="flex-column alignitems-start justifycontent-start bg-surface m-sm radius-md b-1 bordercolor-outline pb-sm elevated">
                <View className="flex-row radiustr-md radiustl-md p-md bb-1 bordercolor-outlineVariant bg-secondaryContainer">
                  <Text className="size-lg color-surface ml-xs flex-1">
                    {t('stats.caption', {
                      period: year === 'all' ? t('stats.all_time') : year,
                      y: year !== 'all' ? t('measurements.year') : '',
                    })}
                  </Text>
                </View>
                <View className="flex-row px-md pt-md pb-sm">
                  <Card caption="flights" year={year} size="xxl" value={stats?.[year]?.flights} />
                  <View className="flex-column alignitems-end justifycontent-end mb-smm">
                    <View className="flex-row">
                      <Text className="size-sm color-primaryContainer" style={{ fontVariant: ['small-caps'] }}>
                        {t('stats.domestic_flights').toLocaleLowerCase()}
                      </Text>
                      <Animated.Text style={[animatedStyle, flightsStyle]}>
                        {displayValue.domesticFlights}
                      </Animated.Text>
                    </View>
                    <View className="flex-row">
                      <Text className="size-sm color-primaryContainer" style={{ fontVariant: ['small-caps'] }}>
                        {t('stats.international_flights').toLocaleLowerCase()}
                      </Text>
                      <Animated.Text
                        className="size-sm color-surface weight-bold align-right"
                        style={[animatedStyle, flightsStyle]}
                      >
                        {displayValue.internationalFlights}
                      </Animated.Text>
                    </View>
                    <View className="flex-row">
                      <Text className="size-sm color-primaryContainer" style={{ fontVariant: ['small-caps'] }}>
                        {t('stats.long_haul_flights').toLocaleLowerCase()}
                      </Text>
                      <Animated.Text
                        className="size-sm color-surface weight-bold align-right"
                        style={[animatedStyle, flightsStyle]}
                      >
                        {displayValue.longHaulFlights}
                      </Animated.Text>
                    </View>
                  </View>
                </View>
                <View className="flex-row px-md pt-sm">
                  <Card
                    caption="duration"
                    year={year}
                    units={t('measurements.h')}
                    value={Math.floor((stats?.[year]?.duration ?? 0) / 60)}
                  />
                  <Card
                    caption="distance"
                    flex={2}
                    year={year}
                    units={t('measurements.km')}
                    value={stats?.[year]?.distance ? `${stats?.[year]?.distance.toLocaleString(locale)}` : '0'}
                  />
                </View>
                <View className="flex-row px-md py-sm">
                  <Card caption="airports" year={year} value={stats?.[year]?.airports} />
                  <Card caption="airlines" year={year} value={stats?.[year]?.airlines} />
                  <Card caption="aircrafts" year={year} value={stats?.[year]?.aircrafts} />
                </View>
                <View className="flex-row px-md pb-sm">
                  <Card caption="countries" year={year} value={stats?.[year]?.countries} />
                  <View className="flex-2 py-sm justifycontent-end alignitems-start">
                    <Animated.Text
                      ellipsizeMode="clip"
                      numberOfLines={2}
                      style={[
                        animatedStyle,
                        {
                          fontSize: 22,
                          letterSpacing: -7,
                          lineHeight: 22,
                          marginLeft: -2,
                          textShadowColor: `${shadowColor}80`,
                          textShadowOffset: { width: -2, height: 2 },
                          textShadowRadius: 2,
                        },
                      ]}
                    >
                      {displayValue.countryCodes}
                    </Animated.Text>
                  </View>
                </View>
              </View>

              <View className="flex-column alignitems-start justifycontent-start bg-surface m-sm mt-xs pb-md radius-md b-1 bordercolor-outline elevated">
                <View className="flex-row radiustr-md radiustl-md px-md py-smm bb-1 bordercolor-outlineVariant bg-secondaryContainer">
                  <Text className="size-mdl color-surface ml-xs flex-1">{t('stats.average_flight')}</Text>
                </View>
                <View className="flex-row px-md pt-md">
                  <Card
                    caption="duration"
                    flex={2}
                    leftmost={true}
                    size="lg"
                    units={avgDurationUnits?.join('|')}
                    value={avgDuration.join('|')}
                    year={year}
                  />
                  <Card
                    caption="delay"
                    size="lg"
                    units={avgDelay > 0 ? t('measurements.m') : undefined}
                    value={avgDelay > 0 ? avgDelay : '—'}
                    year={year}
                  />
                </View>
                <View className="flex-row px-md pt-sm">
                  <Card
                    caption="distance"
                    size="lg"
                    units={t('measurements.km')}
                    value={stats?.[year]?.avgDistance ? `${stats?.[year]?.avgDistance.toLocaleString(locale)}` : 0}
                    year={year}
                  />
                </View>
              </View>

              <Top10Card
                animatedStyle={animatedStyle}
                caption="countries"
                colorPrimaryContainer={colorPrimaryContainer}
                data={displayValue.countriesData}
              />

              <Top10Card animatedStyle={animatedStyle} caption="airlines" data={displayValue.airlinesData} />

              <Top10Card animatedStyle={animatedStyle} caption="airports" data={displayValue.airportsData} />

              <Top10Card animatedStyle={animatedStyle} caption="aircrafts" data={displayValue.aircraftsData} />
            </View>
          </GestureDetector>
        </GestureHandlerRootView>
      </View>
    </ScrollView>
  );

  return loading ? loaderView : statsView;
}
