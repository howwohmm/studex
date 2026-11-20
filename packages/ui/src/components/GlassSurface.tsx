import { View, Platform, type ViewStyle } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useTheme } from '../theme';
import { radii } from '../tokens';
import type { ReactNode } from 'react';

/**
 * Liquid Glass on iOS 26+, fallback tinted surface elsewhere.
 * GlassView is iOS/tvOS-only; do not wrap it in opacity per Expo docs.
 */
export function GlassSurface({
  children,
  style,
  radius = radii.lg,
}: {
  children: ReactNode;
  style?: ViewStyle;
  radius?: number;
}) {
  const theme = useTheme();
  if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
    return (
      <GlassView
        style={[
          { borderRadius: radius, borderCurve: 'continuous' as never, overflow: 'hidden' },
          style,
        ]}
      >
        {children}
      </GlassView>
    );
  }
  return (
    <View
      style={[
        {
          backgroundColor: theme.glass.fallback,
          borderRadius: radius,
          borderCurve: 'continuous' as never,
          borderWidth: 1,
          borderColor: theme.glass.border,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
