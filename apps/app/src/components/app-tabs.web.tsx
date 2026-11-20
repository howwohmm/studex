import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { useWindowDimensions, View, Pressable, StyleSheet, type ViewProps } from 'react-native';
import { t, type CopyKey } from '@studex/copy';
import { useTheme, Icon, Text, breakpoints, spacing, radii, type IconName } from '@studex/ui';

const TABS = [
  { name: 'index', href: '/', icon: 'today', label: 'tabs.today' },
  { name: 'subjects', href: '/subjects', icon: 'subjects', label: 'tabs.subjects' },
  { name: 'plan', href: '/plan', icon: 'plan', label: 'tabs.plan' },
  { name: 'library', href: '/library', icon: 'library', label: 'tabs.library' },
  { name: 'tutor', href: '/tutor', icon: 'tutor', label: 'tabs.tutor' },
] as const satisfies readonly { name: string; href: string; icon: IconName; label: CopyKey }[];

export default function AppTabs() {
  const { width } = useWindowDimensions();
  const sidebar = width >= breakpoints.sidebar;
  return (
    <Tabs style={sidebar ? { flexDirection: 'row-reverse' } : undefined}>
      <TabSlot style={{ flex: 1, height: '100%' }} />
      <TabList asChild>
        <TabBar sidebar={sidebar}>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabItem tab={tab} sidebar={sidebar} />
            </TabTrigger>
          ))}
        </TabBar>
      </TabList>
    </Tabs>
  );
}

function TabBar({
  sidebar,
  children,
  ...props
}: { sidebar: boolean; children: React.ReactNode } & ViewProps) {
  const theme = useTheme();
  return (
    <View
      {...props}
      style={[
        styles.bar,
        sidebar
          ? {
              width: 240,
              borderRightWidth: 1,
              flexDirection: 'column',
              paddingTop: spacing[24],
              gap: spacing[4],
            }
          : {
              borderTopWidth: 1,
              flexDirection: 'row',
              paddingBottom: spacing[8],
              paddingTop: spacing[8],
            },
        {
          borderColor: theme.glass.border,
          backgroundColor: theme.glass.fallback,
          backdropFilter: 'blur(20px) saturate(180%)',
          // @ts-expect-error — vendor-prefixed CSS property not in RN types
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        },
      ]}
    >
      {children}
    </View>
  );
}

function TabItem({
  isFocused,
  tab,
  sidebar,
  ...props
}: TabTriggerSlotProps & { tab: (typeof TABS)[number]; sidebar: boolean }) {
  const theme = useTheme();
  const color = isFocused ? theme.accent : theme.label.secondary;
  return (
    <Pressable
      {...props}
      style={[
        styles.item,
        !sidebar && { flex: 1 },
        sidebar
          ? {
              flexDirection: 'row',
              gap: 12,
              justifyContent: 'flex-start',
              paddingHorizontal: spacing[20],
              paddingVertical: spacing[12],
              borderRadius: radii.md,
              marginHorizontal: spacing[8],
              backgroundColor: isFocused ? theme.accentSoft : 'transparent',
            }
          : { alignItems: 'center', gap: 2, paddingVertical: 4 },
      ]}
    >
      <Icon name={tab.icon} size={22} color={color} />
      <Text variant="caption1" style={{ color }}>
        {t(tab.label)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { alignItems: 'stretch' },
  item: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
});
