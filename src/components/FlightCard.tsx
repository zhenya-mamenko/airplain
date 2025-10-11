import React, { useMemo } from 'react';
import { View, Text, createPicassoComponent } from 'react-native-picasso';
import t, { useLocale } from '@/helpers/localization';
import { Image as _Image } from 'expo-image';
import { durationToLocaleString, makeDateLabel } from '@/helpers/datetime';
import { usePaletteColor, useThemeColor } from '@/hooks/useColors';
import {
  SvgArrow,
  SvgArrowLong,
  SvgCross,
  SvgLine,
  SvgPlane,
} from '@/constants/svg';
import flags from '@/constants/flags.json';
import { dateClass } from '@/helpers/datetime';
import type { FlightCardData, FlightStatus } from '@/types';
import { airlineLogoUri, getAirportData } from '@/helpers/airdata';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import { makeCardGestures } from '@/helpers/gestures';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { openUrl } from '@/helpers/common';

const Image = createPicassoComponent(_Image);

const PlaceBlock = React.memo(
  (props: {
    actual: number;
    airport: string;
    align: 'start' | 'end';
    city: string;
    country: string;
    date: string;
    planned: number;
    timeOptions: any;
  }) => {
    const locale = useLocale();

    const flag = flags.find((x) => x.country_code === props.country)?.flag;

    const airport = (
      <Text
        className="size-lg alignself-start weight-bold color-surface"
        style={{ marginTop: 0, marginBottom: -4, fontSize: 28 }}
      >
        {props.airport}
      </Text>
    );
    const timeClass = dateClass(props.planned, props.actual);
    const actualTime = (
      <Text
        className={`size-md color-surface alignself-end weight-bold m${props.align === 'start' ? 'l' : 'r'}-sm ${!!timeClass ? `color-${timeClass}` : ''}`}
      >
        {props.date}
      </Text>
    );
    const hiddenAirport = (
      <Text
        className="size-lg alignself-start weight-bold"
        style={{ fontSize: 28, color: 'transparent', height: 16 }}
      >
        {props.airport}
      </Text>
    );
    const plannedTime = (
      <Text
        className={`size-sm color-surface m${props.align === 'start' ? 'l' : 'r'}-sm`}
        style={{
          textDecorationLine: 'line-through',
          textDecorationStyle: 'solid',
        }}
      >
        {new Date(props.planned * 1000).toLocaleTimeString(
          locale,
          props.timeOptions,
        )}
      </Text>
    );
    const cityText = (
      <Text
        className={`size-sm alignself-${props.align} color-primaryContainer`}
        ellipsizeMode="tail"
        key={`city-${props.align}`}
        numberOfLines={1}
      >
        {props.city}
      </Text>
    );
    const flagText = (
      <Text
        className={`size-sm alignself-${props.align} color-primaryContainer m${props.align === 'start' ? 'r' : 'l'}-xs`}
        key={`flag-${props.align}`}
        style={{ width: 16 }}
      >
        {flag}
      </Text>
    );

    return (
      <View className="flex-column" style={{ width: '40%' }}>
        <View className={`flex-row justifycontent-${props.align}`}>
          {props.align === 'start'
            ? [flagText, cityText]
            : [cityText, flagText]}
        </View>
        <View className={`flex-row justifycontent-${props.align}`}>
          {props.align === 'start' ? airport : actualTime}
          {props.align === 'start' ? actualTime : airport}
        </View>
        {!!dateClass(props.planned, props.actual) ? (
          <View className={`flex-row justifycontent-${props.align}`}>
            {props.align === 'start' ? hiddenAirport : plannedTime}
            {props.align === 'start' ? plannedTime : hiddenAirport}
          </View>
        ) : null}
      </View>
    );
  },
);

const RouteSymbol = React.memo((props: { status: FlightStatus }) => {
  switch (props.status) {
    case 'canceled':
      return (
        <SvgCross
          color={useThemeColor('textColors.red')}
          style={{ width: 24, height: 24 }}
        />
      );
    case 'arrived':
      return (
        <View className="flex-row justifycontent-around alignitems-center">
          <SvgLine
            color={useThemeColor('textColors.surface')}
            style={{ width: 48, height: 24, marginRight: -4 }}
          />
          <SvgPlane
            color={useThemeColor('textColors.surface')}
            style={{ width: 16, height: 16 }}
          />
        </View>
      );
    case 'departed':
    case 'en_route':
      return (
        <View className="flex-row justifycontent-center alignitems-center">
          <SvgArrowLong
            color={useThemeColor('textColors.surface')}
            style={{ width: 60, height: 24, marginLeft: -22 }}
          />
          <SvgPlane
            color={useThemeColor('colors.primary')}
            style={{ width: 16, height: 16, marginLeft: -38 }}
          />
        </View>
      );
    case 'delayed':
      return (
        <View className="flex-row justifycontent-around alignitems-center">
          <SvgPlane
            color={usePaletteColor('T-50')}
            style={{ width: 16, height: 16 }}
          />
          <SvgArrow
            color={useThemeColor('textColors.surface')}
            style={{ width: 48, height: 24, marginLeft: -4 }}
          />
        </View>
      );
    default:
      return (
        <View className="flex-row justifycontent-around alignitems-center">
          <SvgPlane
            color={useThemeColor('textColors.surface')}
            style={{ width: 16, height: 16 }}
          />
          <SvgLine
            color={useThemeColor('textColors.surface')}
            style={{ width: 48, height: 24, marginLeft: -4 }}
          />
        </View>
      );
  }
});

const FlightCard = React.memo(
  (props: { data: FlightCardData; noGestures?: boolean }) => {
    const {
      departureAirport,
      arrivalAirport,
      actualEndDatetime,
      actualStartDatetime,
      endDatetime,
      startDatetime,
      status,
      distance,
      departureAirportTimezone,
      arrivalAirportTimezone,
      airline,
      flightNumber,
      flightId,
      isArchived,
      isOnlineCheckInOpen,
      onlineCheckInLink,
      seatNumber,
      state,
      stateTime,
    } = props.data;

    const locale = useLocale();

    const sd = actualStartDatetime ?? startDatetime;
    const ed = actualEndDatetime ?? endDatetime;
    const durationString = durationToLocaleString(
      Math.round((ed - sd) / 60),
      locale,
    );
    const distanceString = `${distance.toLocaleString(locale)}${t('measurements.km')}`;
    const departureDate = new Date(sd * 1000);
    const arrivalDate = new Date(ed * 1000);

    const departureAirportData = getAirportData(departureAirport, locale);
    const arrivalAirportData = getAirportData(arrivalAirport, locale);

    const departureTimeOptions = useMemo(
      () => ({
        hour: 'numeric',
        minute: 'numeric',
        dayPeriod: 'short',
        timeZone: departureAirportTimezone ?? 'UTC',
      }),
      [departureAirportTimezone],
    );
    const arrivalTimeOptions = useMemo(
      () => ({
        hour: 'numeric',
        minute: 'numeric',
        dayPeriod: 'short',
        timeZone: arrivalAirportTimezone ?? 'UTC',
      }),
      [arrivalAirportTimezone],
    );

    const dateLabel = makeDateLabel(
      departureDate,
      departureAirportTimezone ?? 'UTC',
      arrivalDate,
      arrivalAirportTimezone ?? 'UTC',
      locale,
    );
    const stateTimeString = stateTime
      ? durationToLocaleString(stateTime, locale)
      : '';

    const tap = Gesture.Tap().onEnd(() => {
      runOnJS(openUrl)(onlineCheckInLink ?? '');
    });
    const tresholdDate = new Date();
    tresholdDate.setHours(tresholdDate.getHours() - 1);
    const { gestures, animatedStyle } = makeCardGestures(
      flightId,
      isArchived,
      tresholdDate < arrivalDate,
      tap,
    );

    const colorPrimary = useThemeColor('colors.surfaceVariant');
    const colorPrimaryContainer = useThemeColor('textColors.primaryContainer');

    const onlineCheckInText = (
      <Text
        className="size-sm color-primaryContainer mr-sm"
        style={{ fontVariant: ['small-caps'] }}
      >
        {`${t('flights.statuses.online_check_in_available').toLocaleLowerCase()}`}
      </Text>
    );

    const component = (
      <View collapsable={false}>
        <View className="radius-md b-1 bordercolor-outline bg-background flex-column elevated">
          <View className="radiustr-md radiustl-md px-md py-sm bb-1 bordercolor-outlineVariant bg-secondaryContainer flex-row justifycontent-between alignitems-center">
            <View className="flex-row justifycontent-start alignitems-center">
              <Image
                className="radius-xs b-1 bordercolor-secondaryContainer"
                recyclingKey={airline}
                source={airlineLogoUri(airline)}
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: '#FFFFFF',
                  marginTop: 2,
                }}
              />
              <Text className="size-smm weight-bold mt-xs ml-sm color-gray">
                {`${airline} ${flightNumber}`}
              </Text>
            </View>
            <Text className="size-sm weight-bold mt-xs color-gray">
              {`${dateLabel.toLocaleUpperCase()}`}
            </Text>
          </View>
          <View className="px-md pb-md pt-md radiusbr-md radiusbl-md bg-background flex-row justifycontent-between">
            <PlaceBlock
              actual={actualStartDatetime ?? startDatetime}
              airport={departureAirport}
              align="start"
              city={departureAirportData?.municipality_name ?? ''}
              country={departureAirportData?.country_code ?? ''}
              date={departureDate.toLocaleTimeString(
                locale,
                departureTimeOptions as Intl.DateTimeFormatOptions,
              )}
              planned={startDatetime}
              timeOptions={departureTimeOptions}
            />
            <View
              className="flex-column justifycontent-end alignitems-center"
              style={{ width: '20%' }}
            >
              <Text className="size-sm color-primaryContainer mt-xs">
                {status !== 'canceled' ? distanceString : null}
              </Text>
              <RouteSymbol status={status} />
              <Text
                className="size-sm color-primaryContainer"
                style={{ marginTop: -4 }}
              >
                {status !== 'canceled'
                  ? durationString
                  : t(`flights.statuses.${status}`)}
              </Text>
            </View>
            <PlaceBlock
              actual={actualEndDatetime ?? endDatetime}
              airport={arrivalAirport}
              align="end"
              city={arrivalAirportData?.municipality_name ?? ''}
              country={arrivalAirportData?.country_code ?? ''}
              date={arrivalDate.toLocaleTimeString(
                locale,
                arrivalTimeOptions as Intl.DateTimeFormatOptions,
              )}
              planned={endDatetime}
              timeOptions={arrivalTimeOptions}
            />
          </View>
          {((isOnlineCheckInOpen &&
            !seatNumber &&
            !['en_route', 'departed'].includes(state ?? '')) ||
            !!state) && (
            <View
              className="p-md bt-1 bordercolor-outlineVariant flex-row justifycontent-start alignitems-center"
              style={{
                borderStyle: 'dotted',
                borderTopWidth: 0.8,
              }}
            >
              {!!onlineCheckInLink && !state ? (
                <GestureDetector gesture={tap}>
                  <View collapsable={false}>
                    <View className="flex-row justifycontent-start alignitems-center">
                      {onlineCheckInText}
                      <FontAwesome5
                        color={colorPrimaryContainer}
                        name="external-link-alt"
                        size={12}
                      />
                    </View>
                  </View>
                </GestureDetector>
              ) : !state ? (
                onlineCheckInText
              ) : null}
              {!!state && !!stateTimeString ? (
                <>
                  <FontAwesome5
                    color={colorPrimaryContainer}
                    name="clock"
                    size={12}
                  />
                  <Text
                    className="size-sm color-primaryContainer ml-xs"
                    style={{ fontVariant: ['small-caps'] }}
                  >
                    {`${t('flights.statuses.' + state).toLocaleLowerCase()}`}
                  </Text>
                  <Text
                    className="size-sm color-primaryContainer weight-bold"
                    style={{ fontVariant: ['small-caps'] }}
                  >
                    &nbsp;{`${stateTimeString}`}
                  </Text>
                </>
              ) : (
                <Text
                  className="size-sm color-primaryContainer ml-xs"
                  style={{ fontVariant: ['small-caps'] }}
                >
                  {!!state
                    ? `${t('flights.statuses.' + state).toLocaleLowerCase()}`
                    : !onlineCheckInText
                      ? `${t('flights.whishes').toLocaleLowerCase()}`
                      : null}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    );

    return !!props.noGestures ? (
      component
    ) : (
      <GestureDetector gesture={gestures}>
        <View collapsable={false}>
          <Animated.View
            style={[
              {
                marginBottom: 16,
                borderRadius: 12,
                borderColor: colorPrimary,
                borderWidth: 2,
              },
              animatedStyle,
            ]}
          >
            {component}
          </Animated.View>
        </View>
      </GestureDetector>
    );
  },
  (
    prevProps: { data: FlightCardData; noGestures?: boolean },
    nextProps: { data: FlightCardData; noGestures?: boolean },
  ) => {
    return (
      prevProps.noGestures === nextProps.noGestures &&
      prevProps.data.flightId === nextProps.data.flightId &&
      prevProps.data.state === nextProps.data.state &&
      prevProps.data.stateTime === nextProps.data.stateTime &&
      prevProps.data.status === nextProps.data.status &&
      prevProps.data.actualStartDatetime ===
        nextProps.data.actualStartDatetime &&
      prevProps.data.actualEndDatetime === nextProps.data.actualEndDatetime &&
      prevProps.data.startDatetime === nextProps.data.startDatetime &&
      prevProps.data.endDatetime === nextProps.data.endDatetime &&
      prevProps.data.departureAirport === nextProps.data.departureAirport &&
      prevProps.data.arrivalAirport === nextProps.data.arrivalAirport &&
      prevProps.data.distance === nextProps.data.distance &&
      prevProps.data.departureAirportTimezone ===
        nextProps.data.departureAirportTimezone &&
      prevProps.data.arrivalAirportTimezone ===
        nextProps.data.arrivalAirportTimezone &&
      prevProps.data.airline === nextProps.data.airline &&
      prevProps.data.flightNumber === nextProps.data.flightNumber &&
      prevProps.data.isArchived === nextProps.data.isArchived &&
      prevProps.data.isOnlineCheckInOpen ===
        nextProps.data.isOnlineCheckInOpen &&
      prevProps.data.onlineCheckInLink === nextProps.data.onlineCheckInLink &&
      prevProps.data.seatNumber === nextProps.data.seatNumber
    );
  },
);

export default FlightCard;
