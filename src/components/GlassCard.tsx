// ── components/GlassCard.tsx ──
import { ReactNode } from 'react';
import { Platform, StyleProp, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '../theme/theme';

type GlassCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function GlassCard({ children, style }: GlassCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radii.card,
          borderWidth: 1,
          borderColor: theme.colors.cardBorder,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 16,
          elevation: 6,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={18} tint="light" style={{ padding: theme.spacing.xl }}>
          {children}
        </BlurView>
      ) : (
        <View style={{ backgroundColor: 'rgba(255,255,255,0.35)', padding: theme.spacing.xl }}>
          {children}
        </View>
      )}
    </View>
  );
}
