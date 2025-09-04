import React, { useState, useReducer, useContext, useEffect } from 'react';
import { Pressable, ListRenderItemInfo, KeyboardAvoidingView } from 'react-native';
import { default as Icon } from '@expo/vector-icons/FontAwesome5';
import { Image as _Image } from 'expo-image';
import { View, Text, ThemeProvider, createPicassoComponent } from 'react-native-picasso';
import { useThemeColor } from '@/hooks/useColors';
import { type ConfirmationDialogSettings, type Flight, FlightStatusValues } from '@/types';
import { getSetting, setSetting } from '@/constants/settings';
import useDynamicColorScheme from '@/hooks/useDynamicColorScheme';
import useTheme from '@/hooks/useTheme';
import t, { useLocale } from '@/helpers/localization';
import DatetimeInput from '@/components/DatetimeInput';
import LoadBCBPOptions from '@/components/LoadBCBP';
import { updateFlight } from '@/helpers/sqlite';
import { durationToLocaleString } from '@/helpers/datetime';
import { airlineLogoUri, getAirportData } from '@/helpers/airdata';
import flags from '@/constants/flags.json';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ReorderableList, { ReorderableListReorderEvent, reorderItems, useReorderableDrag } from 'react-native-reorderable-list';
import { DataCard, Input, Value, DataCardContext, Select } from '@/components/DataCard';
import { useNavigation } from 'expo-router';
import { refreshFlights, showConfirmation } from '@/helpers/common';
import { getFlightData } from '@/helpers/flights';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';


const Image = createPicassoComponent(_Image);

const DateTimeRow = ({ type, state }:
  { type: 'Start' | 'End', state: any }) => {
  const [value, setValue] = useState<string>(state[`actual${type}Datetime`] || state[`${type.toLowerCase()}Datetime`]);
  const dispatch = useContext(DataCardContext);

  const handleChange = (date: string) => {
    setValue(date);
    dispatch({ field: `actual${type}Datetime`, value: date })
  }

  return (
    <View
      className='flex-row my-sm'
    >
      <View
        className='flex-column'
        // @ts-ignore
        style={{ width: '66%' }}
      >
        <Text
          className='size-md color-primaryContainer mb-sm'
          ellipsizeMode='tail'
          numberOfLines={1}
          style={{ fontVariant: ['small-caps'] }}
        >
          {t('add.date').toLocaleLowerCase()}
        </Text>
        <DatetimeInput
          className='py-xs mr-md'
          mode='date'
          timezone={type === 'End' ? state.arrivalAirportTimezone : state.departureAirportTimezone}
          value={value}
          onChange={(date: string) => handleChange(date)}
        />
      </View>
      <View
        className='flex-column'
        // @ts-ignore
        style={{ width: '34%' }}
      >
        <Text
          className='size-md color-primaryContainer mb-sm'
          ellipsizeMode='tail'
          numberOfLines={1}
          style={{ fontVariant: ['small-caps'] }}
        >
          {t('add.time').toLocaleLowerCase()}
        </Text>
        <DatetimeInput
          className='py-xs mr-md'
          mode='time'
          timezone={type === 'End' ? state.arrivalAirportTimezone : state.departureAirportTimezone}
          value={value}
          onChange={(date: string) => handleChange(date)}
        />
      </View>
    </View>
  );
}

const Card: React.FC<{ dataCards: any, item: string, dragEnabled: boolean }> = React.memo(({ dataCards, item, dragEnabled }) => {
  const drag = useReorderableDrag();
  const props = dragEnabled ? { onLongPress: drag } : {};
  return (
    <Pressable
      {...props}
    >
      {dataCards[item]}
    </Pressable>
  );
});

const EditFlight = React.memo((props: { data: Flight }) => {
  const themeName = useDynamicColorScheme() || 'light';
  const theme = useTheme(themeName);
  const locale = useLocale();
  const colorSecondaryContainer = useThemeColor('textColors.secondaryContainer');
  const colorPrimary = useThemeColor('textColors.primary');

  const dateOptions: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    dayPeriod: 'short',
  };

  const none = (value: string | null | undefined) => {
    return !!value && value.length !== 0 ? value : '—';
  }

  const reducer = (state: any, action: any) => {
    return {
      ...state,
      [action.field]: action.value,
    }
  }

  const [state, dispatch] = useReducer(reducer, props.data);

  const departureDate = new Date(state.actualStartDatetime ?? state.startDatetime);
  const arrivalDate = new Date(state.actualEndDatetime ?? state.endDatetime);
  const durationString = durationToLocaleString(Math.round((arrivalDate.getTime() - departureDate.getTime()) / 60000), locale);

  const bcbpDispatch = async (action: any) => {
    const { type, value } = action;
    if (type === 'bcbp') {
      const leg = value.data.data?.legs?.[0];
      const result: any = {
        'bcbp': value,
        'seatNumber': leg?.seatNumber?.replace(/^0+/, '') ?? '',
        'pnr': leg?.operatingCarrierPNR ?? '',
        'passengerName': value.data.data?.passengerName ?? '',
      };
      dispatch({ field: 'bcbp', value: result['bcbp'] });
      dispatch({ field: 'seatNumber', value: result['seatNumber'] });
      dispatch({ field: 'pnr', value: result['pnr'] });
      dispatch({ field: 'passengerName', value: result['passengerName'] });
      await updateFlight({ ...state, ...result });
      refreshFlights(false);
    }
  }

  const dataCardOnSave = async (values: any) => {
    const result: any = {};
    Object.entries(values).filter(([field, value]) => value !== null && value !== undefined).forEach(([field, value]) => {
      dispatch({ field, value });
      result[field] = value;
    })
    await updateFlight({ ...state, ...result });
    refreshFlights(true, false);
  }

  const departureFlag = flags.find(x => x.country_code === state.departureCountry)?.flag;
  const arrivalFlag = flags.find(x => x.country_code === state.arrivalCountry)?.flag;

  const departureAirportData = getAirportData(state.departureAirport, locale);
  const arrivalAirportData = getAirportData(state.arrivalAirport, locale);

  const navigation = useNavigation();
  const [dragEnabled, setDragEnabled] = useState(true);

  const getFlightDataFromApi = () => {
    const confirmationDialog: ConfirmationDialogSettings = {
      closeButton: t('buttons.no'),
      confirmButton: t('buttons.yes'),
      description: t('edit.update_confirm_description'),
      title: t('edit.update_confirm_title'),
      showOnlyCloseButton: false,
      onConfirm: async () => {
        const flightData = await getFlightData(state.airline, state.flightNumber, state.startDatetime.substring(0, 10));
        if (!!flightData) {
          const result: any = {};
          Object.entries(flightData).filter(([field, value]) => value !== null && value !== undefined).forEach(([field, value]) => {
            dispatch({ field, value });
            result[field] = value;
          });
          dispatch({ field: 'recordType', value: 1 });
          result.recordType = 1;
          await updateFlight({ ...state, ...result });
          refreshFlights(false);
        }
      }
    };
    showConfirmation(confirmationDialog);
  };

  useEffect(() => {
    navigation?.setOptions({
      headerRight: () => (
        <>
          <Pressable
            onPress={() => getFlightDataFromApi()}
          >
            <Icon name='cloud-download-alt' size={16} color={colorPrimary} style={{ marginTop: 4, marginRight: 16 }} />
          </Pressable>
          <Pressable
            onPress={() => setDragEnabled(!dragEnabled)}
          >
            <Icon name={dragEnabled ? 'bars' : 'copy'} size={16} color={colorPrimary} style={{ marginTop: 4, marginRight: 8 }} />
          </Pressable>
        </>
      )
    });
  }, [dragEnabled, navigation]);

  const departureDataCard = () => (
    <DataCard
      caption={
        <View className='flex-row alignitems-end'>
          <Icon name='plane-departure' size={12} color={colorSecondaryContainer} style={{ marginBottom: 3 }} />
          <Text
            className='size-smm weight-bold mt-xs color-secondaryContainer ml-smm'
          >
            {t('flights.departure').toLocaleUpperCase()}
          </Text>
        </View>
      }
      key={`departure-${dragEnabled ? 'drag' : 'copy'}`}
      onSave={dataCardOnSave}
    >
      <View
        className='flex-column'
      >
        <View
          className='flex-row my-sm justifycontent-between alignitems-start'
        >
          <View
            className='flex-column'
          >
            <Text
              className='size-mdl weight-bold color-surface'
              ellipsizeMode='tail'
              numberOfLines={1}
            >
              {`${departureAirportData?.municipality_name} (${state.departureAirport})`}
            </Text>
            <Text
              className='size-sm color-surface mt-xs'
            >
              {departureAirportData?.airport_name}
            </Text>
          </View>
          <Text
            className='alignself-start ml-mdl'
            style={{ lineHeight: 44, fontSize: 40 }}
          >
            {departureFlag}
          </Text>
        </View>
        <View
          className='flex-row mb-sm'
        >
          <Value
            caption={t('add.date')}
            selectable={!dragEnabled}
            value={departureDate.toLocaleDateString(locale, { ...dateOptions, timeZone: state.departureAirportTimezone ?? 'UTC' })}
            width='66%'
          />
          <Value
            caption={t('add.time')}
            selectable={!dragEnabled}
            value={departureDate.toLocaleTimeString(locale, { ...timeOptions, timeZone: state.departureAirportTimezone ?? 'UTC' })}
            width='34%'
          />
        </View>

        <View
          className='flex-row mb-sm'
        >
          <Value
            caption={t('flights.terminal')}
            selectable={!dragEnabled}
            value={none(state.departureTerminal)}
            width='33%'
          />
          <Value
            caption={t('flights.gate')}
            selectable={!dragEnabled}
            value={none(state.departureGate)}
            width='33%'
          />
          <Value
            caption={t('flights.desk')}
            selectable={!dragEnabled}
            value={none(state.departureCheckInDesk)}
            width='34%'
          />
        </View>
      </View>
      <View
        className='flex-column'
      >
        <DateTimeRow
          state={state}
          type='Start'
        />

        <View
          className='flex-row mb-sm'
        >
          <Input
            caption={t('flights.terminal')}
            field='departureTerminal'
            value={state['departureTerminal']}
            width='33%'
          />
          <Input
            caption={t('flights.gate')}
            field='departureGate'
            value={state['departureGate']}
            width='33%'
          />
          <Input
            caption={t('flights.desk')}
            field='departureCheckInDesk'
            value={state['departureCheckInDesk']}
            width='34%'
          />
        </View>
      </View>
    </DataCard>
  );
  const arrivalDataCard = () => (
    <DataCard
      caption={
        <View className='flex-row alignitems-end'>
          <Icon name='plane-arrival' size={12} color={colorSecondaryContainer} style={{ marginBottom: 3 }} />
          <Text
            className='size-smm weight-bold mt-xs color-secondaryContainer ml-smm'
          >
            {t('flights.arrival').toLocaleUpperCase()}
          </Text>
        </View>
      }
      key={`arrival-${dragEnabled ? 'drag' : 'copy'}`}
      onSave={dataCardOnSave}
    >
      <View
        className='flex-column'
      >
        <View
          className='flex-row my-sm justifycontent-between alignitems-start'
        >
          <View
            className='flex-column'
          >
            <Text
              className='size-mdl weight-bold color-surface'
            >
              {`${arrivalAirportData?.municipality_name} (${state.arrivalAirport})`}
            </Text>
            <Text
              className='size-sm color-surface mt-xs'
            >
              {arrivalAirportData?.airport_name}
            </Text>
          </View>
          <Text
            className='lignself-start ml-mdl'
            style={{ lineHeight: 44, fontSize: 40 }}
          >
            {arrivalFlag}
          </Text>
        </View>

        <View
          className='flex-row mb-sm'
        >
          <Value
            caption={t('add.date')}
            selectable={!dragEnabled}
            value={arrivalDate.toLocaleDateString(locale, { ...dateOptions, timeZone: state.arrivalAirportTimezone ?? 'UTC' })}
            width='66%'
          />
          <Value
            caption={t('add.time')}
            selectable={!dragEnabled}
            value={arrivalDate.toLocaleTimeString(locale, { ...timeOptions, timeZone: state.arrivalAirportTimezone ?? 'UTC' })}
            width='34%'
          />
        </View>
        <View
          className='flex-row mb-sm'
        >
          <Value
            caption={t('flights.terminal')}
            selectable={!dragEnabled}
            value={none(state.arrivalTerminal)}
            width='66%'
          />
          <Value
            caption={t('flights.baggage_belt')}
            selectable={!dragEnabled}
            value={none(state.baggageBelt)}
            width='34%'
          />
        </View>
      </View>
      <View
        className='flex-column'
      >
        <DateTimeRow
          state={state}
          type='End'
        />

        <View
          className='flex-row mb-sm'
        >
          <Input
            caption={t('flights.terminal')}
            field='arrivalTerminal'
            value={state['arrivalTerminal']}
            width='66%'
          />
          <Input
            caption={t('flights.baggage_belt')}
            field='baggageBelt'
            value={state['baggageBelt']}
            width='34%'
          />
        </View>
      </View>
    </DataCard>
  );
  const boardingpassDataCard = () => (
    <DataCard
      caption={
        <View className='flex-row alignitems-end'>
          <Icon name='barcode' size={12} color={colorSecondaryContainer} style={{ marginBottom: 3 }} />
          <Text
            className='size-smm weight-bold mt-xs color-secondaryContainer ml-smm'
          >
            {t('boardingpass.title').toLocaleUpperCase()}
          </Text>
        </View>
      }
      key={`boardingpass-${dragEnabled ? 'drag' : 'copy'}`}
      onSave={dataCardOnSave}
    >
      <View
        className='flex-column'
      >
        <View
          className='flex-row my-sm'
        >
          <Value
            caption={t('flights.pnr')}
            selectable={!dragEnabled}
            value={none(state.pnr)}
            width='66%'
          />
          <Value
            caption={t('flights.seat')}
            selectable={!dragEnabled}
            value={none(state.seatNumber)}
            width='34%'
          />
        </View>
      </View>
      <View
        className='flex-column'
      >
        <View
          className='flex-row my-sm'
        >
          <Input
            caption={t('flights.pnr')}
            field='pnr'
            value={state['pnr']}
            width='66%'
          />
          <Input
            caption={t('flights.seat')}
            field='seatNumber'
            value={state['seatNumber']}
            width='34%'
          />
        </View>
        <View
          className='flex-column my-sm mr-md'
        >
          <LoadBCBPOptions
            dispatch={bcbpDispatch}
            showToast={false}
          />
        </View>
      </View>
    </DataCard>
  );

  const entries = FlightStatusValues.map(x => [x, t(`flights.statuses.${x}`)]);
  entries.sort((a, b) => a[1].localeCompare(b[1]));
  const flightStatuses: { [key: string]: string } = Object.fromEntries(entries);
  const flightValues = (
    <>
      <View
        className='flex-row my-sm'
      >
        <Value
          caption={t('add.airline')}
          value={(<View className='flex-row justifycontent-start alignitems-center mt-xs'>
            <Image
              className='radius-xs b-1 bordercolor-secondaryContainer'
              recyclingKey={state.airline}
              source={airlineLogoUri(state.airline)}
              style={{ width: 20, height: 20, backgroundColor: '#FFFFFF' }}
            />
            <Text
              className='size-smm weight-bold ml-sm color-surface'
              selectable
            >
              {state.airlineName}
            </Text>
          </View>)}
          width='66%'
        />
        <Value
          caption={t('add.flight_number')}
          value={`${state.airline} ${state.flightNumber}`}
          width='34%'
        />
      </View>
      {state.extra.carrier &&
        <View
          className='flex-row mb-sm'
        >
          <Value
            caption={t('flights.carrier')}
            selectable={!dragEnabled}
            value={(<View className='flex-row justifycontent-start alignitems-center mt-xs'>
              <Image
                className='radius-xs b-1 bordercolor-secondaryContainer'
                recyclingKey={state.extra.carrier}
                source={airlineLogoUri(state.extra.carrier)}
                style={{ width: 20, height: 20, backgroundColor: '#FFFFFF' }}
              />
              <Text
                className='size-smm weight-bold ml-sm color-surface'
              >
                {state.extra.carrierName}
              </Text>
            </View>)}
            width='66%'
          />
          <Value
            caption={t('add.flight_number')}
            selectable={!dragEnabled}
            value={`${state.extra.carrier} ${state.extra.carrierFlightNumber}`}
            width='34%'
          />
        </View>
      }
      <View
        className='flex-row mb-sm'
      >
        <Value
          caption={t('measurements.distance')}
          selectable={!dragEnabled}
          value={`${state.distance.toLocaleString(locale)}${t('measurements.km')}`}
          width='66%'
        />
        <Value
          caption={t('measurements.flight_time')}
          selectable={!dragEnabled}
          value={durationString}
          width='34%'
        />
      </View>
    </>
  )
  const flightDataCard = () => (
    <DataCard
      caption={
        <View className='flex-row alignitems-end'>
          <Icon name='route' size={12} color={colorSecondaryContainer} style={{ marginBottom: 3 }} />
          <Text
            className='size-smm weight-bold mt-xs color-secondaryContainer ml-smm'
          >
            {t('flights.flight').toLocaleUpperCase()}
          </Text>
        </View>
      }
      key={`flight-${dragEnabled ? 'drag' : 'copy'}`}
      onSave={dataCardOnSave}
    >
      <View
        className='flex-column'
      >
        {flightValues}
        <View
          className='flex-row mb-sm'
        >
          <Value
            caption={t('flights.status')}
            selectable={!dragEnabled}
            value={flightStatuses[state.status] ?? flightStatuses['unknown']}
            width='66%'
          />
        </View>
      </View>
      <View
        className='flex-column'
      >
        {flightValues}
        <View
          className='flex-row mb-sm'
        >
          <View
            style={{ width: '100%' }}
            className='pr-md'
          >
            <Select
              caption={t('flights.status')}
              data={Object.entries(flightStatuses).map(x => ({ id: x[0], value: x[1] }))}
              field='status'
              value={state['status']}
            />
          </View>
        </View>
      </View>
    </DataCard>
  );
  const aircraftDataCard = () => (
    <DataCard
      caption={
        <View className='flex-row alignitems-end'>
          <Icon name='plane' size={12} color={colorSecondaryContainer} style={{ marginBottom: 3 }} />
          <Text
            className='size-smm weight-bold mt-xs color-secondaryContainer ml-smm'
          >
            {t('flights.aircraft').toLocaleUpperCase()}
          </Text>
        </View>
      }
      key={`aircraft-${dragEnabled ? 'drag' : 'copy'}`}
      onSave={dataCardOnSave}
    >
      <View
        className='flex-column mt-sm'
      >
        <View
          className='flex-row mb-sm'
        >
          <Value
            caption={t('flights.aircraft_type')}
            selectable={!dragEnabled}
            value={none(state.aircraftType)}
          />
        </View>
        <View
          className='flex-row mb-sm'
        >
          <Value
            caption={t('flights.aircraft_registration_number')}
            selectable={!dragEnabled}
            value={none(state.aircraftRegNumber)}
          />
        </View>
      </View>
      <View
        className='flex-column'
      >
        <View
          className='flex-row my-sm'
        >
          <Input
            caption={t('flights.aircraft_type')}
            field='aircraftType'
            value={state['aircraftType']}
            width='100%'
          />
        </View>
        <View
          className='flex-row mb-sm'
        >
          <Input
            caption={t('flights.aircraft_registration_number')}
            field='aircraftRegNumber'
            value={state['aircraftRegNumber']}
            width='100%'
          />
        </View>
      </View>
    </DataCard>
  );
  const notesDataCard = () => (
    <DataCard
      caption={
        <View className='flex-row alignitems-end'>
          <Icon name='sticky-note' size={16} color={colorSecondaryContainer} style={{ marginBottom: 1 }} />
          <Text
            className='size-smm weight-bold mt-xs color-secondaryContainer ml-sm'
          >
            {t('profile.notes').toLocaleUpperCase()}
          </Text>
        </View>
      }
      key={`notes-${dragEnabled ? 'drag' : 'copy'}`}
      onSave={dataCardOnSave}
    >
      <View
        className='flex-row my-sm'
      >
        <Value
          caption=''
          lines={4}
          selectable={!dragEnabled}
          value={none(state['notes'])}
        />
      </View>
      <View
        className='flex-row my-sm'
      >
        <Input
          caption=''
          field='notes'
          lines={4}
          value={state['notes']}
        />
      </View>
    </DataCard>
  );
  const dataCards = {
    departure: departureDataCard,
    arrival: arrivalDataCard,
    boardingpass: boardingpassDataCard,
    flight: flightDataCard,
    aircraft: aircraftDataCard,
    notes: notesDataCard,
  }
  type DCType = keyof typeof dataCards;

  const FLIGHT_CARDS = getSetting('FLIGHT_CARDS', 'departure|arrival|boardingpass|flight|aircraft|notes');
  const [data, setData] = useState<Array<DCType>>(FLIGHT_CARDS.split('|') as Array<DCType>);

  const renderItem = ({ item }: ListRenderItemInfo<DCType>) => {
    return <Card dataCards={dataCards} item={item} dragEnabled={dragEnabled} />;
  };
  const handleReorder = ({ from, to }: ReorderableListReorderEvent) => {
    setData(value => {
      const newData = reorderItems(value, from, to);
      setSetting('FLIGHT_CARDS', newData.join('|'));
      return newData;
    });
  };

  const insets = useSafeAreaInsets();

  return (
    // @ts-ignore
    <ThemeProvider theme={theme}>
      <GestureHandlerRootView style={{ paddingBottom: insets.bottom }}>
        <SafeAreaView
          style={{ flex: 1 }}
        >
          <KeyboardAvoidingView
            behavior='position'
            keyboardVerticalOffset={100}
            style={{ flex: 1 }}
          >
            <ReorderableList
              cellAnimations={{ opacity: 1, transform: [{ scale: 0.96 }] }}
              data={data}
              keyboardShouldPersistTaps='always'
              keyExtractor={item => item}
              renderItem={renderItem}
              style={{ padding: 8 }}
              onReorder={handleReorder}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </GestureHandlerRootView>
    </ThemeProvider>
  )
});

export default EditFlight;
