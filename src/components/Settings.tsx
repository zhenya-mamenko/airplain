import React, { useReducer, useCallback } from 'react';
import { FlatList, GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text } from 'react-native-picasso';
import { DataCard, Input, Value, Select, Switch } from '@/components/DataCard';
import Button from '@/components/Button';
import { KeyboardAvoidingView, ListRenderItemInfo } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useThemeColor } from '@/hooks/useColors';
import t from '@/helpers/localization';
import emitter from '@/helpers/emitter';
import { getSetting, setSetting, settings } from '@/constants/settings';
import { exportFlights, isFlightExists, fillDataFromArray } from '@/helpers/sqlite';
import { readFile, writeFile, DownloadDirectoryPath } from '@dr.pogodin/react-native-fs';
import * as DocumentPicker from 'expo-document-picker';
import { showConfirmation, startBackgroundTask, stopBackgroundTask } from '@/helpers/common';
import { parse } from 'csv-parse/dist/esm/sync';
import { getAirlineData } from '@/helpers/airdata';


const Settings = React.memo(() => {
  const colorSecondaryContainer = useThemeColor('textColors.secondaryContainer');
  const colorSurfaceVariant = useThemeColor('colors.surfaceVariant');

  const reducer = (state: any, action: any) => {
    return {
      ...state,
      [action.field]: action.value,
    }
  }
  const [state, dispatch] = useReducer(reducer, settings);

  const updateSettings = useCallback(() => {
    settings.TEMPERATURE_UNITS = getSetting('TEMPERATURE_UNITS', 'c');
    settings.TEMPERATURE_TYPE = getSetting('TEMPERATURE_TYPE', 'feelslike');
    settings.WEATHER_API_KEY = getSetting('WEATHER_API_KEY', process.env.EXPO_PUBLIC_WEATHER_API_KEY);
    settings.AEDBX_API_KEY = getSetting('AEDBX_API_KEY', process.env.EXPO_PUBLIC_AEDBX_API_KEY);
    settings.AEROAPI_API_KEY = getSetting('AEROAPI_API_KEY', process.env.EXPO_PUBLIC_AEROAPI_API_KEY);
    settings.CURRENT_API = getSetting('CURRENT_API', 'aerodatabox');
    settings.REFRESH_INTERVAL = parseInt(getSetting('REFRESH_INTERVAL', '1'));
    settings.FLIGHTS_LIMIT = parseInt(getSetting('FLIGHTS_LIMIT', '1000'));
    settings.ONLY_MANUAL_REFRESH = getSetting('ONLY_MANUAL_REFRESH', 'true');

    if (settings.ONLY_MANUAL_REFRESH === 'false') {
      startBackgroundTask();
    } else {
      stopBackgroundTask();
    }

    emitter.emit('updateSettings');
  }, []);

  const exportData = async () => {
    const flights = await exportFlights();
    if (flights.length === 0) return;
    const headers = Object.keys(flights[0]).filter(x => ![
      'flight_id', 'airline_id', 'airline_name', 'is_archived', 'record_type', 'extra', 'notes', 'check_in_link', 'check_in_time'
    ].includes(x));
    const data = flights.map(x => {
      const result: Array<string> = [];
      headers.forEach(h => {
        result.push(x[h]);
      });
      return result.join(',');
    }).join('\n');
    await writeFile(DownloadDirectoryPath + '/flights.csv', headers.join(',') + '\n' + data, 'utf8');
    showConfirmation({
      title: t('settings.export_finished_title'),
      description: t('settings.export_finished_description'),
      closeButton: t('buttons.close'),
      showOnlyCloseButton: true,
    });
  }

  const importData = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['text/plain', 'text/comma-separated-values', 'text/csv'] });
    if (!result.canceled) {
      const csvFile = await readFile(result.assets[0].uri, 'utf8');
      const data: Array<any> = [];
      try {
        const records = parse(csvFile, {
          columns: true, delimiter: ',', escape: '"', trim: true,
          quote: '"', skip_empty_lines: true, relax_quotes: true, relax_column_count: true,
        });
        const fields = [
          'airline', 'flight_number', 'departure_airport', 'departure_country', 'departure_airport_timezone',
          'arrival_airport', 'arrival_country', 'arrival_airport_timezone',
          'start_datetime', 'end_datetime', 'distance', 'actual_end_datetime', 'actual_start_datetime',
          'departure_terminal', 'departure_check_in_desk', 'departure_gate',
          'arrival_terminal', 'baggage_belt',
          'aircraft_type', 'aircraft_reg_number', 'status',
        ];
        const checkLen = (r: any, field: string, len: number): boolean => {
          return ((r[field] as string).length === len);
        };

        for (const r of records) {
          const entries = Object.entries(r).filter(x => fields.includes(x[0])).map(x => [x[0] as string, x[1] as string]);
          if (entries.filter(x => fields.slice(0, 11).includes(x[0]) &&
            (x[1] + '').toLowerCase() !== 'null' && x[1] !== undefined && (x[1] + '') !== '').length !== 11
          ) continue;

          const flight = Object.fromEntries(entries);
          if (!checkLen(flight, 'airline', 2)) continue;

          const startDate = Date.parse(flight.start_datetime);
          if (isNaN(startDate)) continue;

          if (!!(await isFlightExists(flight.airline, flight.flight_number, new Date(startDate)))) continue;

          const airlineData = getAirlineData(flight.airline);
          if (!airlineData) {
            flight.airline_id = null;
            flight.extra = JSON.stringify({
              airline: flight.airline,
              airline_name: flight.airline,
            });
          } else {
            flight.airline_id = airlineData.airlineId;
          }
          delete flight.airline;

          if (!checkLen(flight, 'departure_airport', 3) || !checkLen(flight, 'arrival_airport', 3) ||
            !checkLen(flight, 'departure_country', 2) || !checkLen(flight, 'arrival_country', 2)
          ) continue;

          if (isNaN(parseInt(flight.distance as string))) {
            flight.distance = 0;
          }

          if (isNaN(Date.parse(flight.end_datetime))) continue;
          if (!!flight.actual_start_datetime && isNaN(Date.parse(flight.actual_start_datetime))) continue;
          if (!!flight.actual_end_datetime && isNaN(Date.parse(flight.actual_end_datetime))) continue;

          flight.actual_start_datetime = !!flight.actual_start_datetime ? flight.actual_start_datetime : flight.start_datetime;
          flight.actual_end_datetime = !!flight.actual_end_datetime ? flight.actual_end_datetime : flight.end_datetime;

          flight.status = ['arrived', 'canceled', 'diverted'].includes(flight.status) ? flight.status : 'arrived';
          flight.record_type = 0;
          flight.is_archived = 1;
          for (const f of fields) {
            if (flight[f] === null || flight[f] === undefined || flight[f].toLowerCase() === 'null') {
              delete flight[f];
            }
          }
          data.push(flight);
        }
        if (data.length > 0) {
          await fillDataFromArray('flights', data);
          emitter.emit('updatePastFlights', false);
        }
        showConfirmation({
          title: t('settings.import_success_title'),
          description: t('settings.import_success_description', { count: data.length }),
          closeButton: t('buttons.close'),
          showOnlyCloseButton: true,
        });
      } catch (e) {
        showConfirmation({
          title: t('settings.import_error_title'),
          description: t('settings.import_error_description'),
          closeButton: t('buttons.close'),
          showOnlyCloseButton: true,
        });
        return;
      }
    }
  }

  const dataCardOnSave = async (values: { [key: string]: string }) => {
    Object.entries(values).forEach(([field, value]) => {
      if (['REFRESH_INTERVAL', 'FLIGHTS_LIMIT'].includes(field)) {
        const v = parseInt(value);
        if (isNaN(v) || v <= 0) {
          value = state[field];
        } else {
          value = v.toString();
        }
      }
      if (field === 'ONLY_MANUAL_REFRESH') {
        value = value.toString();
      }
      dispatch({ field, value });
      setSetting(field, value);
    })
    updateSettings();
  }

  const apiList = {
    aerodatabox: 'AeroDataBox API',
    aeroapi: 'FlightAware AeroAPI',
  };

  const weatherDataCard = (
    <DataCard
      caption={
        <View className='flex-row alignitems-end'>
          <Icon name='weather-hazy' size={16} color={ colorSecondaryContainer } style={{ marginBottom: 1 }} />
          <Text
            className='size-smm weight-bold mt-xs color-secondaryContainer ml-sm'
          >
            { t('settings.weather').toLocaleUpperCase() }
          </Text>
        </View>
      }
      key='weather'
      onSave={ dataCardOnSave }
    >
      <View
        className='flex-column'
      >
        <View
          className='flex-row my-sm'
        >
          <Value
            caption={ t('settings.temperature_units') }
            value={ t(`settings.temperature_${state['TEMPERATURE_UNITS']}`) }
            width='50%'
          />
          <Value
            caption={ t('settings.temperature_type') }
            value={ t(`settings.temperature_${state['TEMPERATURE_TYPE']}`) }
            width='50%'
          />
        </View>
        <View
          className='flex-row mb-sm'
        >
          <Value
            caption={ t('settings.weather_api') }
            value={ state['WEATHER_API_KEY'] }
          />
        </View>
      </View>
      <View
        className='flex-column'
      >
        <View
          className='flex-row my-sm'
        >
          <View
            style={{ width: '50%'}}
            className='pr-md'
          >
            <Select
              caption={ t('settings.temperature_units') }
              data={[
                { id: 'c', value: t('settings.temperature_c') },
                { id: 'f', value: t('settings.temperature_f') },
              ]}
              field='TEMPERATURE_UNITS'
              value={ state['TEMPERATURE_UNITS'] }
            />
          </View>
          <View
            style={{ width: '50%'}}
          >
            <Select
              caption={ t('settings.temperature_type') }
              data={[
                { id: 'temp', value: t('settings.temperature_temp') },
                { id: 'feelslike', value: t('settings.temperature_feelslike') },
                { id: 'windchill', value: t('settings.temperature_windchill') },
              ]}
              field='TEMPERATURE_TYPE'
              value={ state['TEMPERATURE_TYPE'] }
            />
          </View>
        </View>
        <View
          className='flex-row mb-sm'
        >
          <Input
            caption={ t('settings.weather_api') }
            field='WEATHER_API_KEY'
            value={ state['WEATHER_API_KEY'] }
            width='100%'
          />
        </View>
      </View>
    </DataCard>
  );
  const limitsDataCard = (
    <DataCard
      caption={
        <View className='flex-row alignitems-end'>
          <Icon name='numeric' size={16} color={ colorSecondaryContainer } style={{ marginBottom: 1 }} />
          <Text
            className='size-smm weight-bold mt-xs color-secondaryContainer ml-sm'
          >
            { t('settings.limits').toLocaleUpperCase() }
          </Text>
        </View>
      }
      key='limits'
      onSave={ dataCardOnSave }
    >
      <View
        className='flex-column'
      >
        <View
          className='flex-row my-sm'
        >
          <Value
            caption={ t('settings.flights_limit') }
            value={ state['FLIGHTS_LIMIT'] }
            width='50%'
          />
        </View>
        <View
          className='flex-row mb-sm'
        >
          <Value
            caption={ t('settings.only_manual_refresh') }
            value={ state['ONLY_MANUAL_REFRESH'] === 'true' ? t('messages.enabled') : t('messages.disabled') }
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
            caption={ t('settings.flights_limit') }
            field='FLIGHTS_LIMIT'
            keyboardType='numeric'
            value={ state['FLIGHTS_LIMIT'].toString() }
            width='50%'
          />
        </View>
        <View
          className='flex-row my-sm'
        >
          <Switch
            caption={ t('settings.only_manual_refresh') }
            field='ONLY_MANUAL_REFRESH'
            value={ state['ONLY_MANUAL_REFRESH'] === 'true' }
            valuesCaptions={{ true: t('messages.enabled'), false: t('messages.disabled') }}
          />
        </View>
      </View>
    </DataCard>
  );
  const apiDataCard = (
    <DataCard
      caption={
        <View className='flex-row alignitems-end'>
          <Icon name='api' size={16} color={ colorSecondaryContainer } style={{ marginBottom: 1 }} />
          <Text
            className='size-smm weight-bold mt-xs color-secondaryContainer ml-sm'
          >
            { t('settings.services').toLocaleUpperCase() }
          </Text>
        </View>
      }
      key='api'
      onSave={ dataCardOnSave }
    >
      <View
        className='flex-column'
      >
        <View
          className='flex-row my-sm'
        >
          <Value
            caption={ t('settings.aerodatabox') }
            value={ state['AEDBX_API_KEY'] }
          />
        </View>
        {/* <View
          className='flex-row mb-sm'
        >
          <Value
            caption={ t('settings.aeroapi') }
            value={ state['AEROAPI_API_KEY'] }
          />
        </View> 
        <View
          className='flex-row mb-sm'
        >
          <Value
            caption={ t('settings.current_api') }
            value={ apiList[state['CURRENT_API'] as keyof typeof apiList] }
          />
        </View> */}
      </View>
      <View
        className='flex-column'
      >
        <View
          className='flex-row my-sm'
        >
          <Input
            caption={ t('settings.aerodatabox') }
            field='AEDBX_API_KEY'
            value={ state['AEDBX_API_KEY'] }
            width='100%'
          />
        </View>
        {/* <View
          className='flex-row mb-sm'
        >
          <Input
            caption={ t('settings.aeroapi') }
            field='AEROAPI_API_KEY'
            value={ state['AEROAPI_API_KEY'] }
            width='100%'
          />
        </View>
        <View
          className='flex-row mb-sm'
        >
          <View
            style={{ width: '100%'}}
            className='pr-md'
          >
            <Select
              caption={ t('settings.current_api') }
              data={[
                { id: 'aerodatabox', value: 'AeroDataBox API' },
                // { id: 'aeroapi', value: 'FlightAware AeroAPI' },
              ]}
              field='CURRENT_API'
              value={ state['CURRENT_API'] }
            />
          </View>
        </View> */}
      </View>
    </DataCard>
  );
  const importExportDataCard = (
    <DataCard
      caption={
        <View className='flex-row alignitems-end'>
          <Icon name='arrow-left-right-bold' size={16} color={ colorSecondaryContainer } style={{ marginBottom: 1 }} />
          <Text
            className='size-smm weight-bold mt-xs color-secondaryContainer ml-sm'
          >
            { `${t('settings.import')} / ${t('settings.export')}`.toLocaleUpperCase() }
          </Text>
        </View>
      }
      key='import'
    >
      <View
        className='flex-column'
      >
        <View
          className='flex-row mb-sm mt-md'
        >
          <View style={{ width: '50%'}}>
            <Button
              className='px-lg mr-lg'
              title={ t('settings.import') }
              onPress={ () => importData() }
            />
          </View>
          <View style={{ width: '50%'}}>
          <Button
            className='px-lg mr-md'
            title={ t('settings.export') }
            onPress={ () => exportData() }
          />
          </View>
        </View>
      </View>
    </DataCard>
  );
  const dataCards = {
    weather: weatherDataCard,
    limits: limitsDataCard,
    api: apiDataCard,
    import: importExportDataCard,
  }

  const data: Array<keyof typeof dataCards> = ['weather', 'limits', 'api', 'import'];

  const renderItem = ({ item }: ListRenderItemInfo<keyof typeof dataCards>) => {
    return dataCards[item];
  };

  return (
    <GestureHandlerRootView>
      <KeyboardAvoidingView
        behavior='height'
        keyboardVerticalOffset={ 100 }
        style={{ flex: 1 }}
      >
        <FlatList
          data={ data }
          keyExtractor={ item => item }
          keyboardShouldPersistTaps='always'
          removeClippedSubviews={false}
          renderItem={ renderItem }
          style={{ padding: 8, backgroundColor: colorSurfaceVariant }}
        />
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
});

export default Settings;
