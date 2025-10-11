import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Image as _Image } from 'expo-image';
import { useNetworkState } from 'expo-network';
import { Text, View, createPicassoComponent } from 'react-native-picasso';
import type { LandedFlightCardData, WeatherData } from '@/types';
import {
  dateClass,
  makeDateLabel,
  durationToLocaleString,
} from '@/helpers/datetime';
import { useLocale } from '@/helpers/localization';
import { useThemeColor, usePaletteColor } from '@/hooks/useColors';
import { getAirportData, airlineLogoUri } from '@/helpers/airdata';
import t from '@/helpers/localization';
import { SvgBaggageBelt, SvgTimezoneAlert } from '@/constants/svg';
import flags from '@/constants/flags.json';
import { loadWeather, parseWeather } from '@/helpers/weather';
import { settings } from '@/constants/settings';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { makeCardGestures } from '@/helpers/gestures';

const Image = createPicassoComponent(_Image);

export default function LandedFlightCard(props: {
  data: LandedFlightCardData;
}) {
  const locale = useLocale();
  const colorSurfaceVariant = useThemeColor('colors.surfaceVariant');
  const colorPrimaryContainer = useThemeColor('textColors.primaryContainer');
  const colorN70 = usePaletteColor('N-70');

  const {
    airline,
    flightNumber,
    startDatetime,
    actualStartDatetime,
    departureAirport,
    arrivalAirport,
    actualEndDatetime,
    endDatetime,
    departureTerminal,
    arrivalTerminal,
    isDifferentTimezone,
    baggageBelt,
    departureAirportTimezone,
    arrivalAirportTimezone,
    flightId,
    isArchived,
  } = props.data;

  const sd = actualStartDatetime ?? startDatetime;
  const ed = actualEndDatetime ?? endDatetime;
  const departureAirportData = getAirportData(departureAirport, locale);
  const arrivalAirportData = getAirportData(arrivalAirport, locale);
  const departureDate = new Date(sd * 1000);
  const arrivalDate = new Date(ed * 1000);
  const dateLabel = makeDateLabel(
    departureDate,
    departureAirportTimezone,
    arrivalDate,
    arrivalAirportTimezone,
    locale,
  );
  const durationString = durationToLocaleString(
    Math.round((ed - sd) / 60),
    locale,
  );
  const distanceString = `${props.data.distance.toLocaleString(locale)}${t('measurements.km')}`;

  const network = useNetworkState();
  const [airportWeather, setAirportWeather] = useState<WeatherData | null>(
    null,
  );
  const [lat, lon] = [
    arrivalAirportData?.airport_latitude,
    arrivalAirportData?.airport_longitude,
  ];
  const loadWeatherCallback = useCallback(async () => {
    if (lat && lon && network.isInternetReachable) {
      const data = await loadWeather(lat, lon);
      if (data) {
        setAirportWeather(
          parseWeather((data as any).current, colorPrimaryContainer, 16),
        );
      }
    }
  }, [
    lat,
    lon,
    network.isInternetReachable,
    settings.TEMPERATURE_UNITS,
    settings.TEMPERATURE_TYPE,
    settings.WEATHER_API_KEY,
  ]);
  useEffect(() => {
    loadWeatherCallback();
  }, [loadWeatherCallback]);

  const departureTimeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    dayPeriod: 'short',
    timeZone: departureAirportTimezone ?? 'UTC',
  };
  const arrivalTimeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    dayPeriod: 'short',
    timeZone: arrivalAirportTimezone ?? 'UTC',
  };
  const timeClassDeparture = dateClass(startDatetime, actualStartDatetime);
  const timeClassArrival = dateClass(endDatetime, actualEndDatetime);
  const delta = Math.round((ed - endDatetime) / 60);
  let timeStatus = t('flights.statuses.on_time');
  if (delta > 0) {
    timeStatus = `${t('flights.statuses.later')} ${durationToLocaleString(delta, locale)}`;
  } else if (delta < 0) {
    timeStatus = `${t('flights.statuses.earlier')} ${durationToLocaleString(Math.abs(delta), locale)}`;
  }
  timeStatus = timeStatus.toLocaleLowerCase();

  const flag =
    arrivalAirportData?.country_code !== departureAirportData?.country_code
      ? flags.find((x) => x.country_code === arrivalAirportData?.country_code)
          ?.flag
      : null;

  const tresholdDate = new Date();
  tresholdDate.setHours(tresholdDate.getHours() - 1);
  const { gestures, animatedStyle } = makeCardGestures(
    flightId,
    isArchived,
    tresholdDate < arrivalDate,
  );

  return (
    <GestureDetector gesture={gestures}>
      <View collapsable={false}>
        <Animated.View
          style={[
            {
              marginBottom: 16,
              borderRadius: 12,
              borderColor: colorSurfaceVariant,
              borderWidth: 2,
            },
            animatedStyle,
          ]}
        >
          <View className="radius-md b-1 bordercolor-outline bg-background flex-column elevated">
            <View className="flex-row justifycontent-start radiustr-md radiustl-md alignitems-center p-md bb-1 bordercolor-outlineVariant bg-secondaryContainer">
              <Image
                className="radius-md b-1 bordercolor-secondaryContainer"
                recyclingKey={airline}
                source={airlineLogoUri(airline)}
                style={{ width: 64, height: 64, backgroundColor: '#FFFFFF' }}
              />
              <View className="flex-column ml-md">
                <Text className="size-sm weight-bold mb-xs color-gray">
                  {`${airline} ${flightNumber}, ${dateLabel.toLocaleUpperCase()}`}
                </Text>
                <Text className="color-secondaryContainer size-md">
                  {departureAirportData?.municipality_name ?? ''} ➜
                </Text>
                <Text className="color-secondaryContainer size-mdl">
                  {`${arrivalAirportData?.municipality_name ?? ''} ${flag ?? ''}`}
                </Text>
              </View>
            </View>
            <View className="flex-column justifycontent-start alignitems-top pt-md px-md pb-xs">
              <View className="flex-row justifycontent-between alignitems-center">
                <Text className="size-lg color-surface mr-md weight-bold">
                  {departureAirportData?.iata_code}
                </Text>
                <Text
                  className="size-sm color-surface align-right"
                  ellipsizeMode="tail"
                  numberOfLines={2}
                  style={{ width: '80%' }}
                >
                  {departureAirportData?.airport_name}
                </Text>
              </View>
            </View>
            <View className="flex-row px-md justifycontent-between alignitems-start">
              <View className="flex-column">
                <Text
                  className={`size-lg ${!!timeClassDeparture ? `color-${timeClassDeparture}` : 'color-primaryContainer'}`}
                  style={{ marginTop: -2 }}
                >
                  {departureDate.toLocaleTimeString(
                    locale,
                    departureTimeOptions,
                  )}
                </Text>
              </View>
              <View className="flex-column justifycontent-center alignitems-center alignself-end">
                {departureTerminal && (
                  <Text
                    className="size-sm color-surface mb-sm"
                    style={{ marginTop: 2, fontVariant: ['small-caps'] }}
                  >
                    {departureTerminal
                      ? `${t('flights.terminal').toLocaleLowerCase()} ${departureTerminal}`
                      : ''}
                  </Text>
                )}
              </View>
            </View>
            <View className="flex-row justifycontent-center alignitems-center px-md py-md">
              <View
                className="bg-background px-sm"
                style={{ position: 'absolute', top: 7, zIndex: 1 }}
              >
                <Text className="size-sm" style={{ color: colorN70 }}>
                  {`${durationString} • ${distanceString}`}
                </Text>
              </View>
              <View
                style={{
                  height: 1,
                  width: '100%',
                  borderColor: colorN70,
                  borderWidth: 0.5,
                  borderStyle: 'dotted',
                  zIndex: 0,
                }}
              />
            </View>
            <View className="flex-column justifycontent-start alignitems-top pb-sm px-md">
              <View className="flex-row justifycontent-between alignitems-center">
                <Text className="size-xxl color-surface mr-md weight-bold">
                  {arrivalAirportData?.iata_code}
                </Text>
                <Text
                  className="size-md color-surface align-right"
                  ellipsizeMode="tail"
                  numberOfLines={2}
                  style={{ width: '70%' }}
                >
                  {arrivalAirportData?.airport_name}
                </Text>
              </View>
            </View>
            <View className="flex-row px-md justifycontent-between alignitems-start pb-md">
              <View className="flex-column alignitems-center">
                <Text
                  className={`size-xxl ${!!timeClassArrival ? `color-${timeClassArrival}` : 'color-green'}`}
                  style={{ marginTop: -2 }}
                >
                  {arrivalDate.toLocaleTimeString(locale, arrivalTimeOptions)}
                </Text>
                <Text
                  className={`size-sm ${!!timeClassArrival ? `color-${timeClassArrival}` : 'color-green'}`}
                  style={{ fontVariant: ['small-caps'], marginTop: -1 }}
                >
                  {`${timeStatus}`}
                </Text>
              </View>
              <View className="flex-column justifycontent-center alignitems-center alignself-end">
                {baggageBelt && (
                  <View className="flex-row justifycontent-center alignitems-center radius-md bg-primaryContainer py-xs pr-md">
                    <SvgBaggageBelt
                      color={colorPrimaryContainer}
                      style={{
                        width: 40,
                        height: 40,
                        marginLeft: 12,
                        marginTop: -4,
                        marginBottom: -4,
                      }}
                    />
                    <Text className="size-lg weight-bold color-primaryContainer ml-xs">
                      {baggageBelt || '—'}
                    </Text>
                  </View>
                )}
                <Text
                  className={`size-sm color-${arrivalTerminal ? 'surface' : 'backgroundContainer'}`}
                  style={{ marginTop: 2, fontVariant: ['small-caps'] }}
                >
                  {`${t('flights.terminal').toLocaleLowerCase()} ${arrivalTerminal ?? '—'}`}
                </Text>
              </View>
            </View>
            <View
              className="flex-row justifycontent-between alignitems-center py-md px-md bt-1 bordercolor-outlineVariant"
              style={{
                borderStyle: 'dotted',
                borderTopWidth: 0.8,
                display:
                  !!airportWeather || isDifferentTimezone ? undefined : 'none',
              }}
            >
              <View className="flex-row justifycontent-center alignitems-center">
                {isDifferentTimezone ? (
                  <>
                    <SvgTimezoneAlert
                      color={colorPrimaryContainer}
                      style={{ width: 16, height: 16 }}
                    />
                    <Text
                      className="size-sm color-primaryContainer ml-xs"
                      style={{ fontVariant: ['small-caps'] }}
                    >
                      {t('messages.different_timezone')}
                    </Text>
                  </>
                ) : (
                  <Text
                    className="size-sm color-primaryContainer ml-xs"
                    style={{ fontVariant: ['small-caps'] }}
                  >
                    {t('messages.welcome').toLocaleLowerCase()}
                  </Text>
                )}
              </View>
              <View className="flex-row justifycontent-end alignitems-center alignself-end">
                {airportWeather && (
                  <Text className="size-lg color-primaryContainer align-right">
                    {airportWeather.temperatureOut}
                  </Text>
                )}
                {airportWeather?.icons && airportWeather?.icons.length > 0
                  ? airportWeather.icons
                  : null}
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
