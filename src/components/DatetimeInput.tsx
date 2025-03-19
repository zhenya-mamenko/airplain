import React, { useEffect, useImperativeHandle, useState } from 'react';
import { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocale } from '@/helpers/localization';
import { fromLocalUTCtoUTCISOString } from '@/helpers/datetime';
import Button from '@/components/Button';


interface Props {
  className?: string;
  dateFormatOptions?: Intl.DateTimeFormatOptions;
  display?: 'spinner' | 'default' | 'clock' | 'calendar';
  mode?: 'date' | 'time';
  textClass?: string;
  timezone: string;
  timeFormatOptions?: Intl.DateTimeFormatOptions;
  title?: string;
  value?: Date;
  onChange?: (date: Date) => void;
}

interface IDatetimeInputRef {
  open: () => void;
};

const DatetimeInput = React.forwardRef<IDatetimeInputRef, Props>(
  ({ className, dateFormatOptions, textClass, timeFormatOptions, onChange, timezone, ...props }: Props, currentRef) => {

  const [value, setValue] = useState<Date>();
  const [text, setText] = useState('');

  const locale = useLocale();
  const dateOptions: Intl.DateTimeFormatOptions = dateFormatOptions ?? {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  };
  const timeOptions: Intl.DateTimeFormatOptions = timeFormatOptions ?? {
    hour: 'numeric',
    minute: 'numeric',
    dayPeriod: 'short',
    timeZone: timezone,
  };

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  useEffect(() => {
    if (!value || !value.toLocaleDateString || !value.toLocaleTimeString) {
      setText(props.mode === 'date' ? ' 📅 ' : ' 🕒 ');
    } else {
      const text = props.mode === 'date' ? value.toLocaleDateString(locale, dateOptions) : value.toLocaleTimeString(locale, timeOptions);
      setText(text);
    }
  }, [props.mode, value]);

  const open = () => DateTimePickerAndroid.open(params);

  useImperativeHandle(currentRef, () => {
    return { open };
  });

  const setDate = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'set' && !!date) {
      setValue(date);
      if (onChange) onChange(date);
    }
  }

  const params = {
    ...props,
    value: value ? new Date(fromLocalUTCtoUTCISOString(value.toISOString(), timezone)) : new Date(),
    design: 'material',
    onChange: setDate,
  };

  return (
    <Button
      className={ className }
      textClass={ textClass }
      title={ text }
      uppercase={false}
      onPress={ open }
    />
  );
});

export default DatetimeInput;
