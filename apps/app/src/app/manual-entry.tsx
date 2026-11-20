import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@studex/copy';
import { useTheme, EmptyState, spacing } from '@studex/ui';

export default function ManualEntryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg.grouped }}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + spacing[24] }}>
      <EmptyState
        icon="scan"
        message={t('manual.placeholder')}
        ctaTitle={t('common.back')}
        onCta={() => router.back()}
      />
    </ScrollView>
  );
}
