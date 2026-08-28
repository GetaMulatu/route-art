const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === './ReactNativeSVG' && platform === 'web') {
    return {
      filePath: require.resolve('react-native-svg/lib/module/ReactNativeSVG.web'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;