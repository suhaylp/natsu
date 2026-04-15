import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { GlassCard } from '../components/GlassCard';
import { useTripsData } from '../data/TripsDataContext';
import { type Trip } from '../data/trips';
import { theme } from '../theme/theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'HotelDetail'>;

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

function getBooking(trips: Trip[], tripId: string, bookingId: string) {
  const trip = trips.find((item) => item.id === tripId);
  return trip?.bookings.find((item) => item.id === bookingId && item.type === 'hotel');
}

export function HotelDetailScreen({ navigation, route }: Props) {
  const { trips } = useTripsData();
  const booking = getBooking(trips, route.params.tripId, route.params.bookingId);
  const hotel = booking?.hotelStay;

  const whenLabel = booking?.activityDate
    ? [booking.activityDate, booking.activityTime].filter(Boolean).join(' · ')
    : 'TBD';
  const checkoutLabel = hotel?.checkOutDate
    ? [hotel.checkOutDate, hotel.checkOutTime].filter(Boolean).join(' · ')
    : 'TBD';
  const locationLabel = [booking?.activityLocation, hotel?.address, hotel?.city]
    .filter(Boolean)
    .find((value, index, values) => values.indexOf(value) === index);

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
            Hotel Details
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.xxl,
            paddingBottom: theme.spacing.xxl,
          }}
        >
          {!booking ? (
            <GlassCard>
              <Text style={{ ...theme.typography.body, color: theme.colors.textSecondary }}>
                We couldn&apos;t find that hotel booking.
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
                {hotel?.name ?? booking.label}
              </Text>

              <Text
                style={{
                  ...theme.typography.caption,
                  color: theme.colors.textMuted,
                  textAlign: 'center',
                  marginBottom: theme.spacing.lg,
                }}
              >
                {booking.status === 'booked' ? 'Confirmed stay' : 'Planned stay'}
              </Text>

              <InfoRow label="Check-in" value={whenLabel} />
              <InfoRow label="Check-out" value={checkoutLabel} />
              {locationLabel ? <InfoRow label="Location" value={locationLabel} /> : null}
              {hotel?.roomType ? <InfoRow label="Room" value={hotel.roomType} /> : null}
              {hotel?.nights ? <InfoRow label="Nights" value={hotel.nights} /> : null}
              {hotel?.provider ? <InfoRow label="Booked Via" value={hotel.provider} /> : null}
              {booking.bookingRef || hotel?.confirmationNumber ? (
                <InfoRow
                  label="Confirmation"
                  value={booking.bookingRef ?? hotel?.confirmationNumber ?? 'TBD'}
                  isLast={!booking.notes}
                />
              ) : (
                <InfoRow label="Confirmation" value="TBD" isLast={!booking.notes} />
              )}

              {booking.notes ? (
                <View
                  style={{
                    marginTop: theme.spacing.lg,
                    paddingTop: theme.spacing.lg,
                    borderTopWidth: 0.5,
                    borderColor: theme.colors.cardBorder,
                  }}
                >
                  <Text
                    style={{
                      ...theme.typography.caption,
                      color: theme.colors.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: theme.spacing.xs,
                    }}
                  >
                    Notes
                  </Text>
                  <Text style={{ ...theme.typography.body, color: theme.colors.textSecondary }}>{booking.notes}</Text>
                </View>
              ) : null}
            </GlassCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
