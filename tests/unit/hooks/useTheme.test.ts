import useTheme from '@/hooks/useTheme';
import { renderHook } from '@testing-library/react-native';
import mockedThemes from '../../__mocks__/themes.json';

jest.mock('@/hooks/useDynamicColorScheme', () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockReturnValueOnce('light')
    .mockReturnValueOnce('dark')
    .mockReturnValueOnce(undefined),
}));

jest.mock('@/hooks/useTheme', () => ({
  __esModule: true,
  ...jest.requireActual('@/hooks/useTheme'),
  additions: {
    spacing: {
      xs: 4,
    },
    font: {
      sizes: {
        mdl: 20,
      },
    },
    radius: {
      xs: 3,
    },
  },
}));

describe('useTheme', () => {
  test('useTheme with default theme', () => {
    const { result, rerender } = renderHook(() => useTheme());

    expect(result.current.colors).toEqual(mockedThemes.light.colors);
    expect(result.current.spacing.xs).toBe(4);
    expect(result.current.font.sizes.mdl).toBe(20);
    expect(result.current.radius.xs).toBe(3);

    rerender({});

    expect(result.current.colors).toEqual(mockedThemes.dark.colors);
    expect(result.current.spacing.xs).toBe(4);
    expect(result.current.font.sizes.mdl).toBe(20);
    expect(result.current.radius.xs).toBe(3);

    rerender({});

    expect(result.current.colors).toEqual(mockedThemes.light.colors);
    expect(result.current.spacing.xs).toBe(4);
    expect(result.current.font.sizes.mdl).toBe(20);
    expect(result.current.radius.xs).toBe(3);
  });

  test('useTheme with specific theme', () => {
    const { result } = renderHook(() => useTheme('dark'));

    expect(result.current.colors).toEqual(mockedThemes.dark.colors);
    expect(result.current.spacing.xs).toBe(4);
    expect(result.current.font.sizes.mdl).toBe(20);
    expect(result.current.radius.xs).toBe(3);
  });
});
