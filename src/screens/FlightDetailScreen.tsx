// ── screens/FlightDetailScreen.tsx ──
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { GlassCard } from '../components/GlassCard';
import { trips } from '../data/trips';
import { theme } from '../theme/theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'FlightDetail'>;

export function FlightDetailScreen({ navigation, route }: Props) {
  const trip = trips.find((item) => item.id === route.params.tripId);
  const flight = trip?.flights.find((item) => item.id === route.params.flightId);

  const rows = flight
    ? [
        { label: 'Date', value: flight.date },
        { label: 'Time', value: flight.time },
        { label: 'Airline', value: flight.airline },
        { label: 'Booking Reference', value: flight.bookingRef },
        { label: 'Terminal', value: flight.terminal },
        { label: 'Duration', value: flight.duration },
      ]
    : [];

  return (
    <LinearGradient
      colors={[theme.colors.backgroundGradientStart, theme.colors.backgroundGradientEnd]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar style="dark" />

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
            Flight Details
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.xxl,
            paddingBottom: theme.spacing.xxl,
          }}
        >
          {!flight ? (
            <GlassCard>
              <Text style={{ ...theme.typography.body, color: theme.colors.textSecondary }}>
                We couldn&apos;t find that flight.
              </Text>
            </GlassCard>
          ) : (
            <GlassCard>
              <Text
                style={{
                  ...theme.typography.h2,
                  color: theme.colors.textPrimary,
                  textAlign: 'center',
                  marginBottom: theme.spacing.lg,
                }}
              >
                {flight.route}
              </Text>

              <View
                style={{
                  height: 1,
                  backgroundColor: theme.colors.cardBorder,
                  marginBottom: theme.spacing.sm,
                }}
              />

              {rows.map((row, index) => (
                <View
                  key={row.label}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: theme.spacing.md,
                    borderBottomWidth: index === rows.length - 1 ? 0 : 0.5,
                    borderColor: theme.colors.cardBorder,
                  }}
                >
                  <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
                    {row.label}
                  </Text>
                  <Text
                    style={{
                      ...theme.typography.body,
                      color: theme.colors.textPrimary,
                      marginLeft: theme.spacing.lg,
                      flex: 1,
                      textAlign: 'right',
                    }}
                  >
                    {row.value}
                  </Text>
                </View>
              ))}
            </GlassCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
