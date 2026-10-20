import { act, renderHook } from '@testing-library/react-native';

import type { NotificationResponse } from 'expo-notifications';

import useNotificationObserver from '@/hooks/useNotificationObserver';

const mockReplace = jest.fn();
const mockListeners = new Map<string, Set<() => void>>();
let mockNavigationReady = false;
let mockResponse: NotificationResponse | null | undefined;
const mockNavigationRef = {
  isReady: () => mockNavigationReady,
  addListener: jest.fn((event: string, listener: () => void) => {
    if (!mockListeners.has(event)) mockListeners.set(event, new Set());
    mockListeners.get(event)!.add(listener);
    return () => mockListeners.get(event)?.delete(listener);
  }),
};

function listenersCount() {
  return [...mockListeners.values()].reduce((sum, listeners) => sum + listeners.size, 0);
}

function emit(event: string) {
  act(() => {
    mockListeners.get(event)?.forEach((listener) => listener());
  });
}

jest.mock('expo-notifications', () => ({
  useLastNotificationResponse: () => mockResponse,
}));

jest.mock('expo-router', () => ({
  router: { replace: (url: string) => mockReplace(url) },
  useNavigationContainerRef: () => mockNavigationRef,
}));

function response(identifier: string, url?: unknown): NotificationResponse {
  return {
    actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
    notification: {
      date: 0,
      request: {
        identifier,
        trigger: null,
        content: {
          title: null,
          subtitle: null,
          body: null,
          sound: null,
          categoryIdentifier: null,
          data: url === undefined ? {} : { url },
        },
      },
    },
  };
}

function navigationBecomesReady(event = 'ready') {
  mockNavigationReady = true;
  emit(event);
}

describe('useNotificationObserver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListeners.clear();
    mockNavigationReady = false;
    mockResponse = null;
  });

  test('defers a cold-start response until initialization and navigation are both ready', () => {
    mockResponse = response('cold-start', '/flights/actual?flightId=42');
    const { rerender } = renderHook(({ ready }: { ready: boolean }) => useNotificationObserver(ready), {
      initialProps: { ready: false },
    });
    expect(mockReplace).not.toHaveBeenCalled();

    rerender({ ready: true });
    expect(mockReplace).not.toHaveBeenCalled();

    navigationBecomesReady();
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/flights/actual?flightId=42');

    navigationBecomesReady();
    rerender({ ready: true });
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  test('waits for initialization even if navigation is already ready', () => {
    mockNavigationReady = true;
    mockResponse = response('cold-start', '/flights/actual?flightId=42');
    const { rerender } = renderHook(({ ready }: { ready: boolean }) => useNotificationObserver(ready), {
      initialProps: { ready: false },
    });
    expect(mockReplace).not.toHaveBeenCalled();

    rerender({ ready: true });
    expect(mockReplace).toHaveBeenCalledWith('/flights/actual?flightId=42');
  });

  test('opens responses received after startup, including subsequent background taps', () => {
    mockNavigationReady = true;
    mockResponse = undefined;
    const { rerender } = renderHook(() => useNotificationObserver(true));
    expect(mockReplace).not.toHaveBeenCalled();

    mockResponse = response('first', '/flights/actual?flightId=1');
    rerender({});
    expect(mockReplace).toHaveBeenLastCalledWith('/flights/actual?flightId=1');

    mockResponse = response('second', '/flights/actual?flightId=2');
    rerender({});
    expect(mockReplace).toHaveBeenLastCalledWith('/flights/actual?flightId=2');
    expect(mockReplace).toHaveBeenCalledTimes(2);
  });

  test('only opens the latest response received before navigation is ready', () => {
    mockResponse = response('first', '/flights/actual?flightId=1');
    const { rerender } = renderHook(() => useNotificationObserver(true));

    mockResponse = response('second', '/flights/actual?flightId=2');
    rerender({});
    navigationBecomesReady();

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/flights/actual?flightId=2');
  });

  test('does not navigate for notifications without a URL', () => {
    mockNavigationReady = true;
    mockResponse = response('no-url');
    renderHook(() => useNotificationObserver(true));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('reports invalid URLs without attempting navigation', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockNavigationReady = true;
    mockResponse = response('invalid-url', { flightId: 42 });
    renderHook(() => useNotificationObserver(true));

    expect(warn).toHaveBeenCalledWith('Cannot open notification: URL must be a string', { flightId: 42 });
    expect(mockReplace).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  test('falls back to navigation state changes when ready was already emitted', () => {
    mockResponse = response('cold-start', '/flights/actual?flightId=42');
    renderHook(() => useNotificationObserver(true));
    expect(mockReplace).not.toHaveBeenCalled();

    navigationBecomesReady('state');
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/flights/actual?flightId=42');

    emit('ready');
    emit('state');
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  test('does not throw if navigation fails', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockReplace.mockImplementationOnce(() => {
      throw new Error('Attempted to navigate before mounting the Root Layout component.');
    });
    mockNavigationReady = true;
    mockResponse = response('failing', '/flights/actual?flightId=42');

    expect(() => renderHook(() => useNotificationObserver(true))).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('removes the readiness listeners on unmount', () => {
    mockResponse = response('pending', '/flights/actual?flightId=42');
    const { unmount } = renderHook(() => useNotificationObserver(true));
    expect(listenersCount()).toBe(2);

    unmount();
    expect(listenersCount()).toBe(0);
    navigationBecomesReady();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
