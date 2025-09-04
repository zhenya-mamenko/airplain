import Button from '@/components/Button';
import Separator from '@/components/Separator';
import DatetimeInput from '@/components/DatetimeInput';
import React, { useReducer, useRef, useState } from 'react';
import { Select } from '@/components/Select';
import airports from '@/constants/airports.json';
import { haversine, showConfirmation } from '@/helpers/common';
import t from '@/helpers/localization'
import type { Flight, FlightStatus, PKPassData } from '@/types';
import useDynamicColorScheme from '@/hooks/useDynamicColorScheme';
import useTheme from '@/hooks/useTheme';
import { KeyboardAvoidingView, Pressable, ToastAndroid, ScrollView } from 'react-native';
import { Text, View, ThemeProvider, TextInput } from 'react-native-picasso';
import { fromLocaltoLocalISOString, fromLocaltoUTCISOString, fromUTCtoLocalISOString, replaceTimeZone } from '@/helpers/datetime';
import { getFlightData } from '@/helpers/flights';
import { isFlightExists, inserPassengerFromBCBP, insertFlight } from '@/helpers/sqlite';
import { router } from 'expo-router';
import { useLocale } from '@/helpers/localization';
import { useThemeColor } from '@/hooks/useColors';
import LoadBCBPOptions from '@/components/LoadBCBP';
import { BCBPData } from '@/helpers/boardingpass';
import { refreshFlights } from '@/helpers/common';
import { getAirlineData, getAirlinesData } from '@/helpers/airdata';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';


export default function AddFlight(props: { today?: Date }) {
  const today = fromUTCtoLocalISOString((props.today ?? new Date()).toISOString(), 'UTC');
  const themeName = useDynamicColorScheme() || 'light';
  const theme = useTheme(themeName);
  const locale = useLocale();
  const l = locale.split('-')[0];

  const initialState = {
    add: {
      airline: '',
      airlineName: '',
      arrivalAirport: undefined as string | undefined,
      arrivalAirportTimezone: 'UTC',
      arrivalDate: today,
      arrivalTime: today,
      departureAirport: undefined as string | undefined,
      departureAirportTimezone: 'UTC',
      departureDate: today,
      departureTime: today,
      flightNumber: '',
    },
    bcbp: {
      data: undefined as BCBPData | undefined,
      format: '',
      pkpass: undefined as PKPassData | undefined,
    },
    search: {
      airline: '',
      flightNumber: '',
      departureDate: today,
    },
    visibility: {
      addManuallyForm: false,
      searchForm: true,
    },
  };
  const reducer = (state: any, action: any) => {
    const { type, value } = action;
    const result: any = {};
    result[type] = { ...state[type], ...value };
    return { ...state, ...result };
  }
  const [state, dispatch] = useReducer(reducer, initialState);

  const colorPrimaryContainer = useThemeColor('textColors.primaryContainer');
  const colorSurfaceVariant = useThemeColor('colors.surfaceVariant');

  const [processing, setProcessing] = useState(false);

  const processManuallyAdd = async () => {
    setProcessing(true);
    const arrivalAirport = airports.find(x => x.iata_code === state.add.arrivalAirport);
    const departureAirport = airports.find(x => x.iata_code === state.add.departureAirport);
    const arrivalTimezone = arrivalAirport?.timezone || 'UTC';
    const departureTimezone = departureAirport?.timezone || 'UTC';
    const endDatetime = fromLocaltoLocalISOString(state.add.arrivalDate.substring(0, 10) + 'T' + state.add.arrivalTime.substring(11, 19), arrivalTimezone);
    const startDatetime = fromLocaltoLocalISOString(state.add.departureDate.substring(0, 10) + 'T' + state.add.departureTime.substring(11, 19), departureTimezone);
    const flight: Flight = {
      actualEndDatetime: endDatetime,
      actualStartDatetime: startDatetime,
      airline: state.add.airline,
      airlineName: state.add.airlineName,
      arrivalAirport: state.add.arrivalAirport,
      arrivalAirportTimezone: arrivalTimezone,
      arrivalCountry: arrivalAirport?.country_code ?? '',
      departureAirport: state.add.departureAirport,
      departureAirportTimezone: departureTimezone,
      departureCountry: departureAirport?.country_code ?? '',
      distance: Math.round(haversine(
        departureAirport?.airport_latitude ?? 0, departureAirport?.airport_longitude ?? 0,
        arrivalAirport?.airport_latitude ?? 0, arrivalAirport?.airport_longitude ?? 0
      )),
      endDatetime: endDatetime,
      extra: {},
      flightNumber: state.add.flightNumber,
      isArchived: state.add.departureDate < today,
      recordType: 2,
      startDatetime: startDatetime,
      status: 'scheduled' as FlightStatus,
      info: {},
    };
    if (await insertFlight(flight)) {
      refreshFlights(true, false);
      router.back();
    }
    setProcessing(false);
  }

  const addFlightManually = () => {
    dispatch({
      type: 'visibility',
      value: { addManuallyForm: true, searchForm: false },
    });
  }

  const updateFlightFromBCBP = async (flightId: number) => {
    if (await inserPassengerFromBCBP(flightId, state.bcbp.data, state.bcbp.format, state.bcbp.pkpass)) {
      router.back();
      ToastAndroid.show(t('messages.update_successfull'), ToastAndroid.SHORT);
    } else {
      ToastAndroid.show(t('messages.error_in_updating'), ToastAndroid.SHORT);
    }
  }

  const findFlight = async () => {
    setProcessing(true);
    const flightId = await isFlightExists(state.search.airline, state.search.flightNumber, state.search.departureDate.substring(0, 10));
    if (flightId) {
      const value = {
        closeButton: t('buttons.close'),
        confirmButton: t('buttons.update'),
        description: t('add.flight_already_added_description'),
        title: t('add.flight_already_added_title'),
        showOnlyCloseButton: true,
        onConfirm: () => { },
      };
      if (!!state.bcbp.data) {
        value.showOnlyCloseButton = false;
        value.description += '\n' + t('add.flight_already_added_description_bcbp');
        value.onConfirm = () => updateFlightFromBCBP(flightId);
      }
      setProcessing(false);
      showConfirmation(value);
    } else {
      const flight = await getFlightData(state.search.airline, state.search.flightNumber, state.search.departureDate.substring(0, 10));
      if (!!flight) {
        if (await insertFlight(flight)) {
          setProcessing(false);
          refreshFlights(true, false);
          router.back();
        }
      } else {
        const value = {
          closeButton: t('buttons.close'),
          confirmButton: t('buttons.add_manually'),
          description: t('add.flight_not_found_description'),
          title: t('add.flight_not_found_title'),
          showOnlyCloseButton: false,
          onConfirm: () => {
            addFlightManually();
            dispatch({
              type: 'add',
              value: {
                airline: state.search.airline,
                airlineName: getAirlineData(state.search.airline)?.airlineName ?? '',
                flightNumber: state.search.flightNumber,
                departureDate: state.search.departureDate,
              }
            });
          },
        };
        setProcessing(false);
        showConfirmation(value);
      }
    }
    setProcessing(false);
  }

  const refs = {
    searchAirline: useRef<any>(),
    searchFlightNumber: useRef<any>(),
    searchDate: useRef<any>(),
    airline: useRef<any>(),
    airlineName: useRef<any>(),
    flightNumber: useRef<any>(),
    departureAirport: useRef<any>(),
    departureDate: useRef<any>(),
    departureTime: useRef<any>(),
    arrivalAirport: useRef<any>(),
    arrivalDate: useRef<any>(),
    arrivalTime: useRef<any>(),
  }

  return (
    // @ts-ignore
    <ThemeProvider theme={theme}>
      <SafeAreaView
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          behavior='height'
          style={{ flex: 1 }}
        >
          <ScrollView
            keyboardShouldPersistTaps='always'
            style={{ flex: 1, backgroundColor: colorSurfaceVariant }}
          >
            {state.visibility.searchForm &&
              <View
                className='bg-surfaceVariant alignitems-start justifycontent-start p-md flex-column flex-1'
              >
                <Text
                  className='size-lg color-primaryContainer'
                >
                  {t('add.find_flight')}
                </Text>

                <Text
                  className='size-md color-primaryContainer mt-md mb-xs'
                  style={{ fontVariant: ['small-caps'] }}
                >
                  {t('add.airline').toLocaleLowerCase()}
                </Text>
                <View
                  className='flex-row'
                >
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => refs.searchAirline.current?.open()}
                  >
                    <View
                      className='flex-1 b-1 bg-background bordercolor-outline radius-sm alignitems-center justifycontent-center mr-lg'
                    >
                      <Text
                        className='color-surface weight-bold size-lg'
                        style={{ letterSpacing: 1, fontVariant: ['tabular-nums'] }}
                      >
                        {state.search.airline}
                      </Text>
                    </View>
                  </Pressable>
                  <View
                    className='flex-3'
                  >
                    <Select
                      className='color-surface bg-background b-1 bordercolor-outline radius-sm'
                      data={getAirlinesData().map((x: any) => { x['full'] = `${x.airlineCode} ${x['airlineName']}`; return x })}
                      dropdownRef={refs.searchAirline}
                      flatListProps={{}}
                      labelField='airlineName'
                      placeholder={t('add.select_airline')}
                      search
                      searchField='full'
                      showValue
                      value={state.search.airline}
                      valueField='airlineCode'
                      valueFixedWidth={40}
                      onChange={(item: any) => {
                        dispatch({ type: 'search', value: { airline: item.airlineCode } });
                        dispatch({ type: 'bcbp', value: { data: undefined, pkpass: undefined } });
                        refs.searchFlightNumber.current.focus();
                      }}
                    />
                  </View>
                </View>

                <View
                  className='flex-row'
                >
                  <View
                    className='flex-column flex-1'
                  >
                    <Text
                      className='size-md color-primaryContainer mb-sm mt-md'
                      style={{ fontVariant: ['small-caps'] }}
                    >
                      {t('add.flight_number').toLocaleLowerCase()}
                    </Text>
                    <TextInput
                      className='color-surface bg-background b-1 bordercolor-outline radius-sm size-md p-smm'
                      inputMode='numeric'
                      keyboardType='number-pad'
                      maxLength={4}
                      ref={refs.searchFlightNumber}
                      returnKeyType='next'
                      style={{ width: 75, letterSpacing: 1, fontVariant: ['tabular-nums'] }}
                      value={state.search.flightNumber}
                      onBlur={() => refs.searchDate.current.open()}
                      onChangeText={(text: string) => {
                        dispatch({ type: 'search', value: { flightNumber: text } });
                        dispatch({ type: 'bcbp', value: { data: undefined, pkpass: undefined } });
                      }}
                    />
                  </View>
                  <View
                    className='flex-column flex-1'
                  >
                    <Text
                      className='size-md color-primaryContainer mb-sm mt-md'
                      style={{ fontVariant: ['small-caps'] }}
                    >
                      {t('add.departure_date').toLocaleLowerCase()}
                    </Text>
                    <DatetimeInput
                      mode='date'
                      ref={refs.searchDate}
                      timezone='UTC'
                      value={state.search.departureDate}
                      onChange={(date: string) => dispatch({ type: 'search', value: { departureDate: date } })}
                    />
                  </View>
                </View>

                <View
                  className='mt-xl mb-sm flex-row justifycontent-between'
                  style={{ width: '100%' }}
                >
                  <Button
                    className='bg-primary px-lg'
                    disabled={
                      (state.search.flightNumber ?? '') === '' ||
                      (state.search.airline ?? '') === '' ||
                      processing
                    }
                    title={t('add.search')}
                    onPress={findFlight}
                  />

                  <Button
                    className='bg-surfaceVariant px-smm'
                    textClass='color-secondaryContainer'
                    textStyle={{ opacity: 0.68 }}
                    title={t('buttons.add_manually')}
                    onPress={addFlightManually}
                  />
                </View>

                <View
                  className='flex-row justifycontent-center alignitems-center pt-xl pb-lg'
                >
                  <View
                    className='bg-surfaceVariant px-sm'
                    style={{ position: 'absolute', top: 20, zIndex: 1 }}
                  >
                    <Text
                      className='size-md color-primaryContainer'
                      style={{ opacity: 0.6 }}
                    >
                      {t('add.or')}
                    </Text>
                  </View>
                  <View style={{
                    height: 1, width: '100%',
                    borderColor: colorPrimaryContainer,
                    borderWidth: 0.6, borderStyle: 'dotted',
                    zIndex: 0,
                    opacity: 0.5
                  }}
                  />
                </View>

                <Text
                  className='size-lg color-primaryContainer mb-lg'
                >
                  {t('add.load_bp')}
                </Text>

                <LoadBCBPOptions dispatch={dispatch} />

              </View>
            }
            {state.visibility.addManuallyForm &&
              <View
                className='bg-surfaceVariant alignitems-start justifycontent-start p-md flex-column flex-1'
              >
                <Text
                  className='size-lg color-primaryContainer'
                >
                  {t('add.fill_manually')}
                </Text>

                <Separator
                  borderColor={colorPrimaryContainer}
                  title={t('add.airline').toLocaleLowerCase()}
                />

                <View
                  className='flex-row'
                >
                  <View
                    className='flex-column flex-1'
                  >
                    <Text
                      className='size-md color-primaryContainer mb-sm'
                      style={{ fontVariant: ['small-caps'] }}
                    >
                      {t('add.airline_code').toLocaleLowerCase()}
                    </Text>
                    <TextInput
                      autoCapitalize='characters'
                      className='color-surface bg-background b-1 bordercolor-outline radius-sm size-md p-smm'
                      inputMode='text'
                      maxLength={3}
                      ref={refs.airline}
                      returnKeyType='next'
                      style={{ letterSpacing: 1, width: 75 }}
                      value={state.add.airline}
                      onBlur={() => {
                        const airline = getAirlineData(state.add.airline);
                        if (airline) {
                          dispatch({ type: 'add', value: { airlineName: airline.airlineName } });
                        }
                      }}
                      onChangeText={(text: string) => {
                        dispatch({ type: 'add', value: { airline: text.toLocaleUpperCase() } });
                      }}
                      onSubmitEditing={() => refs.airlineName.current.focus()}
                    />
                  </View>
                  <View
                    className='flex-column flex-3'
                  >
                    <Text
                      className='size-md color-primaryContainer mb-sm'
                      style={{ fontVariant: ['small-caps'] }}
                    >
                      {t('add.airline_name').toLocaleLowerCase()}
                    </Text>
                    <TextInput
                      className='color-surface bg-background b-1 bordercolor-outline radius-sm size-md p-smm'
                      inputMode='text'
                      maxLength={50}
                      ref={refs.airlineName}
                      returnKeyType='next'
                      value={state.add.airlineName}
                      onChangeText={(text: string) => {
                        dispatch({ type: 'add', value: { airlineName: text } });
                      }}
                      onSubmitEditing={() => refs.flightNumber.current.focus()}
                    />
                  </View>
                </View>

                <View
                  className='flex-row mb-md'
                >
                  <View
                    className='flex-column flex-1'
                  >
                    <Text
                      className='size-md color-primaryContainer mb-sm mt-md'
                      style={{ fontVariant: ['small-caps'] }}
                    >
                      {t('add.flight_number').toLocaleLowerCase()}
                    </Text>
                    <TextInput
                      className='color-surface bg-background b-1 bordercolor-outline radius-sm size-md p-smm'
                      inputMode='numeric'
                      keyboardType='number-pad'
                      maxLength={4}
                      ref={refs.flightNumber}
                      returnKeyType='next'
                      style={{ width: 75, letterSpacing: 1, fontVariant: ['tabular-nums'] }}
                      value={state.add.flightNumber}
                      onChangeText={(text: string) => {
                        dispatch({ type: 'add', value: { flightNumber: text } });
                      }}
                      onSubmitEditing={() => refs.departureAirport.current?.open()}
                    />
                  </View>
                </View>

                <Separator
                  borderColor={colorPrimaryContainer}
                  title={t('add.departure').toLocaleLowerCase()}
                />

                <Text
                  className='size-md color-primaryContainer mt-xs mb-sm'
                  style={{ fontVariant: ['small-caps'] }}
                >
                  {t('add.airport').toLocaleLowerCase()}
                </Text>
                <View
                  className='flex-row'
                >
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => refs.departureAirport.current?.open()}
                  >
                    <View
                      className='flex-1 b-1 bg-background bordercolor-outline radius-sm alignitems-center justifycontent-center mr-lg'
                      style={{ width: 75 }}
                    >
                      <Text
                        className='color-surface weight-bold size-lg'
                        style={{ letterSpacing: 1, fontVariant: ['tabular-nums'] }}
                      >
                        {state.add.departureAirport}
                      </Text>
                    </View>
                  </Pressable>
                  <View
                    className='flex-3'
                  >
                    <Select
                      className='color-surface bg-background b-1 bordercolor-outline radius-sm'
                      data={airports.map((x: any) => {
                        const local = l !== 'en' ? `${x[`airport_name_${l}`]} ${x[`municipality_name_${l}`]}` : '';
                        x['full'] = `${x['iata_code']} ${x['airport_name']} ${x['municipality_name']} ${local}`;
                        return x;
                      })}
                      dropdownRef={refs.departureAirport}
                      labelField={`municipality_name${l !== 'en' ? '_' + l : ''}`}
                      placeholder={t('add.select_airport')}
                      search
                      searchField='full'
                      showValue
                      value={state.add.departureAirport}
                      valueField='iata_code'
                      valueFixedWidth={45}
                      onChange={(item: any) => {
                        dispatch({
                          type: 'add', value: {
                            departureAirport: item.iata_code,
                            departureAirportTimezone: item.timezone,
                          }
                        });
                        refs.departureDate.current?.open();
                      }}
                    />
                  </View>
                </View>

                <View
                  className='flex-row mb-md'
                >
                  <View
                    className='flex-column flex-2 pr-xxl'
                  >
                    <Text
                      className='size-md color-primaryContainer mb-sm mt-md'
                      style={{ fontVariant: ['small-caps'] }}
                    >
                      {t('add.date').toLocaleLowerCase()}
                    </Text>
                    <DatetimeInput
                      mode='date'
                      ref={refs.departureDate}
                      timezone={state.add.departureAirportTimezone}
                      title={`${t('add.departure')} ${t('add.date').toLocaleLowerCase()}`}
                      value={state.add.departureDate}
                      onChange={(value: string) => {
                        dispatch({ type: 'add', value: { departureDate: value } });
                        if (state.add.arrivalDate === today) {
                          dispatch({ type: 'add', value: { arrivalDate: state.add.arrivalDate.splice(0, value.substring(0, 10)) } });
                        }
                        refs.departureTime.current?.open();
                      }}
                    />
                  </View>

                  <View
                    className='flex-column flex-1'
                  >
                    <Text
                      className={`size-md color-primaryContainer mb-sm mt-md`}
                      style={{ fontVariant: ['small-caps'] }}
                    >
                      {t('add.time').toLocaleLowerCase()}
                    </Text>
                    <DatetimeInput
                      mode='time'
                      ref={refs.departureTime}
                      timezone={state.add.departureAirportTimezone}
                      title={`${t('add.departure')} ${t('add.time').toLocaleLowerCase()}`}
                      value={state.add.departureTime}
                      onChange={(value: string) => {
                        dispatch({ type: 'add', value: { departureTime: value } });
                        refs.arrivalAirport.current?.open();
                      }}
                    />
                  </View>
                </View>

                <Separator
                  borderColor={colorPrimaryContainer}
                  title={t('add.arrival').toLocaleLowerCase()}
                />

                <Text
                  className='size-md color-primaryContainer mt-xs mb-sm'
                  style={{ fontVariant: ['small-caps'] }}
                >
                  {t('add.airport').toLocaleLowerCase()}
                </Text>
                <View
                  className='flex-row'
                >
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => refs.arrivalAirport.current?.open()}
                  >
                    <View
                      className='flex-1 b-1 bg-background bordercolor-outline radius-sm alignitems-center justifycontent-center mr-lg'
                      style={{ width: 75 }}
                    >
                      <Text
                        className='color-surface weight-bold size-lg'
                        style={{ letterSpacing: 1, fontVariant: ['tabular-nums'] }}
                      >
                        {state.add.arrivalAirport}
                      </Text>
                    </View>
                  </Pressable>
                  <View
                    className='flex-3'
                  >
                    <Select
                      className='color-surface bg-background b-1 bordercolor-outline radius-sm'
                      data={airports.map((x: any) => {
                        const local = l !== 'en' ? `${x[`airport_name_${l}`]} ${x[`municipality_name_${l}`]}` : '';
                        x['full'] = `${x['iata_code']} ${x['airport_name']} ${x['municipality_name']} ${local}`;
                        return x;
                      })}
                      dropdownPosition='top'
                      dropdownRef={refs.arrivalAirport}
                      labelField={`municipality_name${l !== 'en' ? '_' + l : ''}`}
                      placeholder={t('add.select_airport')}
                      search
                      searchField='full'
                      showValue
                      value={state.add.arrivalAirport}
                      valueField='iata_code'
                      valueFixedWidth={45}
                      onChange={(item: any) => {
                        dispatch({
                          type: 'add', value: {
                            arrivalAirport: item.iata_code,
                            arrivalAirportTimezone: item.timezone,
                          }
                        });
                        refs.arrivalDate.current?.open();
                      }}
                    />
                  </View>
                </View>

                <View
                  className='flex-row'
                >
                  <View
                    className='flex-column flex-2 pr-xxl'
                  >
                    <Text
                      className='size-md color-primaryContainer mb-sm mt-md'
                      style={{ fontVariant: ['small-caps'] }}
                    >
                      {t('add.date').toLocaleLowerCase()}
                    </Text>
                    <DatetimeInput
                      mode='date'
                      ref={refs.arrivalDate}
                      timezone={state.add.arrivalAirportTimezone}
                      title={`${t('add.arrival')} ${t('add.date').toLocaleLowerCase()}`}
                      value={state.add.arrivalDate}
                      onChange={(value: string) => {
                        dispatch({ type: 'add', value: { arrivalDate: value } });
                        refs.arrivalTime.current?.open();
                      }}
                    />
                  </View>

                  <View
                    className='flex-column flex-1'
                  >
                    <Text
                      className={`size-md color-primaryContainer mb-sm mt-md`}
                      style={{ fontVariant: ['small-caps'] }}
                    >
                      {t('add.time').toLocaleLowerCase()}
                    </Text>
                    <DatetimeInput
                      mode='time'
                      timezone={state.add.arrivalAirportTimezone}
                      ref={refs.arrivalTime}
                      title={`${t('add.arrival')} ${t('add.time').toLocaleLowerCase()}`}
                      value={state.add.arrivalTime}
                      onChange={(value: string) => {
                        dispatch({ type: 'add', value: { arrivalTime: value } });
                      }}
                    />
                  </View>
                </View>

                <View
                  className='mt-xl flex-row justifycontent-end'
                  style={{ width: '100%' }}
                >
                  <Button
                    className='bg-primary px-lg'
                    disabled={
                      (state.add.airline ?? '') === '' ||
                      (state.add.flightNumber ?? '') === '' ||
                      (state.add.departureAirport ?? '') === '' ||
                      (state.add.arrivalAirport ?? '') === '' ||
                      processing
                    }
                    title={t('add.title')}
                    onPress={processManuallyAdd}
                  />
                </View>

              </View>
            }
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemeProvider>
  );
}
