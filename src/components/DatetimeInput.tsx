import { DateTimePickerAndroid, DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { DateTime } from 'luxon';

import React, { useImperativeHandle, useMemo, useState } from 'react';

import Button from '@/components/Button';
import { useLocale } from '@/helpers/localization';

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

const removeTimeZone = (dateString: string) => dateString.replace(/(\+|-)\d{2}:\d{2}$/gi, '');

const DatetimeInput = React.forwardRef<IDatetimeInputRef, Props>(
  ({ className, dateFormatOptions, textClass, timeFormatOptions, onChange, timezone, ...props }: Props, currentRef) => {
    const [overrideValue, setOverrideValue] = useState<string | null>(null);

    const { value, dateValue } = useMemo(() => {
      const v = overrideValue ?? props.value ?? '';
      const parsed = new Date(removeTimeZone(v));
      if (!isNaN(parsed.valueOf())) {
        return { value: v, dateValue: parsed };
      }
      return { value: '', dateValue: new Date() };
    }, [overrideValue, props.value]);

    const locale = useLocale();
    const dateOptions: Intl.DateTimeFormatOptions = useMemo(
      () =>
        dateFormatOptions ?? {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        },
      [dateFormatOptions],
    );
    const timeOptions: Intl.DateTimeFormatOptions = useMemo(
      () =>
        timeFormatOptions ?? {
          hour: 'numeric',
          minute: 'numeric',
          dayPeriod: 'short',
        },
      [timeFormatOptions],
    );

    const text = useMemo(() => {
      if (!value) {
        return props.mode === 'date' ? ' 📅 ' : ' 🕒 ';
      }
      const date = new Date(removeTimeZone(value));
      return props.mode === 'date'
        ? date.toLocaleDateString(locale, dateOptions)
        : date.toLocaleTimeString(locale, timeOptions);
    }, [props.mode, value, locale, dateOptions, timeOptions]);

    const setDate = (event: DateTimePickerChangeEvent, date: Date) => {
      const textDate = DateTime.fromJSDate(date, { zone: 'local' })
        .setZone(timezone, { keepLocalTime: true })
        .toFormat('y-MM-dd HH:mm:ssZZ');
      setOverrideValue(textDate);
      if (onChange) onChange(textDate);
    };

    const params = {
      mode: props.mode,
      display: props.display,
      value: dateValue,
      onValueChange: setDate,
    };

    const open = () => DateTimePickerAndroid.open(params);

    useImperativeHandle(currentRef, () => {
      return { open };
    });

    return <Button className={className} textClass={textClass} title={text} uppercase={false} onPress={open} />;
  },
);

export default DatetimeInput;
