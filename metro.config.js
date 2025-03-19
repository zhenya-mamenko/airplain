// @ts-nocheck
const { getDefaultConfig } = require('expo/metro-config');

let config = getDefaultConfig(__dirname);

if (config.resolver?.assetExts) {
  config.resolver.assetExts = config.resolver.assetExts.concat(['csv', 'sql']);
}
if (config.transformer) {
  config.transformer.unstable_allowRequireContext = true;
}

module.exports = config;
