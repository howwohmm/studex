import { useEffect, useRef } from 'react';
import { View, Pressable, AccessibilityInfo, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { GlassSurface } from './GlassSurface';
import { Text } from './Text';
import { useTheme } from '../theme';
import { haptic } from '../haptics';

/** Glass toast; optional undo action; hairline progress drains over durationMs. */
export function Toast({
  message,
  action,
  onAction,
  visible,
  durationMs = 5000,
  onHide,
}: {
  message: string;
  action?: string;
  onAction?: () => void;
  visible: boolean;
  durationMs?: number;
  onHide?: () => void;
}) {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const progress = useSharedValue(1);
  const ty = useSharedValue(20);
  const fade = useSharedValue(0);
  const hideRef = useRef(onHide);
  hideRef.current = onHide;

  useEffect(() => {
    if (visible) {
      progress.value = 1;
      ty.value = 20;
      progress.value = reduce ? 1 : withTiming(0, { duration: durationMs, easing: Easing.linear });
      ty.value = reduce ? 0 : withTiming(0, { duration: 200 });
      fade.value = withTiming(1, { duration: 200 });
      const timer = setTimeout(() => hideRef.current?.(), durationMs);
      if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(message);
      return () => clearTimeout(timer);
    }
    fade.value = withTiming(0, { duration: 150 });
    return undefined;
  }, [visible, message, durationMs, progress, ty, fade, reduce]);

  const wrap = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: fade.value,
  }));
  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      {...(Platform.OS === 'web'
        ? {}
        : {
            accessibilityElementsHidden: !visible,
            importantForAccessibility: (visible ? 'auto' : 'no-hide-descendants') as
              'auto' | 'no-hide-descendants',
          })}
      style={[
        { position: 'absolute', left: 16, right: 16, bottom: 24, alignItems: 'center' },
        wrap,
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <GlassSurface radius={14}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 12,
          }}
        >
          <Text variant="callout">{message}</Text>
          {action && onAction ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                haptic('undo');
                onAction();
              }}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 12,
                minHeight: 44,
                justifyContent: 'center',
              }}
            >
              <Text variant="callout" color="accent" style={{ fontWeight: '600' }}>
                {action}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <View style={{ height: 1, backgroundColor: theme.separator }}>
          <Animated.View style={[{ height: 1, backgroundColor: theme.accent }, bar]} />
        </View>
      </GlassSurface>
    </Animated.View>
  );
}
