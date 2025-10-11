import useDynamicColorScheme from '@/hooks/useDynamicColorScheme';
import { act, renderHook } from '@testing-library/react-native';

const mockAddChangeListener = jest.fn();

jest.mock('react-native', () => ({
  Appearance: {
    getColorScheme: () => 'light',
    addChangeListener: (cb: Function) => {
      mockAddChangeListener(cb);
      return { remove: jest.fn() };
    },
  },
}));

describe('useDynamicColorScheme', () => {
  test('Get color scheme', () => {
    const colorScheme = renderHook(() => useDynamicColorScheme());

    expect(colorScheme.result.current).toBe('light');
  });

  test('Change color scheme', () => {
    mockAddChangeListener.mockClear();
    const colorScheme = renderHook(() => useDynamicColorScheme());

    expect(colorScheme.result.current).toBe('light');
    expect(mockAddChangeListener).toHaveBeenCalledTimes(1);

    act(() => {
      mockAddChangeListener.mock.calls[0][0]({ colorScheme: 'dark' });
    });
    colorScheme.rerender({});

    expect(colorScheme.result.current).toBe('dark');
  });
});
