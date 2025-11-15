require('react-native-reanimated').setUpTests();

jest.mock('expo-sqlite', () => {
  const { openDatabaseAsync } = require('./helpers/sqlite-adapter');
  return {
    openDatabaseAsync,
    openDatabaseSync: jest.fn(),
  };
});

jest.mock('expo-sqlite/kv-store', () => {
  const storage = new Map();
  return {
    __esModule: true,
    default: {
      getItemSync: (key) => storage.get(key) ?? null,
      setItemSync: (key, value) => storage.set(key, value),
      removeItemSync: (key) => storage.delete(key),
    },
  };
});

jest.mock('csv-parse/dist/esm/sync', () => {
  return require('csv-parse/sync');
});

jest.mock('expo-asset', () => {
  return {
    Asset: {
      loadAsync: jest.fn((localUri) => Promise.resolve([{ localUri }])),
    },
  };
});

jest.mock('expo-file-system', () => {
  return {
    readAsStringAsync: jest.fn((content) => Promise.resolve(content)),
  };
});
