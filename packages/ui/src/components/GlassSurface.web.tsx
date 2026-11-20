import { View, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { radii } from '../tokens';
import type { ReactNode } from 'react';

/** Web glass: backdrop-filter per direction §7. */
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
  return (
    <View
      style={[
        {
          backgroundColor: theme.glass.fallback,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: theme.glass.border,
          overflow: 'hidden',
          // @ts-expect-error — CSS property not in RN types
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
