import { Link, type Href } from 'expo-router';
import { View } from 'react-native';
import { Screen } from '@/components/Screen';
import { ListRow, spacing } from '@studex/ui';

const ROUTES: { href: Href; label: string }[] = [
  { href: '/', label: 'Today (tabs)' },
  { href: '/subjects', label: 'Subjects tab' },
  { href: '/plan', label: 'Plan tab' },
  { href: '/library', label: 'Library tab' },
  { href: '/tutor', label: 'Tutor tab' },
  { href: '/welcome', label: 'Welcome' },
  { href: '/capture', label: 'Capture placeholder' },
  { href: '/manual-entry', label: 'Manual entry placeholder' },
  { href: '/dev/gallery', label: 'Component gallery' },
  { href: '/dev/today-demo', label: 'Today demo (midday)' },
  { href: '/dev/today-demo?clock=morning', label: 'Today demo — morning' },
  { href: '/dev/today-demo?clock=evening', label: 'Today demo — evening' },
  { href: '/dev/qa?scheme=dark', label: 'This page — dark' },
];

export default function QaLauncher() {
  return (
    <Screen title="QA">
      <View style={{ gap: spacing[8] }}>
        {ROUTES.map((r) => (
          <Link key={r.label} href={r.href} asChild>
            <ListRow title={r.label} />
          </Link>
        ))}
      </View>
      <View style={{ height: spacing[20] }} />
    </Screen>
  );
}
