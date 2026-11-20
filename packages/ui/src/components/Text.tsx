import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { typeScale, type TextVariant } from '../tokens';
import { useTheme } from '../theme';
import type { ThemeColors } from '../tokens';

type LabelRole = keyof ThemeColors['label'];

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: LabelRole | 'accent' | string;
  tabular?: boolean;
}

export function Text({ variant = 'body', color = 'primary', tabular, style, ...rest }: TextProps) {
  const theme = useTheme();
  const resolved =
    color === 'accent' ? theme.accent : color in theme.label ? theme.label[color as LabelRole] : color;
  const fontStyle = {
    ...typeScale[variant],
    color: resolved,
  } as TextStyle;
  if (tabular || variant === 'hero') fontStyle.fontVariant = ['tabular-nums'];
  const maxScale = variant === 'hero' ? 1.3 : variant === 'body' ? 2 : undefined;
  return (
    <RNText
      {...(maxScale !== undefined ? { maxFontSizeMultiplier: maxScale } : {})}
      style={[fontStyle, style]}
      {...rest}
    />
  );
}
