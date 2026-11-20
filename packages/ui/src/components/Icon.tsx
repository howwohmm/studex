import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Platform, Text } from 'react-native';
import { ioniconsReady } from '../icon-font';
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
  // @expo/vector-icons renders an empty <Text/> until the web font finishes
  // loading — SSR output and the first client render diverge, which breaks
  // hydration. On web, render the glyph directly and kick the font load
  // after mount instead.
  const [fontLoaded, setFontLoaded] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // Shared promise: resolves on success AND on failure (glyph still shows).
    void ioniconsReady().then(() => setFontLoaded(true));
  }, []);
  if (Platform.OS === 'ios') {
    return <SymbolView name={mapping.sf} size={size} tintColor={resolved} />;
  }
  if (Platform.OS === 'web') {
    const glyph = String.fromCodePoint(
      Number(
        Ionicons.getRawGlyphMap()[mapping.ion as keyof ReturnType<typeof Ionicons.getRawGlyphMap>],
      ),
    );
    return (
      <Text
        selectable={false}
        style={{
          color: resolved,
          fontSize: size,
          fontFamily: Ionicons.getFontFamily(),
          fontWeight: 'normal',
          fontStyle: 'normal',
          opacity: fontLoaded ? 1 : 0,
        }}
      >
        {glyph}
      </Text>
    );
  }
  return <Ionicons name={mapping.ion} size={size} color={resolved} />;
}
