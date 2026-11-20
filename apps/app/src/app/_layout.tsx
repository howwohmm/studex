import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
  Stack,
  useGlobalSearchParams,
  usePathname,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { ThemeProvider, type ColorScheme } from '@studex/ui';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { QA_ENABLED } from '@/lib/qa';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Hydration-safe: render the static default (system scheme) first, then read
  // ?scheme= from the browser after mount — never during render.
  const [forced, setForced] = useState<ColorScheme>();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ scheme?: string }>();
  // QA-only: re-read ?scheme= on every navigation — links carrying the param
  // force the theme, links without it clear the override.
  useEffect(() => {
    if (!QA_ENABLED) return;
    const raw =
      Platform.OS === 'web' ? new URLSearchParams(location.search).get('scheme') : params.scheme;
    const next = raw === 'dark' || raw === 'light' ? raw : undefined;
    // Microtask: applies before each screen's data-settled timer (macrotask).
    void Promise.resolve().then(() => setForced(next));
  }, [pathname, params.scheme]);
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
