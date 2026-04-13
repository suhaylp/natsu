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
            paddingHorizontal: theme.spacing.xxl,
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.lg,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.goBack()}
            style={{
              alignSelf: 'flex-start',
              paddingRight: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
            }}
          >
            <Text style={{ color: theme.colors.textPrimary, fontSize: 32, lineHeight: 32 }}>‹</Text>
          </TouchableOpacity>

          <Text
            style={{
              fontSize: 32,
              fontWeight: '500',
              color: theme.colors.textPrimary,
              lineHeight: 36,
              textAlign: 'left',
            }}
          >
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
              <Text style={{ ...theme.typography.h2, color: theme.colors.textPrimary }}>Work in progress</Text>
            </View>
          </GlassCard>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
