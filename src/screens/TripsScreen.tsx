// ── screens/TripsScreen.tsx ──
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { GlassCard } from '../components/GlassCard';
import { trips } from '../data/trips';
import { theme } from '../theme/theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'Trips'>;

export function TripsScreen({ navigation }: Props) {
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
            Our Trips
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}>
          {trips.map((trip) => {
            const confirmedCount = trip.bookings.filter((booking) => booking.status === 'booked').length;
            const toBookCount = trip.bookings.filter((booking) => booking.status === 'not_booked').length;

            return (
              <TouchableOpacity
                key={trip.id}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}
                style={{ marginHorizontal: theme.spacing.xl, marginBottom: theme.spacing.lg }}
              >
                <GlassCard>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: theme.spacing.lg }}>
                      <Text style={{ fontSize: 36, marginBottom: theme.spacing.sm }}>{trip.emoji}</Text>
                      <Text
                        style={{
                          ...theme.typography.h2,
                          color: theme.colors.textPrimary,
                          marginBottom: theme.spacing.xs,
                        }}
                      >
                        {trip.title}
                      </Text>
                      <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
                        {trip.dateRange}
                      </Text>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginTop: theme.spacing.sm,
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: theme.colors.accentLight,
                            borderRadius: theme.radii.pill,
                            paddingHorizontal: theme.spacing.md,
                            paddingVertical: theme.spacing.xs,
                            marginRight: theme.spacing.sm,
                          }}
                        >
                          <Text style={{ ...theme.typography.caption, color: theme.colors.accent }}>
                            {`${confirmedCount} confirmed`}
                          </Text>
                        </View>

                        {toBookCount > 0 ? (
                          <View
                            style={{
                              backgroundColor: theme.colors.stub,
                              borderRadius: theme.radii.pill,
                              paddingHorizontal: theme.spacing.md,
                              paddingVertical: theme.spacing.xs,
                            }}
                          >
                            <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
                              {`${toBookCount} to book`}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    <Text style={{ color: theme.colors.accent, fontSize: 24 }}>→</Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
