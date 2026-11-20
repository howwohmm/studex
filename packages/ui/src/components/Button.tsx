import { Pressable, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { springs, radii } from '../tokens';
import { useReducedMotion } from '../reduced-motion';
import { useTheme } from '../theme';
import { haptic } from '../haptics';
import { Text } from './Text';
import type { HapticEvent } from '../tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  icon,
  hapticEvent,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'tinted' | 'plain';
  disabled?: boolean;
  icon?: React.ReactNode;
  hapticEvent?: HapticEvent;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const reduce = useReducedMotion();
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const bg =
    variant === 'primary'
      ? theme.accentSolid
      : variant === 'tinted'
        ? theme.accentSoft
        : 'transparent';
  const fg = variant === 'primary' ? theme.onAccent : theme.accent;
  const style: ViewStyle = {
    minHeight: 50,
    borderRadius: radii.md,
    borderCurve: 'continuous' as never,
    backgroundColor: bg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    opacity: disabled ? 0.4 : 1,
  };
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={[style, animated]}
      onPressIn={() => {
        if (!disabled && !reduce) scale.value = withSpring(0.97, springs.snappy);
      }}
      onPressOut={() => {
        if (!disabled && !reduce) scale.value = withSpring(1, springs.snappy);
      }}
      onPress={() => {
        if (hapticEvent) haptic(hapticEvent);
        onPress();
      }}
    >
      {icon}
      <Text variant="headline" color={fg} style={{ color: fg }}>
        {title}
      </Text>
    </AnimatedPressable>
  );
}

export function IconButton({
  onPress,
  children,
  size = 44,
  tint,
  hapticEvent,
  accessibilityLabel,
}: {
  onPress: () => void;
  children: React.ReactNode;
  size?: number;
  tint?: string;
  hapticEvent?: HapticEvent;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const reduce = useReducedMotion();
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={Math.max(0, (44 - size) / 2)}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tint ?? theme.fill.control,
          alignItems: 'center',
          justifyContent: 'center',
        },
        animated,
      ]}
      onPressIn={() => {
        if (!reduce) scale.value = withSpring(0.97, springs.snappy);
      }}
      onPressOut={() => {
        if (!reduce) scale.value = withSpring(1, springs.snappy);
      }}
      onPress={() => {
        if (hapticEvent) haptic(hapticEvent);
        onPress();
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
