import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { hapticEvents, type HapticEvent } from './tokens';

/** Fire a haptic; no-ops on web. Mapping lives in tokens.hapticEvents. */
export function haptic(event: HapticEvent): void {
  if (Platform.OS === 'web') return;
  const kind = hapticEvents[event];
  switch (kind) {
    case 'impactLight':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'notificationSuccess':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'notificationWarning':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'selection':
      void Haptics.selectionAsync();
      break;
    default: {
      const _exhaustive: never = kind as never;
      void _exhaustive;
    }
  }
}
