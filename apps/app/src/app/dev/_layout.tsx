import { Stack, Redirect } from 'expo-router';

export default function DevLayout() {
  if (!(__DEV__ || process.env.EXPO_PUBLIC_QA === '1')) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
