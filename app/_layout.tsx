import '../src/i18n'; // init i18n before any screen renders
import React, { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
// Per-weight imports so only the four weights we use get bundled.
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { Geist_700Bold } from '@expo-google-fonts/geist/700Bold';
import ToastHost from '../src/components/ToastHost';
import { startNotifications } from '../src/lib/notify';
import { VeilHost } from '../src/components/Veil';
import Dock from '../src/components/Dock';
import { tokens } from '../src/theme';
import { useThemeGen, Keyed } from '../src/theme/mode';
import { isDark } from '../src/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

// On web the host page already keeps content clear of notch and home bar.
const ZERO = { top: 0, right: 0, bottom: 0, left: 0 };
const WebInsets = ({ children }: { children: React.ReactNode }) =>
  Platform.OS === 'web' ? <SafeAreaInsetsContext.Provider value={ZERO}>{children}</SafeAreaInsetsContext.Provider> : <>{children}</>;

const sheet = { presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } } as const;

export default function RootLayout() {
  const [loaded, error] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold });
  // Darkmode: a new palette remounts the tree once; the page that switched opens again.
  // Darkmode: a new palette redraws every screen; where you are stays as it is.
  const gen = useThemeGen();

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  // Reminders on the phone (Spec §5): plans them and keeps them in step with the Termine.
  useEffect(() => { startNotifications(); }, []);

  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: tokens.bg }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <SafeAreaProvider>
        <WebInsets>
          <StatusBar style={isDark() ? 'light' : 'dark'} />
          <Stack screenLayout={({ children }) => <Keyed>{children}</Keyed>} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.bg }, animation: 'default' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="neu" options={sheet} />
            <Stack.Screen name="symbol" options={sheet} />
            <Stack.Screen name="meilenstein/[id]" options={sheet} />
            <Stack.Screen name="foto-kamera" options={{ animation: 'fade', contentStyle: { backgroundColor: '#1E2427' } }} />
            <Stack.Screen name="foto-lesen" options={{ animation: 'fade' }} />
            <Stack.Screen name="demo/sperrbildschirm" options={{ animation: 'fade' }} />
            <Stack.Screen name="demo/teilen" options={{ animation: 'fade' }} />
            <Stack.Screen name="demo/widgets" />
          </Stack>
          <Keyed>
            <Dock />
            <VeilHost />
            <ToastHost />
          </Keyed>
        </WebInsets>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
