// ── screens/HomeScreen.tsx ──
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { GlassCard } from '../components/GlassCard';
import { theme } from '../theme/theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  return (
    <LinearGradient
      colors={[theme.colors.backgroundGradientStart, theme.colors.backgroundGradientEnd]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: theme.spacing.xl,
          }}
        >
          <Text style={{ ...theme.typography.h1, color: theme.colors.textPrimary }}>Our App ❤️</Text>
          <Text
            style={{
              ...theme.typography.body,
              color: theme.colors.textSecondary,
              marginTop: theme.spacing.sm,
            }}
          >
            Just the two of us
          </Text>

          <View style={{ height: theme.spacing.xxxxl }} />

          <GlassCard>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.navigate('Trips')}
              style={{
                backgroundColor: theme.colors.accent,
                borderRadius: theme.radii.button,
                paddingHorizontal: theme.spacing.xxxl,
                paddingVertical: theme.spacing.lg,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>View Trips →</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
