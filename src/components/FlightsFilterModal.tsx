import { useContext, useEffect, useRef, useState } from 'react';
import Button from '@/components/Button';
import Separator from '@/components/Separator';
import DatetimeInput from '@/components/DatetimeInput';
import { MultiSelect } from '@/components/Select';
import airports from '@/constants/airports.json';
import { View, Text, ThemeProvider } from 'react-native-picasso';
import emitter from '@/helpers/emitter';
import t, { useLocale } from '@/helpers/localization';
import { useThemeColor } from '@/hooks/useColors';
import type { FlightsFilter } from '@/types';
import { GlobalContext } from '@/components/GlobalContext';
import useDynamicColorScheme from '@/hooks/useDynamicColorScheme';
import useTheme from '@/hooks/useTheme';

export default function FlightsFilterModal() {
  const themeName = useDynamicColorScheme() || 'light';
  const theme = useTheme(themeName);
  const [showFilterModal, setFilterModal] = useState(false);
  const colorPrimaryContainer = useThemeColor('textColors.primaryContainer');
  const { flightsFilter, setFlightsFilter } = useContext(GlobalContext);
  const [params, setParams] = useState<FlightsFilter>(flightsFilter);

  const modifyFilter = useRef((state: boolean) => {});
  useEffect(() => {
    modifyFilter.current = (state: boolean) => {
      setFilterModal(state);
    };
    emitter.on('setFlightFilterModalState', modifyFilter.current);
    return () => {
      emitter.off('setFlightFilterModalState', modifyFilter.current);
    };
  }, []);

  const l = useLocale().split('-')[0];

  return (
    // @ts-ignore
    <ThemeProvider theme={theme}>
      <View
        className="flex-column bg-surfaceVariant b-1 bordercolor-outline radius-sm p-md m-md"
        style={{
          position: 'absolute',
          zIndex: 1000,
          top: 45,
          display: showFilterModal ? undefined : 'none',
        }}
      >
        <Text className="size-lg color-surface">
          {t('filter.setup_filter')}
        </Text>
        <Separator
          borderColor={colorPrimaryContainer}
          title={t('filter.flight_date').toLocaleLowerCase()}
        />
        <View className="flex-row">
          <View className="flex-column flex-1 mr-lg">
            <Text
              className="size-md color-primaryContainer mb-sm"
              style={{ fontVariant: ['small-caps'] }}
            >
              {t('filter.from')}
            </Text>
            <DatetimeInput
              dateFormatOptions={{
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }}
              mode="date"
              timezone="UTC"
              value={params.dateFrom}
              onChange={(date: Date) => {
                setParams({ ...params, dateFrom: date });
              }}
            />
          </View>
          <View className="flex-column flex-1 mr-lg">
            <Text
              className="size-md color-primaryContainer mb-sm"
              style={{ fontVariant: ['small-caps'] }}
            >
              {t('filter.to')}
            </Text>
            <DatetimeInput
              dateFormatOptions={{
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }}
              mode="date"
              timezone="UTC"
              value={params.dateTo}
              onChange={(date: Date) => {
                setParams({ ...params, dateTo: date });
              }}
            />
          </View>
        </View>
        <Separator
          borderColor={colorPrimaryContainer}
          title={t('filter.airports').toLocaleLowerCase()}
        />
        <MultiSelect
          className="color-surface bg-background b-1 bordercolor-outline radius-sm"
          data={airports.map((x: any) => {
            const local =
              l !== 'en'
                ? `${x[`airport_name_${l}`]} ${x[`municipality_name_${l}`]}`
                : '';
            x['full'] =
              `${x['iata_code']} ${x['airport_name']} ${x['municipality_name']} ${local}`;
            return x;
          })}
          labelField={`municipality_name${l !== 'en' ? '_' + l : ''}`}
          placeholder={t('add.select_airport')}
          search
          searchField="full"
          showValue
          value={params.airports}
          valueField="iata_code"
          valueFixedWidth={45}
          onChange={(item: any) => {
            setParams({ ...params, airports: item });
          }}
        />
        <Separator borderColor={colorPrimaryContainer} title="" />
        <View className="flex-row mt-sm justifycontent-between">
          <Button
            className="px-md"
            title={t('buttons.clear')}
            onPress={() => {
              setParams({
                dateFrom: undefined,
                dateTo: undefined,
                airports: [],
              });
            }}
          />
          <Button
            className="px-md bg-primary"
            title={t('buttons.apply')}
            onPress={() => {
              setFilterModal(false);
              emitter.emit(
                'setFlightFilterState',
                params.dateFrom === undefined &&
                  params.dateTo === undefined &&
                  params.airports.length === 0
                  ? 'filter-outline'
                  : 'filter',
              );
              setFlightsFilter(params);
            }}
          />
        </View>
      </View>
    </ThemeProvider>
  );
}
