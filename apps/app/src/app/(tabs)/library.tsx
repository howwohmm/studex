import { t } from '@studex/copy';
import { EmptyState } from '@studex/ui';
import { Screen } from '@/components/Screen';

export default function LibraryScreen() {
  return (
    <Screen title={t('tabs.library')}>
      <EmptyState icon="library" message={t('library.empty')} />
    </Screen>
  );
}
