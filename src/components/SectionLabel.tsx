// ── components/SectionLabel.tsx ──
import { ReactNode } from 'react';
import { Text } from 'react-native';
import { theme } from '../theme/theme';

type SectionLabelProps = {
  children: ReactNode;
};

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <Text
      style={{
        ...theme.typography.caption,
        color: theme.colors.textMuted,
        marginBottom: theme.spacing.sm,
      }}
    >
      {children}
    </Text>
  );
}
