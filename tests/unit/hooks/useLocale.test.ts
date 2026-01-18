import { renderHook } from '@testing-library/react-native';

import { useLocale } from '@/helpers/localization';

jest.mock('expo-localization', () => ({
  getLocales: jest
    .fn()
    .mockReturnValueOnce([{ languageCode: 'en', languageTag: 'en-US' }])
    .mockReturnValueOnce([{ languageCode: 'en', languageTag: 'en-US' }])
    .mockReturnValueOnce([{ languageCode: 'ru', languageTag: 'ru-RU' }])
    .mockReturnValueOnce([{ languageCode: undefined, languageTag: undefined }]),
}));

describe('Localization', () => {
  test('useLocale', () => {
    const { result, rerender } = renderHook(() => useLocale());

    expect(result.current).toBe('en-US');

    rerender({});

    expect(result.current).toBe('ru-RU');

    rerender({});

    expect(result.current).toBe('en-US');
  });
});
