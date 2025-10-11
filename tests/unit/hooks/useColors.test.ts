import {
  useThemeColor,
  useThemeColors,
  usePaletteColor,
} from '@/hooks/useColors';
import { renderHook } from '@testing-library/react-native';
import mockedPalettes from '../../__mocks__/palettes.json';
import mockedThemes from '../../__mocks__/themes.json';

jest.mock('@/hooks/useDynamicColorScheme', () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockReturnValueOnce('light')
    .mockReturnValueOnce('dark')
    .mockReturnValueOnce(undefined)
    .mockReturnValueOnce('light')
    .mockReturnValueOnce('dark')
    .mockReturnValueOnce(undefined),
}));

describe('useColors', () => {
  test('useThemeColor', () => {
    const { result, rerender } = renderHook(() =>
      useThemeColor('colors.primary'),
    );

    expect(result.current).toBe(mockedThemes.light.colors.primary);

    rerender({});

    expect(result.current).toBe(mockedThemes.dark.colors.primary);

    rerender({});

    expect(result.current).toBe(mockedThemes.light.colors.primary);
  });

  test('useThemeColor with specific theme', () => {
    const { result } = renderHook(() =>
      useThemeColor('colors.primary', 'dark'),
    );
    expect(result.current).toBe(mockedThemes.dark.colors.primary);
  });

  test('useThemeColor with invalid color name', () => {
    const { result } = renderHook(() =>
      useThemeColor('invalid.color', 'light'),
    );
    expect(result.current).toBeUndefined();
  });

  test('useThemeColors', () => {
    const { result, rerender } = renderHook(() =>
      useThemeColors(['colors.primary', 'colors.secondary']),
    );

    expect(result.current).toEqual([
      mockedThemes.light.colors.primary,
      mockedThemes.light.colors.secondary,
    ]);

    rerender({});

    expect(result.current).toEqual([
      mockedThemes.dark.colors.primary,
      mockedThemes.dark.colors.secondary,
    ]);

    rerender({});

    expect(result.current).toEqual([
      mockedThemes.light.colors.primary,
      mockedThemes.light.colors.secondary,
    ]);
  });

  test('useThemeColors with specific theme', () => {
    const { result } = renderHook(() =>
      useThemeColors(['colors.primary', 'colors.secondary'], 'dark'),
    );
    expect(result.current).toEqual([
      mockedThemes.dark.colors.primary,
      mockedThemes.dark.colors.secondary,
    ]);
  });

  test('usePaletteColor', () => {
    const { result } = renderHook(() => usePaletteColor('P-5'));
    expect(result.current).toBe(mockedPalettes.primary['5']);
  });

  test('usePaletteColor secondary', () => {
    const { result } = renderHook(() => usePaletteColor('S-50'));
    expect(result.current).toBe(mockedPalettes.secondary['50']);
  });

  test('usePaletteColor neutral-variant', () => {
    const { result } = renderHook(() => usePaletteColor('NV-0'));
    expect(result.current).toBe(mockedPalettes['neutral-variant']['0']);
  });

  test('usePaletteColor invalid color', () => {
    const { result } = renderHook(() => usePaletteColor('INVALID'));
    expect(result.current).toBeUndefined();
  });
});
