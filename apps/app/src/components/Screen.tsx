import { ScrollView } from 'react-native';
import Head from 'expo-router/head';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Text, spacing } from '@studex/ui';
import type { ReactNode } from 'react';

/** Large-title screen shell: grouped bg, in-screen large title, 20pt margins. */
export function Screen({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg.grouped }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing[8],
        paddingHorizontal: spacing[20],
        paddingBottom: insets.bottom + 120,
        gap: spacing[20],
      }}
      contentInsetAdjustmentBehavior="never"
    >
      <Head>
        <title>{title} — Studex</title>
      </Head>
      <Text variant="largeTitle" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </ScrollView>
  );
}
