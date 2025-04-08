import * as DT from '@/helpers/datetime';


jest.mock('expo-localization', () => ({
  getLocales: jest.fn()
    .mockReturnValue([{ languageCode: 'en', languageTag: 'en-US' }])
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
    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'en-US')).toBe('October 26 — November 27, 2023');
    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'ru-RU')).toBe('26 октября — 27 ноября 2023 г.');

    endDate.setFullYear(2024);
    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'en-US')).toBe('October 26, 2023 — November 27, 2024');
    expect(DT.makeDateLabel(startDate, startTimezone, endDate, endTimezone, 'ru-RU')).toBe('26 октября 2023 г. — 27 ноября 2024 г.');
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

});
