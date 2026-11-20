import { Stack, Redirect } from 'expo-router';

import { QA_ENABLED } from '@/lib/qa';

export default function DevLayout() {
  if (!QA_ENABLED) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
