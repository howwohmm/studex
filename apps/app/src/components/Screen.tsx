import { ScrollView } from 'react-native';
import Head from 'expo-router/head';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Text, spacing } from '@studex/ui';
import type { ReactNode } from 'react';

import { useSettled } from '@/lib/settled';

/** Large-title screen shell: grouped bg, in-screen large title, 20pt margins. */
export function Screen({
  title,
  children,
  ready = true,
}: {
  title: string;
  children: ReactNode;
  ready?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settledProps } = useSettled(ready);
  return (
    <ScrollView
      {...settledProps}
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
        <title>{`${title} — Studex`}</title>
      </Head>
      <Text variant="largeTitle" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </ScrollView>
  );
}
