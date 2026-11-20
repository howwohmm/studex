/** Design tokens — docs/design/direction.md §2–§7. */

export const colors = {
  light: {
    bg: { grouped: '#F2F2F7', surface: '#FFFFFF', elevated: '#FFFFFF' },
    fill: { control: 'rgba(120,120,128,0.12)' },
    label: {
      primary: '#000000',
      secondary: 'rgba(60,60,67,0.75)',
      tertiary: 'rgba(60,60,67,0.30)',
    },
    separator: 'rgba(60,60,67,0.18)',
    accent: '#4B5CF6',
    accentSolid: '#4B5CF6',
    onAccent: '#FFFFFF',
    accentSoft: 'rgba(75,92,246,0.12)',
    accentText: '#3D4CE0',
    status: { attended: '#1EA446', bunked: '#E5372B', close: '#C27C00' },
    glass: { fallback: 'rgba(255,255,255,0.72)', border: 'rgba(0,0,0,0.06)' },
  },
  dark: {
    bg: { grouped: '#000000', surface: '#1C1C1E', elevated: '#2C2C2E' },
    fill: { control: 'rgba(120,120,128,0.24)' },
    label: {
      primary: '#FFFFFF',
      secondary: 'rgba(235,235,245,0.60)',
      tertiary: 'rgba(235,235,245,0.30)',
    },
    separator: 'rgba(84,84,88,0.65)',
    accent: '#8A96FF',
    accentSolid: '#4B5CF6',
    onAccent: '#FFFFFF',
    accentSoft: 'rgba(138,150,255,0.18)',
    accentText: '#8A96FF',
    status: { attended: '#32D74B', bunked: '#FF5A4E', close: '#FFB340' },
    glass: { fallback: 'rgba(28,28,30,0.72)', border: 'rgba(255,255,255,0.08)' },
  },
} as const;

export type ThemeColors = (typeof colors)[keyof typeof colors];
export type ColorScheme = keyof typeof colors;

export const typeScale = {
  hero: {
    fontSize: 88,
    lineHeight: 88,
    fontWeight: '700' as const,
    letterSpacing: -2,
    fontVariant: ['tabular-nums' as const],
  },
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' as const },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' as const },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' as const },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '600' as const, letterSpacing: 0.5 },
} as const;

export type TextVariant = keyof typeof typeScale;

export const spacing = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  56: 56,
} as const;

export const radii = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const shadow = {
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 6 },
} as const;

export const springs = {
  snappy: { damping: 24, stiffness: 320, mass: 1 },
  smooth: { damping: 20, stiffness: 180, mass: 1 },
  gentle: { damping: 22, stiffness: 110, mass: 1 },
} as const;

export const timings = {
  fade: { duration: 180, easing: 'bezier(0.2,0,0,1)' },
  emphasized: { duration: 320, easing: 'bezier(0.3,0,0,1)' },
} as const;

export const hapticEvents = {
  mark: 'impactLight',
  undo: 'impactLight',
  endOfDaySweep: 'notificationSuccess',
  backAbove: 'notificationSuccess',
  destructiveConfirm: 'notificationWarning',
  pickerChange: 'selection',
  countUpLanded: 'notificationSuccess',
} as const;

export type HapticEvent = keyof typeof hapticEvents;

export const breakpoints = { phone: 600, sidebar: 1024 } as const;
