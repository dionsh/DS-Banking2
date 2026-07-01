const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// react-native-country-picker-modal ships a broken nested copy of
// react-async-hook: its package.json "module" field points to
// "react-async-hook.esm.js" which doesn't exist (the file lives in dist/).
// That breaks web bundling. Redirect all react-async-hook imports to the
// working top-level copy.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-async-hook') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/react-async-hook/dist/index.js'),
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
