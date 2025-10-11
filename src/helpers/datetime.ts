import t from '@/helpers/localization';
import { DateTime } from 'luxon';

export function durationToLocaleString(
  duration: number,
  locale: string,
): string {
  // This is a workaround for the lack of support for Intl.RelativeTimeFormat in Expo.
  // const rtf = new Intl.RelativeTimeFormat(locale, { localeMatcher: 'best fit', style: 'narrow' });
  // const hours = rtf.formatToParts(Math.floor(duration / 60), 'hours');
  // const minutes = rtf.formatToParts(duration % 60, 'minutes');
  // So I used the following code to get the same result
  const h = Math.floor(duration / 60);
  const m = duration % 60;
  const hours = [{}, { value: h }, { value: t('measurements.h') }];
  const minutes = [{}, { value: m }, { value: t('measurements.m') }];
  let result = '';
  if (h !== 0) {
    result += `${hours[1].value}${hours[2].value}`;
  }
  if (m !== 0) {
    result += `${result !== '' ? ' ' : ''}${minutes[1].value}${minutes[2].value}`;
  }
  return result;
}

export function makeDateLabel(
  startDate: Date,
  startTimezone: string,
  endDate: Date,
  endTimezone: string,
  locale: string,
  shortMonth?: boolean,
): string {
  const currentStart = DateTime.now().setZone(startTimezone);
  const currentEnd = DateTime.now().setZone(endTimezone);
  const start = DateTime.fromJSDate(startDate).setZone(startTimezone);
  const end = DateTime.fromJSDate(endDate).setZone(endTimezone);
  const month = !!shortMonth ? 'short' : 'long';
  let dateOptions: Intl.DateTimeFormatOptions = {
    month,
    day: 'numeric',
    timeZone: startTimezone,
  };
  if (
    start.year !== currentStart.year &&
    (start.year !== end.year || end.day === start.day)
  ) {
    dateOptions.year = 'numeric';
  }
  let startLabel = startDate.toLocaleString(locale, dateOptions);
  if (end.day === start.day) {
    return startLabel;
  }

  dateOptions = {
    month,
    day: 'numeric',
    timeZone: endTimezone,
  };
  if (end.year !== currentEnd.year) {
    dateOptions.year = 'numeric';
  }

  const endLabel = endDate.toLocaleString(locale, dateOptions);
  if (end.month === start.month) {
    if (!isNaN(parseInt(startLabel.split(' ')[0]))) {
      return `${start.day} — ${endLabel}`;
    } else {
      return `${startLabel} — ${end.day}`;
    }
  }

  return `${startLabel} — ${endLabel}`;
}

export const dateClass = (planned: number, actual?: number): string | null => {
  if (!actual || planned === actual) {
    return null;
  }
  return actual > planned ? 'red' : 'green';
};

export function fromUTCtoLocalISOString(
  utcISOString: string,
  timezone: string,
): string {
  const result = DateTime.fromISO(utcISOString.replace('Z', ''), {
    zone: 'utc',
  })
    .setZone(timezone)
    .toFormat('y-MM-dd HH:mm:ssZZ');
  return result ?? utcISOString;
}

export function fromLocaltoLocalISOString(
  localISOString: string,
  timezone: string,
): string {
  const result = DateTime.fromISO(localISOString.replace('Z', ''), {
    zone: timezone,
  }).toFormat('y-MM-dd HH:mm:ssZZ');
  return result ?? localISOString;
}

export function fromLocalUTCtoUTCISOString(
  utcISOString: string,
  timezone: string,
): string {
  const result = DateTime.fromISO(utcISOString.replace('Z', ''), {
    zone: 'utc',
  })
    .setZone(timezone)
    .toFormat('y-MM-dd HH:mm:ss');
  return result ?? utcISOString;
}

export function fromLocaltoUTCISOString(localISOString: string): string {
  const result = DateTime.fromFormat(localISOString, 'y-MM-dd HH:mm:ssZZ')
    .setZone('utc')
    .toFormat('y-MM-dd HH:mm:ss');
  return result ?? localISOString;
}

export function replaceTimeZone(localString: string, timezone: string): string {
  return DateTime.fromFormat(localString, 'y-MM-dd HH:mm:ssZZ')
    .setZone(timezone, { keepLocalTime: true })
    .toFormat('y-MM-dd HH:mm:ssZZ');
}
