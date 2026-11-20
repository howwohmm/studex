import { router } from 'expo-router';
import { t } from '@studex/copy';
import { EmptyState } from '@studex/ui';
import { Screen } from '@/components/Screen';

export default function TodayScreen() {
  return (
    <Screen title={t('today.title')}>
      <EmptyState
        icon="gauge"
        message={t('subjects.empty')}
        ctaTitle={t('capture.button.scan')}
        onCta={() => router.push('/welcome')}
      />
    </Screen>
  );
}
