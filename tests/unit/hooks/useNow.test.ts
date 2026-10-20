import { act, renderHook } from '@testing-library/react-native';

import { AppState } from 'react-native';

import useNow from '@/hooks/useNow';

describe('useNow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-19T23:59:30Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('keeps time stable during rerenders and updates each minute across midnight', () => {
    const { result, rerender, unmount } = renderHook(() => useNow());
    const initial = result.current;

    act(() => jest.advanceTimersByTime(30000));
    rerender({});
    expect(result.current).toBe(initial);

    act(() => jest.advanceTimersByTime(30000));
    expect(result.current.toISOString()).toBe('2026-10-20T00:00:30.000Z');

    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('refreshes immediately on foregrounding and removes the app state listener', () => {
    const remove = jest.fn();
    const listener = jest.spyOn(AppState, 'addEventListener').mockClear().mockReturnValue({ remove });
    const { result, unmount } = renderHook(() => useNow());

    jest.setSystemTime(new Date('2026-10-20T08:15:00Z'));
    act(() => listener.mock.calls[0][1]('active'));
    expect(result.current.toISOString()).toBe('2026-10-20T08:15:00.000Z');

    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
