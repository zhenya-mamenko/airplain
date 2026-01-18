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

// csv-parse is mapped via moduleNameMapper in package.json

jest.mock('expo-asset', () => {
  return {
    Asset: {
      loadAsync: jest.fn((localUri) => Promise.resolve([{ localUri }])),
    },
  };
});

jest.mock('expo-file-system', () => {
  return {
    Paths: {
      cache: '/mock/cache/',
      document: '/mock/document/',
    },
    Directory: jest.fn().mockImplementation((_) => ({
      exists: true,
      create: jest.fn(),
      delete: jest.fn(() => Promise.resolve()),
    })),
    File: jest.fn().mockImplementation((uri) => ({
      exists: true,
      text: jest.fn(() => Promise.resolve(uri)),
      base64: jest.fn(() => Promise.resolve(uri)),
      write: jest.fn(() => Promise.resolve()),
    })),
  };
});
