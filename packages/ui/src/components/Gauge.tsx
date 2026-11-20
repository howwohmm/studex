import { Platform, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { useTheme } from '../theme';

/** Ring gauge with threshold tick; progress is a 0..1 shared value. */
export function Gauge({
  progress,
  threshold,
  size = 168,
  stroke = 14,
  children,
  accessibilityLabel,
}: {
  progress: SharedValue<number>;
  threshold: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const center = size / 2;
  const props = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - Math.max(0, Math.min(1, progress.value))),
  }));
  // tick spans the stroke plus 4 pt on each side, at the threshold position
  const tickAngle = (Math.PI * 2 * threshold) / 100 - Math.PI / 2;
  const tickR1 = r - stroke / 2 - 4;
  const tickR2 = r + stroke / 2 + 4;
  const pad = 4;
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg
        width={size + pad * 2}
        height={size + pad * 2}
        style={{ position: 'absolute' }}
        viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`}
        {...(Platform.OS === 'web'
          ? {}
          : {
              accessible: false,
              accessibilityElementsHidden: true,
              importantForAccessibility: 'no-hide-descendants' as const,
            })}>
        <Circle cx={center} cy={center} r={r} stroke={theme.fill.control} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={r}
          stroke={theme.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          animatedProps={props}
          transform={`rotate(-90 ${center} ${center})`}
        />
        <Line
          x1={center + tickR1 * Math.cos(tickAngle)}
          y1={center + tickR1 * Math.sin(tickAngle)}
          x2={center + tickR2 * Math.cos(tickAngle)}
          y2={center + tickR2 * Math.sin(tickAngle)}
          stroke={theme.label.secondary}
          strokeWidth={3}
          strokeLinecap="round"
        />
      </Svg>
      {children}
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
