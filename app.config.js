/**
 * Adds what depends on the environment to app.json: Google's iOS URL scheme
 * comes from the FamCal iOS client id (EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
 * "123-abc.apps.googleusercontent.com" becomes "com.googleusercontent.apps.123-abc").
 */
module.exports = ({ config }) => {
  const ios = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const google = ios
    ? ['@react-native-google-signin/google-signin', { iosUrlScheme: ios.split('.').reverse().join('.') }]
    : '@react-native-google-signin/google-signin';
  return { ...config, plugins: [...config.plugins, google] };
};
