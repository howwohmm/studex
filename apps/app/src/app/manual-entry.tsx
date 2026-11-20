import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@studex/copy';
import { useTheme, EmptyState, spacing } from '@studex/ui';

export default function ManualEntryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg.grouped }}
      contentContainerStyle={{ paddingTop: insets.top }}>
      <EmptyState icon="scan" message={t('manual.placeholder')} />
    </ScrollView>
  );
}
