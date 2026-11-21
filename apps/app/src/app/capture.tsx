import { ScrollView } from 'react-native';
import Head from 'expo-router/head';

import { useSettled } from '@/lib/settled';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@studex/copy';
import { useTheme, useScheme, EmptyState, spacing } from '@studex/ui';

export default function CaptureScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scheme = useScheme();
  const { settledProps } = useSettled(true, [scheme]);
  return (
    <>
      <Head>
        <title>{'Capture — Studex'}</title>
      </Head>
      <ScrollView
        {...settledProps}
        style={{ flex: 1, backgroundColor: theme.bg.grouped }}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom + spacing[24],
        }}
      >
        <EmptyState
          icon="scan"
          message={t('capture.placeholder')}
          ctaTitle={t('common.back')}
          onCta={() => router.back()}
        />
      </ScrollView>
    </>
  );
}
