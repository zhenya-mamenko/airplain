import { act, render } from '@testing-library/react-native';

import * as Brightness from 'expo-brightness';

import BoardingPass from '@/components/BoardingPass';
import type { PKPassData } from '@/types';

jest.mock('expo-brightness', () => ({
  setBrightnessAsync: jest.fn(),
  restoreSystemBrightnessAsync: jest.fn(),
}));
jest.mock('@bwip-js/react-native', () => ({}), { virtual: true });
jest.mock('@expo/vector-icons/FontAwesome5', () => 'FontAwesome5');
jest.mock('expo-image', () => ({ Image: 'Image', useImage: jest.fn() }));
jest.mock('react-native-picasso', () => {
  const { Text, View } = require('react-native');
  return { Text, View };
});
jest.mock('@/helpers/boardingpass', () => ({ parsefncMessage: jest.fn() }));

const pkpass: PKPassData = {
  airline: 'Test airline',
  barcode: { altText: '', format: '', message: '', messageEncoding: '' },
  boardingPass: {},
  colors: { backgroundColor: '#FFFFFF', foregroundColor: '#000000', labelColor: '#000000' },
  images: {},
};

const mockSetBrightness = jest.mocked(Brightness.setBrightnessAsync);
const mockRestoreSystemBrightness = jest.mocked(Brightness.restoreSystemBrightnessAsync);

describe('BoardingPass brightness', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockSetBrightness.mockResolvedValue(undefined);
    mockRestoreSystemBrightness.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps maximum brightness during viewing and rerenders', async () => {
    const { rerender, unmount } = render(<BoardingPass pkpass={pkpass} />);
    await act(async () => {});

    rerender(<BoardingPass pkpass={{ ...pkpass }} />);
    await act(async () => {});

    expect(mockSetBrightness.mock.calls).toEqual([[1]]);
    expect(mockRestoreSystemBrightness).not.toHaveBeenCalled();

    unmount();
    await act(async () => {});
  });

  it('follows system brightness changes after closing the pass and returning to the app', async () => {
    let systemBrightness = 0.4;
    let windowBrightness: number | undefined;
    mockSetBrightness.mockImplementation(async (value) => {
      windowBrightness = value;
    });
    mockRestoreSystemBrightness.mockImplementation(async () => {
      windowBrightness = undefined;
    });
    const appBrightness = () => windowBrightness ?? systemBrightness;

    const { unmount } = render(<BoardingPass pkpass={pkpass} />);
    await act(async () => {});
    expect(appBrightness()).toBe(1);

    unmount();
    await act(async () => {});
    expect(mockRestoreSystemBrightness).toHaveBeenCalledTimes(1);
    expect(appBrightness()).toBe(0.4);

    // Change the system setting on the desktop before returning to the flight list.
    systemBrightness = 0.7;
    expect(appBrightness()).toBe(0.7);
    expect(mockSetBrightness.mock.calls).toEqual([[1]]);
  });

  it('releases the override even when closed before setting brightness completes', async () => {
    let finishSetting!: () => void;
    mockSetBrightness.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishSetting = resolve;
      }),
    );
    const { unmount } = render(<BoardingPass pkpass={pkpass} />);
    unmount();
    await act(async () => {});
    expect(mockRestoreSystemBrightness).not.toHaveBeenCalled();

    await act(async () => finishSetting());
    expect(mockRestoreSystemBrightness).toHaveBeenCalledTimes(1);
  });

  it('reports a failure to maximize brightness and still releases the override', async () => {
    const error = new Error('Cannot set brightness');
    const logError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSetBrightness.mockRejectedValueOnce(error);
    const { unmount } = render(<BoardingPass pkpass={pkpass} />);
    await act(async () => {});
    expect(logError).toHaveBeenCalledWith(error);

    unmount();
    await act(async () => {});
    expect(mockRestoreSystemBrightness).toHaveBeenCalledTimes(1);
  });

  it('reports a failure to release the override', async () => {
    const error = new Error('Cannot restore brightness');
    const logError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRestoreSystemBrightness.mockRejectedValueOnce(error);
    const { unmount } = render(<BoardingPass pkpass={pkpass} />);
    await act(async () => {});

    unmount();
    await act(async () => {});
    expect(logError).toHaveBeenCalledWith(error);
  });
});
