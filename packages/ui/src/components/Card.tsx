import { View, type ViewStyle } from 'react-native';
import { radii, spacing } from '../tokens';
import { useTheme } from '../theme';
import type { ReactNode } from 'react';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.bg.surface,
          borderRadius: radii.lg,
          borderCurve: 'continuous' as never,
          padding: spacing[20],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
