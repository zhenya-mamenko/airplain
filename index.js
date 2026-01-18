import 'expo-router/entry';

// Polyfills must be loaded before any other modules
import './shim';
// Register background tasks before app loads
import './src/helpers/backgroundtasks';
