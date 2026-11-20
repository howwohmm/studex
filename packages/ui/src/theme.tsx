import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { colors, type ThemeColors, type ColorScheme } from './tokens';

const ThemeContext = createContext<ThemeColors>(colors.light);
const SchemeContext = createContext<ColorScheme>('light');

export function ThemeProvider({
  children,
  scheme,
}: {
  children: ReactNode;
  scheme?: ColorScheme;
}) {
  const system = useColorScheme();
  const resolved: ColorScheme = scheme ?? (system === 'dark' ? 'dark' : 'light');
  return (
    <SchemeContext.Provider value={resolved}>
      <ThemeContext.Provider value={colors[resolved]}>{children}</ThemeContext.Provider>
    </SchemeContext.Provider>
  );
}

export function useTheme(): ThemeColors {
  return useContext(ThemeContext);
}

export function useScheme(): ColorScheme {
  return useContext(SchemeContext);
}
