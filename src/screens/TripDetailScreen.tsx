// ── screens/TripDetailScreen.tsx ──
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { GlassCard } from '../components/GlassCard';
import { ConnectedLegs } from '../components/ConnectedLegs';
import { PassengerBubble } from '../components/PassengerBubble';
import { passengers, type PassengerId } from '../data/passengers';
import { trips, type Booking } from '../data/trips';
import { theme } from '../theme/theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'TripDetail'>;

const monthMap: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function parseDeparture(booking: Booking): number {
  try {
    const firstLeg = booking.legs[0];

    if (!firstLeg) {
      return Number.MAX_SAFE_INTEGER;
    }

    const [monthToken, dayToken] = firstLeg.departureDate.split(' ');
    const [hourToken, minuteToken] = firstLeg.departureTime.split(':');

    const month = monthMap[monthToken];
    const day = Number(dayToken);
    const hour = Number(hourToken);
    const minute = Number(minuteToken);

    if (
      Number.isNaN(month) ||
      Number.isNaN(day) ||
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      month === undefined
    ) {
      return Number.MAX_SAFE_INTEGER;
    }

    return new Date(2026, month, day, hour, minute, 0, 0).getTime();
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

function getBubbleData(booking: Booking): Array<{ id: PassengerId; seat?: string }> {
  const seatInfo = booking.legs[0]?.seats;

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

  const indexedBookings = trip.bookings.map((booking, index) => ({ booking, index }));

  const sortedBooked = indexedBookings
    .filter((item) => item.booking.status === 'booked')
    .sort((a, b) => {
      const diff = parseDeparture(a.booking) - parseDeparture(b.booking);
      return diff !== 0 ? diff : a.index - b.index;
    });

  const pending = indexedBookings.filter((item) => item.booking.status === 'not_booked');
  const orderedBookings = [...sortedBooked, ...pending].map((item) => item.booking);

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
          <View style={{ paddingLeft: 48, position: 'relative' }}>
            <View
              style={{
                position: 'absolute',
                left: 20,
                top: 0,
                bottom: 0,
                width: 2,
                backgroundColor: theme.colors.accent,
                opacity: 0.25,
                borderRadius: 1,
              }}
            />

            {orderedBookings.map((booking) => {
              const firstLeg = booking.legs[0];
              const bubbles = getBubbleData(booking);

              if (booking.status === 'not_booked') {
                return (
                  <View key={booking.id} style={{ position: 'relative', marginBottom: theme.spacing.lg }}>
                    <View
                      style={{
                        position: 'absolute',
                        left: -34,
                        top: 12,
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderColor: theme.colors.textMuted,
                        opacity: 0.5,
                      }}
                    />

                    <View
                      style={{
                        backgroundColor: theme.colors.stub,
                        borderRadius: theme.radii.card,
                        borderWidth: 1,
                        borderColor: 'rgba(138,173,160,0.3)',
                        borderStyle: 'dashed',
                        padding: 14,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.textMuted }}>
                        {`${booking.type === 'train' ? '🚆 ' : '✈️ '}${booking.label}`}
                      </Text>

                      <Text
                        style={{
                          fontSize: 11,
                          backgroundColor: 'rgba(176,120,0,0.12)',
                          color: '#7A5200',
                          paddingHorizontal: 10,
                          paddingVertical: 3,
                          borderRadius: 20,
                          alignSelf: 'flex-start',
                          marginTop: 6,
                        }}
                      >
                        Not booked yet
                      </Text>
                    </View>
                  </View>
                );
              }

              return (
                <View key={booking.id} style={{ position: 'relative', marginBottom: theme.spacing.lg }}>
                  <View
                    style={{
                      position: 'absolute',
                      left: -34,
                      top: 12,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: theme.colors.accent,
                      borderWidth: 2,
                      borderColor: theme.colors.backgroundGradientStart,
                      shadowColor: theme.colors.accent,
                      shadowOpacity: 0.4,
                      shadowRadius: 4,
                    }}
                  />

                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() =>
                      navigation.navigate(
                        'FlightDetail',
                        {
                          tripId: trip.id,
                          bookingId: booking.id,
                        } as never
                      )
                    }
                  >
                    <GlassCard>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: theme.colors.accent,
                            letterSpacing: 0.06,
                            textTransform: 'uppercase',
                          }}
                        >
                          {firstLeg?.departureDate ?? 'TBD'}
                        </Text>
                        <View
                          style={{
                            width: 3,
                            height: 3,
                            borderRadius: 1.5,
                            backgroundColor: theme.colors.textMuted,
                            marginHorizontal: 6,
                          }}
                        />
                        <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>
                          {firstLeg?.departureTime ?? ''}
                        </Text>
                      </View>

                      <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 8 }}>
                        {[booking.airline, booking.bookingRef].filter(Boolean).join(' · ')}
                      </Text>

                      {booking.legs.length === 1 && firstLeg ? (
                        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary }}>
                          {`${firstLeg.fromCity} → ${firstLeg.toCity}`}
                        </Text>
                      ) : null}

                      {booking.legs.length > 1 ? (
                        <View
                          style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTopWidth: 0.5,
                            borderColor: theme.colors.cardBorder,
                          }}
                        >
                          <ConnectedLegs legs={booking.legs} compact={true} />
                        </View>
                      ) : null}

                      {bubbles.length > 0 ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            marginTop: 10,
                          }}
                        >
                          {bubbles.map((bubble) => (
                            <View key={`${booking.id}-${bubble.id}`} style={{ marginRight: 6, marginBottom: 6 }}>
                              <PassengerBubble name={passengers[bubble.id].short} seat={bubble.seat} />
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </GlassCard>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
