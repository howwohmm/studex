import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import type { HapticEvent } from './tokens';

/** Fire a haptic; no-ops on web. Respects the OS haptics toggle by construction. */
export function haptic(event: HapticEvent): void {
  if (Platform.OS === 'web') return;
  switch (event) {
    case 'mark':
    case 'undo':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'endOfDaySweep':
    case 'backAbove':
    case 'countUpLanded':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'destructiveConfirm':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'pickerChange':
      void Haptics.selectionAsync();
      break;
  }
}
