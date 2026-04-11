// ── screens/FlightDetailScreen.tsx ──
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { GlassCard } from '../components/GlassCard';
import { ConnectedLegs } from '../components/ConnectedLegs';
import { PassengerBubble } from '../components/PassengerBubble';
import { SectionLabel } from '../components/SectionLabel';
import { passengers, type PassengerId } from '../data/passengers';
import { trips } from '../data/trips';
import { theme } from '../theme/theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'FlightDetail'>;

type InfoRowProps = {
  label: string;
  value: string;
  isLast?: boolean;
};

function InfoRow({ label, value, isLast = false }: InfoRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: isLast ? 0 : 0.5,
        borderColor: theme.colors.cardBorder,
      }}
    >
      <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>{label}</Text>
      <Text
        style={{
          ...theme.typography.body,
          color: theme.colors.textPrimary,
          marginLeft: theme.spacing.lg,
          textAlign: 'right',
          flex: 1,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function getWhoIsFlying(booking: NonNullable<ReturnType<typeof getBooking>>): Array<{ id: PassengerId; seat?: string }> {
  const seatInfo = booking.legs.find((leg) => leg.seats !== undefined)?.seats;

  if (!seatInfo) {
    return [];
  }

  if (seatInfo === 'not_assigned') {
    return (Object.keys(passengers) as PassengerId[]).map((id) => ({ id }));
  }

  return (Object.keys(seatInfo) as PassengerId[])
    .filter((id) => Boolean(seatInfo[id]))
    .map((id) => ({ id, seat: seatInfo[id] }));
}

function getBooking(tripId: string, bookingId: string) {
  const trip = trips.find((item) => item.id === tripId);
  return trip?.bookings.find((item) => item.id === bookingId);
}

export function FlightDetailScreen({ navigation, route }: Props) {
  const bookingId =
    (route.params as RootStackParamList['FlightDetail'] & { bookingId?: string }).bookingId ??
    route.params.flightId;

  const booking = getBooking(route.params.tripId, bookingId);
  const firstLeg = booking?.legs[0];
  const lastLeg = booking?.legs[booking.legs.length - 1];
  const flyers = booking ? getWhoIsFlying(booking) : [];

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
          {!booking || !firstLeg || !lastLeg ? (
            <GlassCard>
              <Text style={{ ...theme.typography.body, color: theme.colors.textSecondary }}>
                We couldn&apos;t find that booking.
              </Text>
            </GlassCard>
          ) : (
            <GlassCard>
              <Text
                style={{
                  ...theme.typography.h2,
                  color: theme.colors.textPrimary,
                  textAlign: 'center',
                  marginBottom: theme.spacing.sm,
                }}
              >
                {`${firstLeg.fromCity} → ${lastLeg.toCity}`}
              </Text>

              <Text
                style={{
                  ...theme.typography.caption,
                  color: theme.colors.textMuted,
                  textAlign: 'center',
                  marginBottom: theme.spacing.lg,
                }}
              >
                {[booking.airline, booking.bookingRef].filter(Boolean).join(' · ')}
              </Text>

              {booking.legs.length === 1 ? (
                <>
                  <InfoRow label="Flight" value={firstLeg.flightNumber} />
                  <InfoRow label="Departure" value={`${firstLeg.departureDate}  ${firstLeg.departureTime}`} />
                  <InfoRow label="Arrival" value={`${firstLeg.arrivalDate}  ${firstLeg.arrivalTime}`} isLast={!firstLeg.duration && !booking.baggage} />
                  {firstLeg.duration ? (
                    <InfoRow label="Duration" value={firstLeg.duration} isLast={!booking.baggage} />
                  ) : null}
                  {booking.baggage ? <InfoRow label="Baggage" value={booking.baggage} isLast={true} /> : null}
                </>
              ) : (
                <View style={{ marginTop: theme.spacing.sm }}>
                  <ConnectedLegs legs={booking.legs} />
                </View>
              )}

              <View
                style={{
                  marginTop: theme.spacing.xl,
                  paddingTop: theme.spacing.lg,
                  borderTopWidth: 0.5,
                  borderColor: theme.colors.cardBorder,
                }}
              >
                <SectionLabel>Who&apos;s flying</SectionLabel>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {flyers.map((flyer) => (
                    <View key={`flyer-${flyer.id}`} style={{ marginRight: 6, marginBottom: 6 }}>
                      <PassengerBubble name={passengers[flyer.id].short} seat={flyer.seat} />
                    </View>
                  ))}
                </View>
              </View>
            </GlassCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
