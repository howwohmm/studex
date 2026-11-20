import { Pressable, View } from 'react-native';
import { useTheme } from '../theme';
import { radii } from '../tokens';
import { Text } from './Text';
import type { ReactNode } from 'react';

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  style,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  style?: object;
}) {
  const theme = useTheme();
  const inner = (
    <View
      style={[
        {
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 8,
          paddingHorizontal: 16,
          backgroundColor: theme.bg.surface,
        },
        style,
      ]}>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="headline">{title}</Text>
        {subtitle ? (
          <Text variant="subhead" color="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => (pressed ? { backgroundColor: theme.fill.control } : undefined)}>
      {inner}
    </Pressable>
  );
}

export function Chip({ label, color }: { label: string; color?: string }) {
  const theme = useTheme();
  const c = color ?? theme.label.secondary;
  return (
    <View
      style={{
        borderRadius: radii.pill,
        borderCurve: 'continuous' as never,
        backgroundColor: theme.fill.control,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}>
      <Text variant="caption1" style={{ color: c }} tabular>
        {label}
      </Text>
    </View>
  );
}

export function Badge({ label, color }: { label: string; color?: string }) {
  const theme = useTheme();
  const c = color ?? theme.accent;
  return (
    <View
      style={{
        borderRadius: radii.pill,
        borderCurve: 'continuous' as never,
        backgroundColor: theme.accentSoft,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}>
      <Text variant="caption2" style={{ color: c, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}
