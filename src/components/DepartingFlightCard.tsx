import React, { useMemo } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image as _Image } from 'expo-image';
import { router } from 'expo-router';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Text, View, createPicassoComponent } from 'react-native-picasso';
import type { DepartingFlightCardData } from '@/types';
import { dateClass, makeDateLabel, durationToLocaleString } from '@/helpers/datetime';
import { useLocale } from '@/helpers/localization';
import { useThemeColor, usePaletteColor } from '@/hooks/useColors';
import { getAirportData, airlineLogoUri } from '@/helpers/airdata';
import t from '@/helpers/localization';
import flags from '@/constants/flags.json';
import Animated, { runOnJS } from 'react-native-reanimated';
import { makeCardGestures } from '@/helpers/gestures';
import { openUrl } from '@/helpers/common';


const Image = createPicassoComponent(_Image);

export default function DepartingFlightCard(props: { data: DepartingFlightCardData }) {
  const locale = useLocale();

  const { airline, flightNumber, startDatetime, actualStartDatetime, departureAirport, arrivalAirport,
    actualEndDatetime, endDatetime, departureTerminal, departureGate, arrivalTerminal, flightId, isArchived,
    departureCheckInDesk, state, stateTime, boardingPass, departureAirportTimezone, arrivalAirportTimezone, 
    isOnlineCheckInOpen, onlineCheckInLink, seatNumber, } = props.data;

  const sd = actualStartDatetime ?? startDatetime;
  const ed = actualEndDatetime ?? endDatetime;
  const departureAirportData = getAirportData(departureAirport, locale);
  const arrivalAirportData = getAirportData(arrivalAirport, locale);
  const departureDate = new Date(sd * 1000);
  const arrivalDate = new Date(ed * 1000);
  const dateLabel = makeDateLabel(departureDate, departureAirportTimezone, arrivalDate, arrivalAirportTimezone, locale);
  const durationString = durationToLocaleString(Math.round((ed - sd) / 60), locale);
  const distanceString = `${props.data.distance.toLocaleString(locale)}${t('measurements.km')}`;
  const stateTimeString = stateTime ? durationToLocaleString(stateTime, locale) : '';

  const departureTimeOptions = useMemo(() => ({
    hour: 'numeric',
    minute: 'numeric',
    dayPeriod: 'short',
    timeZone: departureAirportTimezone ?? 'UTC'
  }), [departureAirportTimezone]);
  const arrivalTimeOptions = useMemo(() => ({
    hour: 'numeric',
    minute: 'numeric',
    dayPeriod: 'short',
    timeZone: arrivalAirportTimezone ?? 'UTC'
  }), [arrivalAirportTimezone]);
  const timeClassDeparture = dateClass(startDatetime, actualStartDatetime) ?? 'green';
  const timeClassArrival = dateClass(endDatetime, actualEndDatetime);

  const arrivalFlag = arrivalAirportData?.country_code !== departureAirportData?.country_code ?
    flags.find(x => x.country_code === arrivalAirportData?.country_code)?.flag : null;

  const showBoardingPass = () => router.push({ pathname: '/pass', params: {pkpass: JSON.stringify(boardingPass)} });
  const tap = Gesture.Tap()
    .onEnd(() => {
      runOnJS(showBoardingPass)();
    });

  const tapLink = Gesture.Tap()
    .onEnd(() => {
      runOnJS(openUrl)(onlineCheckInLink ?? '');
    })

  const tresholdDate = new Date();
  tresholdDate.setHours(tresholdDate.getHours() - 1);
  const { gestures, animatedStyle } = makeCardGestures(flightId, isArchived, tresholdDate < arrivalDate, tap);

  const colorPrimary = useThemeColor('colors.surfaceVariant');
  const colorPrimaryContainer = useThemeColor('textColors.primaryContainer');

  const onlineCheckInText = (
    <Text
      className='size-sm color-primaryContainer mr-sm'
      style={{ fontVariant: ['small-caps'] }}
    >
      { `${t('flights.statuses.online_check_in_available').toLocaleLowerCase()}` }
    </Text>
  );

  return (
    <GestureDetector gesture={gestures}>
      <View collapsable={false}>
        <Animated.View
          style={[{ marginBottom: 16, borderRadius: 12, borderColor: colorPrimary, borderWidth: 2 }, animatedStyle]}
        >
          <View
            className='radius-md b-1 bordercolor-outline bg-background flex-column elevated'
          >
            <View className='flex-row justifycontent-start radiustr-md radiustl-md alignitems-center p-md bb-1 bordercolor-outlineVariant bg-secondaryContainer'>
              <Image
                className='radius-md b-1 bordercolor-secondaryContainer'
                recyclingKey={airline}
                source={airlineLogoUri(airline)}
                style={{ width: 64, height: 64, backgroundColor: '#FFFFFF' }}
              />
              <View className='flex-column ml-md'>
                <Text
                  className='size-sm weight-bold mb-xs color-gray'
                >
                  { `${airline} ${flightNumber}, ${dateLabel.toLocaleUpperCase()}` }
                </Text>
                <Text className='color-secondaryContainer size-mdl' >
                  {departureAirportData?.municipality_name ?? ''}
                </Text>
                <Text className='color-secondaryContainer size-md' >
                  ➜ {`${arrivalAirportData?.municipality_name ?? ''} ${arrivalFlag ?? ''}`}
                </Text>
              </View>
            </View>
            { (!!state || !!boardingPass) &&
              <View
                className='flex-row justifycontent-between alignitems-center p-md bb-1 bordercolor-outlineVariant'
                style={{
                  borderStyle:'dotted',
                  borderBottomWidth: 0.8,
                }}
              >
                <View className='flex-row justifycontent-start alignitems-center'>
                  { !!state  && !!stateTimeString ?
                    <>
                      <FontAwesome5
                        color={colorPrimaryContainer}
                        name='clock'
                        size={12}
                      />
                      <Text
                        className='size-sm color-primaryContainer ml-xs'
                        style={{ fontVariant: ['small-caps'] }}
                      >
                        { `${t('flights.statuses.' + state).toLocaleLowerCase()}` }
                      </Text>
                      <Text
                        className='size-sm color-primaryContainer weight-bold'
                        style={{ fontVariant: ['small-caps'] }}
                      >
                        &nbsp;{ `${stateTimeString}` }
                      </Text>
                    </>
                    :
                    <Text
                      className='size-sm color-primaryContainer ml-xs'
                      style={{ fontVariant: ['small-caps'] }}
                    >
                      { !!state ? `${t('flights.statuses.' + state).toLocaleLowerCase()}` : `${t('flights.whishes').toLocaleLowerCase()}` }
                    </Text>
                  }
                </View>
                { boardingPass &&
                  <View className='flex-row justifycontent-end alignitems-center'>
                    { seatNumber && seatNumber !== '' &&
                      <Text className='weight-bold size-md color-primaryContainer'>{ seatNumber }</Text>
                    }
                    <GestureDetector gesture={ tap }>
                      <View collapsable={false}>
                        <FontAwesome5
                          color={colorPrimaryContainer}
                          name='barcode'
                          size={24}
                          style={{ margin: 0, marginLeft: 12 }}
                        />
                      </View>
                    </GestureDetector>
                  </View>
                }
              </View>
            }
            <View className='flex-column justifycontent-start alignitems-top py-sm px-md'>
              <View className='flex-row justifycontent-between alignitems-center'>
                <Text
                  className='size-xxl color-surface mr-md weight-bold'
                >
                  { departureAirportData?.iata_code }
                </Text>
                <Text
                  className='size-md color-surface align-right'
                  ellipsizeMode='tail'
                  numberOfLines={2}
                  style={{ width: '70%' }}
                >
                  { departureAirportData?.airport_name }
                </Text>
              </View>
            </View>
            <View
              className='flex-row px-md justifycontent-between alignitems-start'
            >
              <View className='flex-column alignitems-center'>
                <Text
                  className={`size-xxl ${!!timeClassDeparture ? `color-${timeClassDeparture}` : 'color-green'}`}
                  style={{ marginTop: -2 }}
                >
                  {departureDate.toLocaleTimeString(locale, departureTimeOptions as Intl.DateTimeFormatOptions)}
                </Text>
                <Text
                  className={`size-sm ${!!timeClassDeparture ? `color-${timeClassDeparture}` : 'color-green'}`}
                  style={{ fontVariant: ['small-caps'], marginTop: -1 }}
                >
                  {`${t('flights.statuses.' + (timeClassDeparture === 'green' ? 'on_time' : 'delayed')).toLocaleLowerCase()}`}
                </Text>
              </View>
              <View
                className='flex-column justifycontent-center alignitems-center alignself-end'
              >
                {(departureGate || (departureCheckInDesk && !seatNumber)) &&
                  <View
                    className='flex-row justifycontent-center alignitems-center radius-md bg-primaryContainer py-xs px-md'
                  >
                    <FontAwesome5
                      color={colorPrimaryContainer}
                      name={!!departureGate ? 'arrow-right' : 'suitcase'}
                      size={20}
                      style={{ marginTop: 1 }}
                    />
                    <Text
                      className='size-lg weight-bold color-primaryContainer ml-xs'
                    >
                      { departureGate || departureCheckInDesk || '—' }
                    </Text>
                  </View>
                }
                <Text
                  className={`size-sm color-${departureTerminal ? 'surface' : 'backgroundContainer'}`}
                  style={{ marginTop: 2, fontVariant: ['small-caps'] }}
                >
                  { `${t('flights.terminal').toLocaleLowerCase()} ${departureTerminal ?? '—'}` }
                </Text>
              </View>
            </View>
            <View className='flex-row justifycontent-center alignitems-center px-md py-md'>
              <View className='bg-background px-sm'
                style={{ position: 'absolute', top: 7, zIndex: 1 }}
              >
                <Text
                  className='size-sm'
                  style={{ color: usePaletteColor('N-70')}}
                >
                  { `${durationString} • ${distanceString}` }
                </Text>
              </View>
              <View style={{
                height: 1, width: '100%',
                borderColor: usePaletteColor('N-70'),
                borderWidth:0.5, borderStyle:'dotted',
                zIndex: 0,
                }}
              />
            </View>
            <View className='flex-column justifycontent-start alignitems-top px-md pb-xs'>
              <View className='flex-row justifycontent-between alignitems-center'>
                <Text
                  className='size-lg color-surface mr-md weight-bold'
                >
                  { arrivalAirportData?.iata_code }
                </Text>
                <Text
                  className='size-sm color-surface align-right'
                  ellipsizeMode='tail'
                  numberOfLines={2}
                  style={{ width: '80%' }}
                >
                  { arrivalAirportData?.airport_name }
                </Text>
              </View>
            </View>
            <View
              className='flex-row px-md pb-md justifycontent-between alignitems-start'
            >
              <View className='flex-column'>
                <Text
                  className={`size-lg ${!!timeClassArrival ? `color-${timeClassArrival}` : 'color-primaryContainer'}`}
                  style={{ marginTop: -2 }}
                >
                  {arrivalDate.toLocaleTimeString(locale, arrivalTimeOptions as Intl.DateTimeFormatOptions)}
                </Text>
              </View>
              <View
                className='flex-column justifycontent-center alignitems-center alignself-end'
              >
                { arrivalTerminal &&
                  <Text
                    className='size-sm color-surface mb-sm'
                    style={{ marginTop: 2, fontVariant: ['small-caps'] }}
                  >
                    { arrivalTerminal ? `${t('flights.terminal').toLocaleLowerCase()} ${arrivalTerminal}` : '' }
                  </Text>
                }
              </View>
            </View>
            {
              isOnlineCheckInOpen && !seatNumber &&
              <View
                className='p-md bt-1 bordercolor-outlineVariant'
                style={{
                  borderStyle:'dotted',
                  borderTopWidth: 0.8,
                }}
              >
                { !!onlineCheckInLink ?
                  <GestureDetector gesture={ tapLink }
                  >
                    <View collapsable={false}>
                      <View
                        className='flex-row justifycontent-start alignitems-center'
                      >
                        { onlineCheckInText }
                        <FontAwesome5
                          color={ colorPrimaryContainer }
                          name='external-link-alt'
                          size={12}
                        />
                      </View>
                    </View>
                  </GestureDetector>
                  :
                  onlineCheckInText
                }
              </View>
            }
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
