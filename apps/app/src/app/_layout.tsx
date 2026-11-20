import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useGlobalSearchParams } from 'expo-router';
import { Platform, useColorScheme } from 'react-native';
import { ThemeProvider, type ColorScheme } from '@studex/ui';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

// Dev routes are reachable in dev builds and in QA exports (EXPO_PUBLIC_QA=1
// is inlined at bundle time); production exports keep them gated off.
export const QA_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_QA === '1';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { scheme } = useGlobalSearchParams<{ scheme?: string }>();
  // Static exports hydrate before router params are reliable, so on web read
  // the query directly — ?scheme= must force the theme on the very first paint.
  const webScheme =
    Platform.OS === 'web' && typeof location !== 'undefined'
      ? new URLSearchParams(location.search).get('scheme')
      : null;
  const raw = webScheme ?? scheme;
  const forced: ColorScheme | undefined = raw === 'dark' || raw === 'light' ? raw : undefined;
  const resolved = forced ?? (colorScheme === 'dark' ? 'dark' : 'light');
  return (
    <ThemeProvider scheme={resolved}>
      <NavThemeProvider value={resolved === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="welcome" />
          {QA_ENABLED ? <Stack.Screen name="dev" /> : null}
        </Stack>
      </NavThemeProvider>
    </ThemeProvider>
  );
}
