module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-worklets/plugin MUST be listed last.
      // In Reanimated v4 the babel plugin moved from react-native-reanimated
      // to its split-out react-native-worklets dependency.
      'react-native-worklets/plugin',
    ],
  };
};
