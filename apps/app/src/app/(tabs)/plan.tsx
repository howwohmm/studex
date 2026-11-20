import { t } from '@studex/copy';
import { EmptyState } from '@studex/ui';
import { Screen } from '@/components/Screen';

export default function PlanScreen() {
  return (
    <Screen title={t('tabs.plan')}>
      <EmptyState icon="plan" message={t('plan.empty')} />
    </Screen>
  );
}
