import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useReducedMotion } from '../reduced-motion';
import { useTheme } from '../theme';
import { radii } from '../tokens';

export function Skeleton({
  width,
  height = 16,
  radius = radii.sm,
}: {
  width: number | `${number}%`;
  height?: number;
  radius?: number;
}) {
  const theme = useTheme();
  const opacity = useSharedValue(0.5);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [opacity, reduce]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: width as never,
          height,
          borderRadius: radius,
          backgroundColor: theme.fill.control,
        },
        style,
      ]}
    />
  );
}
