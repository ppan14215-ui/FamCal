/**
 * Adds what depends on the environment to app.json: Google's iOS URL scheme
 * comes from the FamCal iOS client id (EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
 * "123-abc.apps.googleusercontent.com" becomes "com.googleusercontent.apps.123-abc").
 */
module.exports = ({ config }) => {
  // Release gate (Julian 22.11.2026, docs/SICHERHEIT.md): the test login's mail and password are inlined into the
  // JS bundle. A store build or a production update that still sees them stops here instead of shipping them.
  const store = process.env.EAS_BUILD_PROFILE === 'production' || process.env.EAS_UPDATE_CHANNEL === 'production' || process.env.FAMCAL_RELEASE === '1';
  if (store && (process.env.EXPO_PUBLIC_TEST_EMAIL || process.env.EXPO_PUBLIC_TEST_PASSWORD)) {
    throw new Error('FamCal release gate: EXPO_PUBLIC_TEST_EMAIL / EXPO_PUBLIC_TEST_PASSWORD must not be set for a store build.');
  }
  const ios = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const google = ios
    ? ['@react-native-google-signin/google-signin', { iosUrlScheme: ios.split('.').reverse().join('.') }]
    : '@react-native-google-signin/google-signin';
  return { ...config, plugins: [...config.plugins, google] };
};
