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
import { exportFlights, fillDataFromArray } from '@/helpers/sqlite';
import {
  readFile,
  writeFile,
  DownloadDirectoryPath,
  exists,
} from '@dr.pogodin/react-native-fs';
import * as DocumentPicker from 'expo-document-picker';
import {
  refreshFlights,
  showConfirmation,
  startBackgroundTask,
  stopBackgroundTask,
} from '@/helpers/common';
import { parse } from 'csv-parse/dist/esm/sync';
import { processExportData, processImportData } from '@/helpers/import-export';

const Settings = React.memo(() => {
  const colorSecondaryContainer = useThemeColor(
    'textColors.secondaryContainer',
  );
  const colorSurfaceVariant = useThemeColor('colors.surfaceVariant');

  const reducer = (state: any, action: any) => {
    return {
      ...state,
      [action.field]: action.value,
    };
  };
  const [state, dispatch] = useReducer(reducer, settings);

  const updateSettings = useCallback(() => {
    settings.TEMPERATURE_UNITS = getSetting('TEMPERATURE_UNITS', 'c');
    settings.TEMPERATURE_TYPE = getSetting('TEMPERATURE_TYPE', 'feelslike');
    settings.WEATHER_API_KEY = getSetting(
      'WEATHER_API_KEY',
      process.env.EXPO_PUBLIC_WEATHER_API_KEY,
    );
    settings.AEDBX_API_KEY = getSetting(
      'AEDBX_API_KEY',
      process.env.EXPO_PUBLIC_AEDBX_API_KEY,
    );
    settings.AEROAPI_API_KEY = getSetting(
      'AEROAPI_API_KEY',
      process.env.EXPO_PUBLIC_AEROAPI_API_KEY,
    );
    settings.CURRENT_API = getSetting('CURRENT_API', 'aerodatabox');
    settings.REFRESH_INTERVAL = parseInt(getSetting('REFRESH_INTERVAL', '1'));
    settings.FLIGHTS_LIMIT = parseInt(getSetting('FLIGHTS_LIMIT', '1000'));
    settings.ONLY_MANUAL_REFRESH = getSetting('ONLY_MANUAL_REFRESH', 'true');
    settings.FORCE_REQUEST_API_ON_MANUAL_REFRESH = getSetting(
      'FORCE_REQUEST_API_ON_MANUAL_REFRESH',
      'false',
    );

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

    const data = processExportData(flights);

    let fileName = 'flights.csv';
    if (await exists(DownloadDirectoryPath + '/' + fileName)) {
      let i = 1;
      while (await exists(DownloadDirectoryPath + '/' + fileName)) {
        fileName = `flights (${i}).csv`;
        i++;
      }
    }
    await writeFile(DownloadDirectoryPath + `/${fileName}`, data, 'utf8');
    showConfirmation({
      title: t('settings.export_finished_title'),
      description: t('settings.export_finished_description', { fileName }),
      closeButton: t('buttons.close'),
      showOnlyCloseButton: true,
    });
  };

  const importData = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/plain', 'text/comma-separated-values', 'text/csv'],
    });
    if (!result.canceled) {
      const csvFile = await readFile(result.assets[0].uri, 'utf8');

      try {
        const records = parse(csvFile, {
          columns: true,
          delimiter: ',',
          escape: '"',
          trim: true,
          quote: '"',
          skip_empty_lines: true,
          relax_quotes: true,
          relax_column_count: true,
        });

        const data = await processImportData(records);

        if (data.length > 0) {
          await fillDataFromArray('flights', data);
          refreshFlights(true, false);
          emitter.emit('updateStats');
          emitter.emit('refreshAchievements');
        }
        showConfirmation({
          title: t('settings.import_success_title'),
          description: t('settings.import_success_description', {
            count: data.length,
          }),
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
  };

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
      if (
        ['ONLY_MANUAL_REFRESH', 'FORCE_REQUEST_API_ON_MANUAL_REFRESH'].includes(
          field,
        )
      ) {
        value = value.toString();
      }
      dispatch({ field, value });
      setSetting(field, value);
    });
    updateSettings();
  };

  const apiList = {
    aerodatabox: 'AeroDataBox API',
    aeroapi: 'FlightAware AeroAPI',
  };

  const weatherDataCard = (
    <DataCard
      caption={
        <View className="flex-row alignitems-end">
          <Icon
            name="weather-hazy"
            size={16}
            color={colorSecondaryContainer}
            style={{ marginBottom: 1 }}
          />
          <Text className="size-smm weight-bold mt-xs color-secondaryContainer ml-sm">
            {t('settings.weather').toLocaleUpperCase()}
          </Text>
        </View>
      }
      key="weather"
      onSave={dataCardOnSave}
    >
      <View className="flex-column">
        <View className="flex-row my-sm">
          <Value
            caption={t('settings.temperature_units')}
            value={t(`settings.temperature_${state['TEMPERATURE_UNITS']}`)}
            width="50%"
          />
          <Value
            caption={t('settings.temperature_type')}
            value={t(`settings.temperature_${state['TEMPERATURE_TYPE']}`)}
            width="50%"
          />
        </View>
        <View className="flex-row mb-sm">
          <Value
            caption={t('settings.weather_api')}
            value={state['WEATHER_API_KEY']}
          />
        </View>
      </View>
      <View className="flex-column">
        <View className="flex-row my-sm">
          <View style={{ width: '50%' }} className="pr-md">
            <Select
              caption={t('settings.temperature_units')}
              data={[
                { id: 'c', value: t('settings.temperature_c') },
                { id: 'f', value: t('settings.temperature_f') },
              ]}
              field="TEMPERATURE_UNITS"
              value={state['TEMPERATURE_UNITS']}
            />
          </View>
          <View style={{ width: '50%' }}>
            <Select
              caption={t('settings.temperature_type')}
              data={[
                { id: 'temp', value: t('settings.temperature_temp') },
                { id: 'feelslike', value: t('settings.temperature_feelslike') },
                { id: 'windchill', value: t('settings.temperature_windchill') },
              ]}
              field="TEMPERATURE_TYPE"
              value={state['TEMPERATURE_TYPE']}
            />
          </View>
        </View>
        <View className="flex-row mb-sm">
          <Input
            caption={t('settings.weather_api')}
            field="WEATHER_API_KEY"
            value={state['WEATHER_API_KEY']}
            width="100%"
          />
        </View>
      </View>
    </DataCard>
  );
  const limitsDataCard = (
    <DataCard
      caption={
        <View className="flex-row alignitems-end">
          <Icon
            name="numeric"
            size={16}
            color={colorSecondaryContainer}
            style={{ marginBottom: 1 }}
          />
          <Text className="size-smm weight-bold mt-xs color-secondaryContainer ml-sm">
            {t('settings.limits').toLocaleUpperCase()}
          </Text>
        </View>
      }
      key="limits"
      onSave={dataCardOnSave}
    >
      <View className="flex-column">
        <View className="flex-row my-sm">
          <Value
            caption={t('settings.flights_limit')}
            value={state['FLIGHTS_LIMIT']}
            width="50%"
          />
        </View>
        <View className="flex-row mb-sm">
          <Value
            caption={t('settings.only_manual_refresh')}
            value={
              state['ONLY_MANUAL_REFRESH'] === 'true'
                ? t('messages.enabled')
                : t('messages.disabled')
            }
          />
        </View>
        <View className="flex-row mb-sm">
          <Value
            caption={t('settings.force_request_api_on_manual_refresh')}
            value={
              state['FORCE_REQUEST_API_ON_MANUAL_REFRESH'] === 'true'
                ? t('messages.enabled')
                : t('messages.disabled')
            }
          />
        </View>
      </View>
      <View className="flex-column">
        <View className="flex-row my-sm">
          <Input
            caption={t('settings.flights_limit')}
            field="FLIGHTS_LIMIT"
            keyboardType="numeric"
            value={state['FLIGHTS_LIMIT'].toString()}
            width="50%"
          />
        </View>
        <View className="flex-row my-sm">
          <Switch
            caption={t('settings.only_manual_refresh')}
            field="ONLY_MANUAL_REFRESH"
            value={state['ONLY_MANUAL_REFRESH'] === 'true'}
            valuesCaptions={{
              true: t('messages.enabled'),
              false: t('messages.disabled'),
            }}
          />
        </View>
        <View className="flex-row my-sm">
          <Switch
            caption={t('settings.force_request_api_on_manual_refresh')}
            field="FORCE_REQUEST_API_ON_MANUAL_REFRESH"
            value={state['FORCE_REQUEST_API_ON_MANUAL_REFRESH'] === 'true'}
            valuesCaptions={{
              true: t('messages.enabled'),
              false: t('messages.disabled'),
            }}
          />
        </View>
      </View>
    </DataCard>
  );
  const apiDataCard = (
    <DataCard
      caption={
        <View className="flex-row alignitems-end">
          <Icon
            name="api"
            size={16}
            color={colorSecondaryContainer}
            style={{ marginBottom: 1 }}
          />
          <Text className="size-smm weight-bold mt-xs color-secondaryContainer ml-sm">
            {t('settings.services').toLocaleUpperCase()}
          </Text>
        </View>
      }
      key="api"
      onSave={dataCardOnSave}
    >
      <View className="flex-column">
        <View className="flex-row my-sm">
          <Value
            caption={t('settings.aerodatabox')}
            value={state['AEDBX_API_KEY']}
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
      <View className="flex-column">
        <View className="flex-row my-sm">
          <Input
            caption={t('settings.aerodatabox')}
            field="AEDBX_API_KEY"
            value={state['AEDBX_API_KEY']}
            width="100%"
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
        <View className="flex-row alignitems-end">
          <Icon
            name="arrow-left-right-bold"
            size={16}
            color={colorSecondaryContainer}
            style={{ marginBottom: 1 }}
          />
          <Text className="size-smm weight-bold mt-xs color-secondaryContainer ml-sm">
            {`${t('settings.import')} / ${t('settings.export')}`.toLocaleUpperCase()}
          </Text>
        </View>
      }
      key="import"
    >
      <View className="flex-column">
        <View className="flex-row mb-sm mt-md">
          <View style={{ width: '50%' }}>
            <Button
              className="px-lg mr-lg"
              title={t('settings.import')}
              onPress={() => importData()}
            />
          </View>
          <View style={{ width: '50%' }}>
            <Button
              className="px-lg mr-md"
              title={t('settings.export')}
              onPress={() => exportData()}
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
  };

  const data: Array<keyof typeof dataCards> = [
    'weather',
    'limits',
    'api',
    'import',
  ];

  const renderItem = ({ item }: ListRenderItemInfo<keyof typeof dataCards>) => {
    return dataCards[item];
  };

  return (
    <GestureHandlerRootView>
      <KeyboardAvoidingView
        behavior="height"
        keyboardVerticalOffset={100}
        style={{ flex: 1 }}
      >
        <FlatList
          data={data}
          keyExtractor={(item) => item}
          keyboardShouldPersistTaps="always"
          removeClippedSubviews={false}
          renderItem={renderItem}
          style={{ padding: 8, backgroundColor: colorSurfaceVariant }}
        />
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
});

export default Settings;
