import { useEffect } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, useReducedMotion, Easing,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@studex/copy';
import { useTheme, Text, Button, Icon, spacing, radii, type IconName } from '@studex/ui';

const FEATURES = [
  { icon: 'today', key: 'onboarding.feature.1' },
  { icon: 'gauge', key: 'onboarding.feature.2' },
  { icon: 'folder', key: 'onboarding.feature.3' },
] as const satisfies readonly { icon: IconName; key: string }[];

function Staggered({ index, children }: { index: number; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    const delay = index * 60;
    const timer = setTimeout(() => {
      v.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
    }, delay);
    return () => clearTimeout(timer);
  }, [index, v]);
  const style = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: reduce ? 0 : (1 - v.value) * 12 }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** FR-ONB-001 welcome — static, locked copy only. */
export default function WelcomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg.grouped }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + spacing[56] + spacing[40],
        paddingHorizontal: spacing[24],
        paddingBottom: insets.bottom + spacing[24],
      }}>
      <View style={{ gap: spacing[32] }}>
        <Staggered index={0}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              borderCurve: 'continuous' as never,
              backgroundColor: theme.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon name="gauge" size={40} color="#FFFFFF" />
          </View>
        </Staggered>
        <Staggered index={1}>
          <Text variant="largeTitle">{t('onboarding.headline')}</Text>
        </Staggered>
        <View style={{ gap: spacing[20] }}>
          {FEATURES.map((f, i) => (
            <Staggered key={f.key} index={i + 2}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[16] }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radii.md,
                    borderCurve: 'continuous' as never,
                    backgroundColor: theme.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Icon name={f.icon} size={30} color="accent" />
                </View>
                <Text variant="headline" style={{ flex: 1 }}>{t(f.key)}</Text>
              </View>
            </Staggered>
          ))}
        </View>
      </View>
      <View style={{ flex: 1, minHeight: spacing[32] }} />
      <Staggered index={5}>
        <View style={{ gap: spacing[8] }}>
          <Button title={t('welcome.cta')} onPress={() => router.push('/capture')} />
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/manual-entry')}
            style={{ paddingVertical: spacing[8], alignItems: 'center', minHeight: 44, justifyContent: 'center' }}>
            <Text variant="subhead" color="accent">{t('capture.manual.link')}</Text>
          </Pressable>
        </View>
      </Staggered>
    </ScrollView>
  );
}
