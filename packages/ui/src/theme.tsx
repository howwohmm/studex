import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { colors, type ThemeColors, type ColorScheme } from './tokens';

const ThemeContext = createContext<ThemeColors>(colors.light);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const resolved: ColorScheme = scheme === 'dark' ? 'dark' : 'light';
  return <ThemeContext.Provider value={colors[resolved]}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeColors {
  return useContext(ThemeContext);
}

export function useScheme(): ColorScheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}
