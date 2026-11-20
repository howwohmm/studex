import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTheme } from '../theme';
import type { ThemeColors } from '../tokens';

/** Semantic icon names → SF Symbol (iOS) / Ionicons (elsewhere). direction §8. */
const ICON_MAP = {
  today: { sf: 'sun.max', ion: 'sunny-outline' },
  subjects: { sf: 'books.vertical', ion: 'library-outline' },
  plan: { sf: 'calendar', ion: 'calendar-outline' },
  library: { sf: 'folder', ion: 'folder-outline' },
  tutor: { sf: 'sparkles', ion: 'sparkles-outline' },
  attended: { sf: 'checkmark', ion: 'checkmark' },
  bunked: { sf: 'xmark', ion: 'close' },
  cancelled: { sf: 'minus.circle', ion: 'remove-circle-outline' },
  scan: { sf: 'doc.text.viewfinder', ion: 'scan-outline' },
  gauge: { sf: 'gauge.with.dots.needle.33percent', ion: 'speedometer-outline' },
  folder: { sf: 'folder', ion: 'folder-outline' },
  calendar: { sf: 'calendar', ion: 'calendar-outline' },
  leaf: { sf: 'leaf', ion: 'leaf-outline' },
  plus: { sf: 'plus', ion: 'add' },
  more: { sf: 'ellipsis', ion: 'ellipsis-horizontal' },
  person: { sf: 'person.crop.circle', ion: 'person-circle-outline' },
} as const;

export type IconName = keyof typeof ICON_MAP;
export type IconColor = keyof ThemeColors['label'] | 'accent' | `#${string}` | `rgba(${string})`;

export function Icon({
  name,
  size = 24,
  color,
}: {
  name: IconName;
  size?: number;
  color?: IconColor;
}) {
  const theme = useTheme();
  const resolved =
    color === undefined
      ? theme.label.primary
      : color === 'accent'
        ? theme.accent
        : color in theme.label
          ? theme.label[color as keyof ThemeColors['label']]
          : color;
  const mapping = ICON_MAP[name];
  if (Platform.OS === 'ios') {
    return <SymbolView name={mapping.sf} size={size} tintColor={resolved} />;
  }
  return <Ionicons name={mapping.ion} size={size} color={resolved} />;
}
