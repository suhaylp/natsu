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

const airportTimezones: Record<string, string> = {
  YVR: 'PDT',
  YHU: 'EDT',
  YOW: 'EDT',
  YYC: 'MDT',
  HND: 'JST',
  SIN: 'SGT',
  BKK: 'ICT',
  NRT: 'JST',
  CNX: 'ICT',
  HAN: 'ICT',
  SGN: 'ICT',
};

function formatDateTimeWithTimezone(date: string, time: string, airportCode: string): string {
  const timezone = airportTimezones[airportCode];
  return timezone ? `${date}, ${time} ${timezone}` : `${date}, ${time}`;
}

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

function getWhoIsFlyingData(
  booking: NonNullable<ReturnType<typeof getBooking>>
): { flyers: Array<{ id: PassengerId; seat?: string }>; noSeatsBooked: boolean } {
  const seatInfo = booking.legs.find((leg) => leg.seats !== undefined)?.seats;

  if (!seatInfo) {
    return { flyers: [], noSeatsBooked: false };
  }

  if (seatInfo === 'not_assigned') {
    return {
      flyers: (Object.keys(passengers) as PassengerId[]).map((id) => ({ id })),
      noSeatsBooked: true,
    };
  }

  return {
    flyers: (Object.keys(seatInfo) as PassengerId[])
      .filter((id) => Boolean(seatInfo[id]))
      .map((id) => ({ id, seat: seatInfo[id] })),
    noSeatsBooked: false,
  };
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
  const whoIsFlying = booking ? getWhoIsFlyingData(booking) : { flyers: [], noSeatsBooked: false };
  const baggageRows = booking?.baggage
    ? [
        { label: 'Carry-on', value: booking.baggage.carryOn },
        { label: 'Check-in', value: booking.baggage.checkIn },
      ]
    : [];
  const singleLegRows =
    booking && firstLeg
      ? [
          { label: 'Flight', value: firstLeg.flightNumber },
          { label: 'From', value: `${firstLeg.fromCity} (${firstLeg.fromCode})` },
          { label: 'To', value: `${firstLeg.toCity} (${firstLeg.toCode})` },
          {
            label: 'Departure',
            value: formatDateTimeWithTimezone(firstLeg.departureDate, firstLeg.departureTime, firstLeg.fromCode),
          },
          {
            label: 'Arrival',
            value: formatDateTimeWithTimezone(firstLeg.arrivalDate, firstLeg.arrivalTime, firstLeg.toCode),
          },
          ...(firstLeg.duration ? [{ label: 'Duration', value: firstLeg.duration }] : []),
          ...baggageRows,
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
                  {singleLegRows.map((row, index) => (
                    <InfoRow
                      key={`single-row-${row.label}`}
                      label={row.label}
                      value={row.value}
                      isLast={index === singleLegRows.length - 1}
                    />
                  ))}
                </>
              ) : (
                <View style={{ marginTop: theme.spacing.sm }}>
                  <ConnectedLegs legs={booking.legs} />
                </View>
              )}

              {booking.legs.length > 1 && baggageRows.length > 0 ? (
                <View
                  style={{
                    marginTop: theme.spacing.lg,
                    paddingTop: theme.spacing.lg,
                    borderTopWidth: 0.5,
                    borderColor: theme.colors.cardBorder,
                  }}
                >
                  {baggageRows.map((row, index) => (
                    <InfoRow
                      key={`baggage-row-${row.label}`}
                      label={row.label}
                      value={row.value}
                      isLast={index === baggageRows.length - 1}
                    />
                  ))}
                </View>
              ) : null}

              <View
                style={{
                  marginTop: theme.spacing.xl,
                  paddingTop: theme.spacing.lg,
                  borderTopWidth: 0.5,
                  borderColor: theme.colors.cardBorder,
                }}
              >
                <SectionLabel>Who&apos;s flying</SectionLabel>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', flex: 1 }}>
                    {whoIsFlying.flyers.map((flyer) => (
                      <View key={`flyer-${flyer.id}`} style={{ marginRight: 6, marginBottom: 6 }}>
                        <PassengerBubble name={passengers[flyer.id].short} seat={flyer.seat} />
                      </View>
                    ))}
                  </View>

                  {whoIsFlying.noSeatsBooked ? (
                    <Text
                      style={{
                        fontSize: 10,
                        color: theme.colors.textMuted,
                        marginLeft: theme.spacing.xs,
                        marginBottom: theme.spacing.xs - 2,
                      }}
                    >
                      No seats booked
                    </Text>
                  ) : null}
                </View>
              </View>
            </GlassCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
