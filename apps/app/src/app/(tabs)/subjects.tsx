import { router } from 'expo-router';
import { t } from '@studex/copy';
import { EmptyState } from '@studex/ui';
import { Screen } from '@/components/Screen';

export default function SubjectsScreen() {
  return (
    <Screen title={t('subjects.title')}>
      <EmptyState
        icon="subjects"
        message={t('subjects.empty')}
        ctaTitle={t('capture.button.scan')}
        onCta={() => router.push('/welcome')}
      />
    </Screen>
  );
}
