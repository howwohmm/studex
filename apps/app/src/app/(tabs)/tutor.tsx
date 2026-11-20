import { t } from '@studex/copy';
import { EmptyState } from '@studex/ui';
import { Screen } from '@/components/Screen';

export default function TutorScreen() {
  return (
    <Screen title={t('tabs.tutor')}>
      <EmptyState icon="tutor" message={t('tutor.empty')} />
    </Screen>
  );
}
