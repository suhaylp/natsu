import { StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StackScreenProps } from '@react-navigation/stack';
import { GlassCard } from '../components/GlassCard';
import { theme } from '../theme/theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'ComingSoon'>;

export function ComingSoonScreen({ navigation, route }: Props) {
  return (
    <LinearGradient
      colors={[theme.colors.backgroundGradientStart, theme.colors.backgroundGradientEnd]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />

        <View
          style={{
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.md,
            justifyContent: 'center',
          }}
        >
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.goBack()}
            style={{
              position: 'absolute',
              left: theme.spacing.xl,
              top: theme.spacing.sm,
              paddingRight: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
              zIndex: 1,
            }}
          >
            <Text style={{ color: theme.colors.textPrimary, fontSize: 32, lineHeight: 32 }}>‹</Text>
          </TouchableOpacity>

          <Text style={{ ...theme.typography.h2, color: theme.colors.textPrimary, textAlign: 'center' }}>
            {route.params.title}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: theme.spacing.xl,
            paddingBottom: theme.spacing.xxxl,
          }}
        >
          <GlassCard>
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: theme.spacing.xxxl,
              }}
            >
              <Text style={{ ...theme.typography.h2, color: theme.colors.textPrimary }}>Coming soon...</Text>
            </View>
          </GlassCard>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
