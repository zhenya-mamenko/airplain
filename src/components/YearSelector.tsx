import { forwardRef, useEffect, useState } from 'react';
import { View, Text, createPicassoComponent } from 'react-native-picasso';
import t from '@/helpers/localization';
import ScrollableSelector from './ScrollableSelector';

interface YearData {
  key: string;
  value: string;
}

const Selector = createPicassoComponent(ScrollableSelector);

export default function YearSelector(props: {
  current?: string;
  years: string[];
  onYearChange: (year: string) => void;
}) {
  const yearData: YearData[] = props.years.map((year) => ({
    key: year,
    value:
      year === 'all' ? t('flights.all').toLocaleUpperCase() : year.toString(),
  }));

  const [selected, setSelected] = useState(props.current ?? 'all');

  useEffect(() => {
    setSelected(props.current ?? 'all');
  }, [props.current]);

  const renderItem = (item: YearData, isSelected: boolean) => {
    return (
      <View
        className={`flex-row alignitems-center flex-row justifycontent-center m-xs p-xs ${isSelected ? 'bg-surface radius-sm' : ''}`}
        style={{ width: 70 }}
      >
        <Text className={`size-md weight-bold color-primaryContainer`}>
          {item.value as string}
        </Text>
      </View>
    );
  };

  return (
    <View
      className="bg-secondaryContainer m-sm radius-md b-1 bordercolor-outline elevated"
      style={{ height: 40 }}
    >
      <Selector
        className="radius-md"
        data={yearData}
        selectedKey={selected}
        onRenderItem={renderItem}
        onSelectionChange={props.onYearChange}
      />
    </View>
  );
}
