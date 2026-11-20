import { useEffect, useRef } from 'react';
import { PixelRatio, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { Text } from './Text';
import type { TextVariant } from '../tokens';
import { typeScale } from '../tokens';

function Digit({ digit, size, variant, color }: { digit: string; size: number; variant: TextVariant; color?: string | undefined }) {
  const y = useSharedValue(Number(digit));
  const reduce = useReducedMotion();
  useEffect(() => {
    const d = Number(digit);
    y.value = reduce ? d : withTiming(d, { duration: 280, easing: Easing.out(Easing.quad) });
  }, [digit, y, reduce]);
  const h = typeScale[variant].lineHeight * PixelRatio.getFontScale();
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -y.value * h }] }));
  return (
    <View style={{ height: h, overflow: 'hidden', width: size }}>
      <Animated.View style={style}>
        {Array.from({ length: 10 }, (_, i) => (
          <Text key={i} variant={variant} color={color as never} style={{ height: h }} tabular>
            {i}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

/** Per-digit vertical roll for live numbers; non-digits render statically. */
export function NumberTicker({
  value,
  variant = 'hero',
  color,
}: {
  value: string;
  variant?: TextVariant;
  color?: string;
}) {
  const fs = PixelRatio.getFontScale();
  const h = typeScale[variant].lineHeight * fs;
  const digitW = typeScale[variant].fontSize * 0.62 * fs;
  return (
    <View
      accessibilityLabel={value}
      style={{ flexDirection: 'row', height: h, alignItems: 'center' }}>
      {value.split('').map((ch, i) =>
        /\d/.test(ch) ? (
          <Digit key={i} digit={ch} size={digitW} variant={variant} color={color} />
        ) : (
          <Text key={i} variant={variant} color={color as never} tabular>
            {ch}
          </Text>
        ),
      )}
    </View>
  );
}
