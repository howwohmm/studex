import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Text, spacing, useScheme } from '@studex/ui';
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
      contentInsetAdjustmentBehavior="automatic">
      <Text variant="largeTitle">{title}</Text>
      {children}
    </ScrollView>
  );
}
