import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider, Stack } from 'expo-router';
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
  useEffect(() => {
    if (Platform.OS !== 'web' || !QA_ENABLED) return;
    const q = new URLSearchParams(location.search).get('scheme');
    // Microtask: applies before each screen's data-settled timer (macrotask).
    if (q === 'dark' || q === 'light') void Promise.resolve().then(() => setForced(q));
  }, []);
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
