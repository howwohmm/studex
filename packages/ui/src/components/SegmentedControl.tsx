import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { radii, springs } from '../tokens';
import { haptic } from '../haptics';
import { Text } from './Text';

export function SegmentedControl({
  options,
  selected,
  onChange,
}: {
  options: readonly string[];
  selected: number;
  onChange: (index: number) => void;
}) {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const pos = useSharedValue(selected);
  const pill = useAnimatedStyle(() => ({
    transform: [{ translateX: `${pos.value * 100}%` }],
  }));
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: theme.fill.control,
        borderRadius: radii.sm,
        borderCurve: 'continuous' as never,
        padding: 2,
      }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 2,
            bottom: 2,
            left: 2,
            width: `${100 / options.length}%`,
            backgroundColor: theme.bg.surface,
            borderRadius: radii.sm - 2,
          },
          pill,
        ]}
      />
      {options.map((opt, i) => (
        <Pressable
          key={opt}
          accessibilityRole="tab"
          accessibilityState={{ selected: i === selected }}
          style={{ flex: 1, paddingVertical: 6, alignItems: 'center' }}
          onPress={() => {
            pos.value = reduce ? i : withSpring(i, springs.snappy);
            haptic('pickerChange');
            onChange(i);
          }}>
          <Text variant="subhead" color={i === selected ? 'primary' : 'secondary'}>
            {opt}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
