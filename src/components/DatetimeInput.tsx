import React, { useEffect, useImperativeHandle, useState } from 'react';
import {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { DateTime } from 'luxon';
import { useLocale } from '@/helpers/localization';
import Button from '@/components/Button';
import { fromLocaltoUTCISOString } from '@/helpers/datetime';

interface Props {
  className?: string;
  dateFormatOptions?: Intl.DateTimeFormatOptions;
  display?: 'spinner' | 'default' | 'clock' | 'calendar';
  mode?: 'date' | 'time';
  textClass?: string;
  timezone: string;
  timeFormatOptions?: Intl.DateTimeFormatOptions;
  title?: string;
  value?: string;
  onChange?: (date: string) => void;
}

interface IDatetimeInputRef {
  open: () => void;
}

const DatetimeInput = React.forwardRef<IDatetimeInputRef, Props>(
  (
    {
      className,
      dateFormatOptions,
      textClass,
      timeFormatOptions,
      onChange,
      timezone,
      ...props
    }: Props,
    currentRef,
  ) => {
    const [value, setValue] = useState<string>('');
    const [dateValue, setDateValue] = useState<Date>(new Date());
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
      const v = props.value ?? '';
      const dateValue = new Date(v.slice(0, -6));
      if (!isNaN(dateValue.valueOf())) {
        setValue(v);
        setDateValue(dateValue);
      } else {
        setValue('');
        setDateValue(new Date());
      }
    }, [props.value]);

    useEffect(() => {
      if (!value) {
        setText(props.mode === 'date' ? ' 📅 ' : ' 🕒 ');
      } else {
        const date = new Date(value);
        const text =
          props.mode === 'date'
            ? date.toLocaleDateString(locale, dateOptions)
            : date.toLocaleTimeString(locale, timeOptions);
        setText(text);
      }
    }, [props.mode, value]);

    const open = () => DateTimePickerAndroid.open(params);

    useImperativeHandle(currentRef, () => {
      return { open };
    });

    const setDate = (event: DateTimePickerEvent, date?: Date) => {
      if (event.type === 'set' && !!date) {
        const textDate = DateTime.fromJSDate(date, { zone: 'local' })
          .setZone(timezone, { keepLocalTime: true })
          .toFormat('y-MM-dd HH:mm:ssZZ');
        setValue(textDate);
        setDateValue(new Date(textDate.slice(0, -6)));
        if (onChange) onChange(textDate);
      }
    };

    const params = {
      ...props,
      value: dateValue,
      design: 'material',
      onChange: setDate,
    };

    return (
      <Button
        className={className}
        textClass={textClass}
        title={text}
        uppercase={false}
        onPress={open}
      />
    );
  },
);

export default DatetimeInput;
