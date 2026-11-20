import { View } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';

/** Optically-centered empty state: 56 pt symbol, slightly above center. */
export function EmptyState({
  icon,
  message,
  ctaTitle,
  onCta,
}: {
  icon: IconName;
  message: string;
  ctaTitle?: string;
  onCta?: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        minHeight: 420,
        paddingHorizontal: 32,
        paddingBottom: 96,
      }}>
      <Icon name={icon} size={56} color={theme.accent} />
      <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
        {message}
      </Text>
      {ctaTitle && onCta ? <Button title={ctaTitle} onPress={onCta} /> : null}
    </View>
  );
}
