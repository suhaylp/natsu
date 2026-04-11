// ── screens/TripDetailScreen.tsx ──
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { GlassCard } from '../components/GlassCard';
import { SectionLabel } from '../components/SectionLabel';
import { trips } from '../data/trips';
import { theme } from '../theme/theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'TripDetail'>;

export function TripDetailScreen({ navigation, route }: Props) {
  const trip = trips.find((item) => item.id === route.params.tripId);

  if (!trip) {
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
              Trip
            </Text>
          </View>

          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.xl }}>
            <Text style={{ ...theme.typography.body, color: theme.colors.textSecondary }}>
              We couldn&apos;t find that trip.
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

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

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ ...theme.typography.h2, color: theme.colors.textPrimary, marginRight: theme.spacing.sm }}>
              {trip.title}
            </Text>
            <Text style={{ fontSize: 24 }}>{trip.emoji}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.xl,
            paddingBottom: theme.spacing.xxl,
          }}
        >
          <SectionLabel>Flights</SectionLabel>

          {trip.flights.map((flight) => (
            <TouchableOpacity
              key={flight.id}
              activeOpacity={0.75}
              onPress={() =>
                navigation.navigate('FlightDetail', {
                  tripId: trip.id,
                  flightId: flight.id,
                })
              }
              style={{ marginBottom: theme.spacing.lg }}
            >
              <GlassCard>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: theme.spacing.lg }}>
                    <Text
                      style={{
                        ...theme.typography.h3,
                        color: theme.colors.textPrimary,
                        marginBottom: theme.spacing.sm,
                      }}
                    >
                      {flight.route}
                    </Text>

                    <Text
                      style={{
                        ...theme.typography.caption,
                        color: theme.colors.textSecondary,
                        marginBottom: theme.spacing.md,
                      }}
                    >
                      {`${flight.airline} • ${flight.date} • ${flight.time}`}
                    </Text>

                    <View
                      style={{
                        alignSelf: 'flex-start',
                        backgroundColor: theme.colors.accentLight,
                        borderRadius: theme.radii.pill,
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.xs,
                      }}
                    >
                      <Text style={{ ...theme.typography.caption, color: theme.colors.accent }}>
                        {flight.duration}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ color: theme.colors.accent, fontSize: 24 }}>→</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}

          <View style={{ marginTop: theme.spacing.sm }}>
            <SectionLabel>Things to Do</SectionLabel>
            <GlassCard style={{ backgroundColor: theme.colors.stub }}>
              <Text
                style={{
                  ...theme.typography.h3,
                  color: theme.colors.textPrimary,
                  marginBottom: theme.spacing.xs,
                }}
              >
                Coming soon ✨
              </Text>
              <Text style={{ ...theme.typography.body, color: theme.colors.textMuted }}>
                We&apos;ll plan activities here
              </Text>
            </GlassCard>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
