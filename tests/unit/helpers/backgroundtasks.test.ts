const mockRegisterHeadlessTask = jest.fn();
const mockSyncBackgroundConfig = jest.fn();
const mockSyncBackgroundFlights = jest.fn();
const mockCheckBatteryOptimization = jest.fn();
const mockRequestBatteryOptimizationExemption = jest.fn();
const mockStartBackgroundTask = jest.fn();
const mockStopBackgroundTask = jest.fn();
const mockFlightsCheckTask = jest.fn();
const mockGetSetting = jest.fn();
const mockSetSetting = jest.fn();
const mockShowConfirmation = jest.fn();
const mockTranslate = jest.fn((key: string) => key);

const loadBackgroundTasksModule = () => {
  jest.resetModules();

  jest.doMock('react-native', () => ({
    AppRegistry: {
      registerHeadlessTask: mockRegisterHeadlessTask,
    },
    NativeModules: {
      AirPlainBgModule: {
        checkBatteryOptimization: () => mockCheckBatteryOptimization(),
        requestBatteryOptimizationExemption: () => mockRequestBatteryOptimizationExemption(),
        startBackgroundTask: () => mockStartBackgroundTask(),
        stopBackgroundTask: () => mockStopBackgroundTask(),
        syncBackgroundConfig: (payload: string) => mockSyncBackgroundConfig(payload),
        syncBackgroundFlights: (payload: string) => mockSyncBackgroundFlights(payload),
      },
    },
  }));

  jest.doMock('@/constants/settings', () => ({
    __esModule: true,
    AEDBX_API_URL: 'https://adb.example.test',
    AEROAPI_API_URL: 'https://aero.example.test',
    getSetting: (key: string, defaultValue?: string) => mockGetSetting(key, defaultValue),
    setSetting: (key: string, value: string) => mockSetSetting(key, value),
    settings: {
      AEDBX_API_KEY: 'adb-key',
      AEROAPI_API_KEY: 'aero-key',
      CURRENT_API: 'aeroapi',
      ONLY_MANUAL_REFRESH: 'false',
    },
  }));

  jest.doMock('@/helpers/airdata', () => ({
    __esModule: true,
    flightsCheckTask: (options: any) => mockFlightsCheckTask(options),
  }));

  jest.doMock('@/helpers/common', () => ({
    __esModule: true,
    showConfirmation: (options: any) => mockShowConfirmation(options),
  }));

  jest.doMock('@/helpers/localization', () => ({
    __esModule: true,
    default: (key: string) => mockTranslate(key),
  }));

  return require('@/helpers/backgroundtasks');
};

describe('backgroundtasks helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSetting.mockImplementation((_key: string, defaultValue?: string) => defaultValue ?? '');
  });

  test('registers headless task and forwards execution mode', async () => {
    loadBackgroundTasksModule();

    expect(mockRegisterHeadlessTask).toHaveBeenCalledWith('flightsCheckTask', expect.any(Function));

    const factory = mockRegisterHeadlessTask.mock.calls[0][1];
    const task = factory();

    await task({ executionMode: 'headless' });
    await task();

    expect(mockFlightsCheckTask).toHaveBeenNthCalledWith(1, { executionMode: 'headless' });
    expect(mockFlightsCheckTask).toHaveBeenNthCalledWith(2, { executionMode: 'interactive' });
  });

  test('buildNativeBackgroundTaskConfig returns current settings snapshot', () => {
    const { buildNativeBackgroundTaskConfig } = loadBackgroundTasksModule();

    expect(buildNativeBackgroundTaskConfig()).toEqual({
      aerodataboxApiKey: 'adb-key',
      aerodataboxApiUrl: 'https://adb.example.test',
      aeroapiApiKey: 'aero-key',
      aeroapiApiUrl: 'https://aero.example.test',
      currentApi: 'aeroapi',
      enabled: true,
    });
  });

  test('syncBackgroundTaskConfig serializes config for native module', async () => {
    const { syncBackgroundTaskConfig } = loadBackgroundTasksModule();

    await syncBackgroundTaskConfig({
      aerodataboxApiKey: 'a',
      aerodataboxApiUrl: 'u1',
      aeroapiApiKey: 'b',
      aeroapiApiUrl: 'u2',
      currentApi: 'aerodatabox',
      enabled: false,
    });

    expect(mockSyncBackgroundConfig).toHaveBeenCalledWith(
      JSON.stringify({
        aerodataboxApiKey: 'a',
        aerodataboxApiUrl: 'u1',
        aeroapiApiKey: 'b',
        aeroapiApiUrl: 'u2',
        currentApi: 'aerodatabox',
        enabled: false,
      }),
    );
  });

  test('syncBackgroundFlights serializes active flights snapshot', async () => {
    const { syncBackgroundFlights } = loadBackgroundTasksModule();

    await syncBackgroundFlights([
      {
        airline: 'BA',
        arrivalAirport: 'LHR',
        arrivalAirportTimezone: 'Europe/London',
        arrivalCountry: 'GB',
        departureAirport: 'JFK',
        departureAirportTimezone: 'America/New_York',
        departureCountry: 'US',
        distance: 5540,
        endDatetime: '2099-04-10T20:00:00+00:00',
        extra: {},
        flightId: 5,
        flightNumber: '123',
        info: {},
        isArchived: false,
        recordType: 1,
        startDatetime: '2099-04-10T12:00:00+00:00',
        status: 'scheduled',
        actualEndDatetime: '2099-04-10T20:05:00+00:00',
        actualStartDatetime: '2099-04-10T12:10:00+00:00',
        arrivalTerminal: 'T5',
        baggageBelt: 'B9',
        departureCheckInDesk: '12',
        departureGate: 'A7',
        departureTerminal: 'T3',
      },
    ] as any);

    expect(mockSyncBackgroundFlights).toHaveBeenCalledWith(
      JSON.stringify([
        {
          actualEndDatetime: '2099-04-10T20:05:00+00:00',
          actualStartDatetime: '2099-04-10T12:10:00+00:00',
          airline: 'BA',
          arrivalTerminal: 'T5',
          baggageBelt: 'B9',
          departureCheckInDesk: '12',
          departureGate: 'A7',
          departureTerminal: 'T3',
          endDatetime: '2099-04-10T20:00:00+00:00',
          flightId: 5,
          flightNumber: '123',
          isArchived: false,
          recordType: 1,
          startDatetime: '2099-04-10T12:00:00+00:00',
          status: 'scheduled',
        },
      ]),
    );
  });

  test('wrapper methods delegate to native module', async () => {
    const { checkBatteryOptimization, requestBatteryOptimizationExemption, startBackgroundTask, stopBackgroundTask } =
      loadBackgroundTasksModule();
    mockCheckBatteryOptimization.mockResolvedValue(true);

    await expect(checkBatteryOptimization()).resolves.toBe(true);
    requestBatteryOptimizationExemption();
    startBackgroundTask();
    stopBackgroundTask();

    expect(mockRequestBatteryOptimizationExemption).toHaveBeenCalled();
    expect(mockStartBackgroundTask).toHaveBeenCalled();
    expect(mockStopBackgroundTask).toHaveBeenCalled();
  });

  test('maybePromptBatteryOptimizationExemption stores startup attempt and shows confirmation once', async () => {
    const { maybePromptBatteryOptimizationExemption } = loadBackgroundTasksModule();
    mockCheckBatteryOptimization.mockResolvedValue(false);

    await maybePromptBatteryOptimizationExemption();

    expect(mockGetSetting).toHaveBeenCalledWith('BATTERY_OPTIMIZATION_PROMPT_ATTEMPTED', 'false');
    expect(mockSetSetting).toHaveBeenCalledWith('BATTERY_OPTIMIZATION_PROMPT_ATTEMPTED', 'true');
    expect(mockShowConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'settings.background_optimization_title',
        description: 'settings.background_optimization_description',
        confirmButton: 'settings.background_optimization_confirm',
      }),
    );
  });
});
