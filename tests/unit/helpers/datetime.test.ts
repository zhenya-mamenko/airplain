import * as DT from '@/helpers/datetime';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn().mockReturnValue([{ languageCode: 'en', languageTag: 'en-US' }]),
}));

describe('datetime helper', () => {
  test('durationToLocaleString', () => {
    expect(DT.durationToLocaleString(120, 'en-US')).toBe('2h');
    expect(DT.durationToLocaleString(121, 'en-US')).toBe('2h 1m');
    expect(DT.durationToLocaleString(1, 'en-US')).toBe('1m');
    expect(DT.durationToLocaleString(0, 'en-US')).toBe('');
    expect(DT.durationToLocaleString(60, 'en-US')).toBe('1h');
    expect(DT.durationToLocaleString(59, 'en-US')).toBe('59m');
  });

  test('makeDateLabel', () => {
    const startDate = new Date('2023-10-26T10:00:00');
    startDate.setFullYear(new Date().getFullYear());
    const endDate = new Date('2023-10-26T12:00:00');
    endDate.setFullYear(new Date().getFullYear());
    const startTimezone = 'Europe/Moscow';
    const endTimezone = 'Europe/Moscow';

    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'en-US')).toBe('October 26');
    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'ru-RU')).toBe('26 октября');

    endDate.setDate(27);
    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'en-US')).toBe('October 26 — 27');
    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'ru-RU')).toBe('26 — 27 октября');

    endDate.setMonth(10);
    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'en-US')).toBe('October 26 — November 27');
    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'ru-RU')).toBe('26 октября — 27 ноября');

    startDate.setFullYear(2023);
    endDate.setFullYear(2023);
    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'en-US')).toBe(
      'October 26 — November 27, 2023',
    );
    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'ru-RU')).toBe(
      '26 октября — 27 ноября 2023 г.',
    );

    endDate.setFullYear(2024);
    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'en-US')).toBe(
      'October 26, 2023 — November 27, 2024',
    );
    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'ru-RU')).toBe(
      '26 октября 2023 г. — 27 ноября 2024 г.',
    );
  });

  test('dateClass', () => {
    expect(DT.dateClass(10, 10)).toBeNull();
    expect(DT.dateClass(10, 11)).toBe('red');
    expect(DT.dateClass(10, 9)).toBe('green');
    expect(DT.dateClass(10)).toBeNull();
    expect(DT.dateClass(10, undefined)).toBeNull();
  });

  test('fromUTCtoLocalISOString', () => {
    expect(DT.fromUTCtoLocalISOString('2023-10-26T10:00:00Z', 'Europe/Moscow')).toBe('2023-10-26 13:00:00+03:00');
    expect(DT.fromUTCtoLocalISOString('2023-10-26T10:00:00Z', 'UTC')).toBe('2023-10-26 10:00:00+00:00');
    expect(DT.fromUTCtoLocalISOString('2023-10-26T10:00:00Z', 'America/New_York')).toBe('2023-10-26 06:00:00-04:00');
  });

  test('fromLocaltoLocalISOString', () => {
    expect(DT.fromLocaltoLocalISOString('2023-10-26T10:00:00Z', 'Europe/Moscow')).toBe('2023-10-26 10:00:00+03:00');
    expect(DT.fromLocaltoLocalISOString('2023-10-26T10:00:00Z', 'UTC')).toBe('2023-10-26 10:00:00+00:00');
    expect(DT.fromLocaltoLocalISOString('2023-10-26T10:00:00Z', 'America/New_York')).toBe('2023-10-26 10:00:00-04:00');
  });

  test('fromLocalUTCtoUTCISOString', () => {
    expect(DT.fromLocalUTCtoUTCISOString('2023-10-26T10:00:00Z', 'Europe/Moscow')).toBe('2023-10-26 13:00:00');
    expect(DT.fromLocalUTCtoUTCISOString('2023-10-26T10:00:00Z', 'UTC')).toBe('2023-10-26 10:00:00');
    expect(DT.fromLocalUTCtoUTCISOString('2023-10-26T10:00:00Z', 'America/New_York')).toBe('2023-10-26 06:00:00');
  });

  test('fromLocaltoUTCISOString', () => {
    expect(DT.fromLocaltoUTCISOString('2023-10-26 13:00:00+03:00')).toBe('2023-10-26 10:00:00');
    expect(DT.fromLocaltoUTCISOString('2023-10-26 10:00:00+00:00')).toBe('2023-10-26 10:00:00');
    expect(DT.fromLocaltoUTCISOString('2023-10-26 06:00:00-04:00')).toBe('2023-10-26 10:00:00');
  });

  test('makeDateLabel with shortMonth', () => {
    const startDate = new Date('2023-10-26T10:00:00');
    startDate.setFullYear(new Date().getFullYear());
    const endDate = new Date('2023-10-27T12:00:00');
    endDate.setFullYear(new Date().getFullYear());
    const startTimezone = 'Europe/Moscow';
    const endTimezone = 'Europe/Moscow';

    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'en-US', true)).toBe('Oct 26 — 27');
    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'ru-RU', true)).toBe('26 — 27 окт.');
  });

  test('makeDateLabel with different months and shortMonth', () => {
    const startDate = new Date('2023-10-26T10:00:00');
    startDate.setFullYear(new Date().getFullYear());
    const endDate = new Date('2023-11-27T12:00:00');
    endDate.setFullYear(new Date().getFullYear());
    const startTimezone = 'Europe/Moscow';
    const endTimezone = 'Europe/Moscow';

    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'en-US', true)).toBe('Oct 26 — Nov 27');
    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'ru-RU', true)).toBe('26 окт. — 27 нояб.');
  });

  test('makeDateLabel with same day and different years', () => {
    const startDate = new Date('2023-10-26T10:00:00');
    const endDate = new Date('2023-10-26T12:00:00');
    const startTimezone = 'Europe/Moscow';
    const endTimezone = 'Europe/Moscow';

    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'en-US')).toBe('October 26, 2023');
  });

  test('makeDateLabel with same month, date starting with number', () => {
    const startDate = new Date('2023-10-26T10:00:00');
    startDate.setFullYear(new Date().getFullYear());
    const endDate = new Date('2023-10-27T12:00:00');
    endDate.setFullYear(new Date().getFullYear());
    const startTimezone = 'Europe/Moscow';
    const endTimezone = 'Europe/Moscow';

    // For locales where date format starts with day number (like ru-RU)
    const result = DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'ru-RU');
    expect(result).toMatch(/^26 — 27/);
  });

  test('makeDateLabel with same month, date starting with month name', () => {
    const startDate = new Date('2023-10-26T10:00:00');
    startDate.setFullYear(new Date().getFullYear());
    const endDate = new Date('2023-10-27T12:00:00');
    endDate.setFullYear(new Date().getFullYear());
    const startTimezone = 'Europe/Moscow';
    const endTimezone = 'Europe/Moscow';

    // For locales where date format starts with month name (like en-US)
    const result = DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'en-US');
    expect(result).toMatch(/October 26 — 27/);
  });

  test('makeDateLabel with shortMonth false explicitly', () => {
    const startDate = new Date('2023-10-26T10:00:00');
    startDate.setFullYear(new Date().getFullYear());
    const endDate = new Date('2023-10-26T12:00:00');
    endDate.setFullYear(new Date().getFullYear());
    const startTimezone = 'Europe/Moscow';
    const endTimezone = 'Europe/Moscow';

    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'en-US', false)).toBe('October 26');
  });

  test('makeDateLabel with start year different and same end year', () => {
    const startDate = new Date('2023-10-26T10:00:00');
    const currentYear = new Date().getFullYear();
    const endDate = new Date('2023-10-28T12:00:00');
    endDate.setFullYear(currentYear);
    const startTimezone = 'Europe/Moscow';
    const endTimezone = 'Europe/Moscow';

    // Start year is different from current, end year is current year (different from start)
    const result = DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'en-US');
    expect(result).toContain('2023');
    // End year should not be shown as it's the current year
    expect(result).toMatch(/October 26, 2023 — (October )?28$/);
  });

  test('durationToLocaleString with zero hours and zero minutes', () => {
    expect(DT.durationToLocaleString(0, 'en-US')).toBe('');
  });

  test('durationToLocaleString with only hours', () => {
    expect(DT.durationToLocaleString(180, 'en-US')).toBe('3h');
  });

  test('durationToLocaleString with hours and minutes', () => {
    expect(DT.durationToLocaleString(185, 'en-US')).toBe('3h 5m');
  });

  test('makeDateLabel with undefined shortMonth', () => {
    const startDate = new Date('2023-10-26T10:00:00');
    startDate.setFullYear(new Date().getFullYear());
    const endDate = new Date('2023-10-26T12:00:00');
    endDate.setFullYear(new Date().getFullYear());
    const startTimezone = 'Europe/Moscow';
    const endTimezone = 'Europe/Moscow';

    // shortMonth is undefined by default
    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'en-US', undefined)).toBe('October 26');
  });

  test('fromUTCtoLocalISOString with invalid date returns original string', () => {
    expect(DT.fromUTCtoLocalISOString('invalid-date', 'Europe/Moscow')).toBe('invalid-date');
  });

  test('fromLocaltoLocalISOString with invalid date returns original string', () => {
    expect(DT.fromLocaltoLocalISOString('invalid-date', 'Europe/Moscow')).toBe('invalid-date');
  });

  test('fromLocalUTCtoUTCISOString with invalid date returns original string', () => {
    expect(DT.fromLocalUTCtoUTCISOString('invalid-date', 'Europe/Moscow')).toBe('invalid-date');
  });

  test('fromLocaltoUTCISOString with invalid date returns original string', () => {
    expect(DT.fromLocaltoUTCISOString('invalid-date')).toBe('invalid-date');
  });
});
