// ── screens/TripsScreen.tsx ──
import { useMemo, useState } from 'react';
import { Image, RefreshControl, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { GlassCard } from '../components/GlassCard';
import { tripPhotos } from '../data/tripPhotos';
import { useTripsData } from '../data/TripsDataContext';
import { type Trip } from '../data/trips';
import { theme } from '../theme/theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'Trips'>;
const tripCardPhotoHeight = 176;

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

function getTripYear(dateRange: string): number {
  const yearMatches = dateRange.match(/\b(20\d{2})\b/g);
  if (yearMatches && yearMatches.length > 0) {
    return Number(yearMatches[yearMatches.length - 1]);
  }

  return new Date().getFullYear();
}

function parseTripDate(dateToken: string, year: number): Date | null {
  const [monthToken, dayToken] = dateToken.trim().split(' ');
  const month = monthMap[monthToken];
  const day = Number(dayToken);

  if (month === undefined || Number.isNaN(day)) {
    return null;
  }

  const parsedDate = new Date(year, month, day);
  parsedDate.setHours(0, 0, 0, 0);
  return parsedDate;
}

function getTripStartDate(trip: Trip): Date | null {
  const year = getTripYear(trip.dateRange);
  const parsedLegDates = trip.bookings
    .flatMap((booking) => booking.legs.map((leg) => parseTripDate(leg.departureDate, year)))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  return parsedLegDates[0] ?? null;
}

function getDayDiff(fromDate: Date, toDate: Date): number {
  return Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
}

export function TripsScreen({ navigation }: Props) {
  const [showPastTrips, setShowPastTrips] = useState(false);
  const [photoIndexByTrip, setPhotoIndexByTrip] = useState<Record<string, number>>({});
  const { trips, isLoading, error, lastSyncedAt, refresh } = useTripsData();
  const { width } = useWindowDimensions();
  const cardSlideWidth = width - theme.spacing.xl * 2;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tripsWithDates = useMemo(
    () =>
      trips.map((trip) => ({
        trip,
        startDate: getTripStartDate(trip),
      })),
    [trips]
  );

  const upcomingTrips = useMemo(
    () =>
      tripsWithDates
        .filter(({ startDate }) => !startDate || startDate.getTime() >= today.getTime())
        .sort((a, b) => {
          if (!a.startDate && !b.startDate) {
            return 0;
          }
          if (!a.startDate) {
            return 1;
          }
          if (!b.startDate) {
            return -1;
          }
          return a.startDate.getTime() - b.startDate.getTime();
        }),
    [today, tripsWithDates]
  );

  const pastTrips = useMemo(
    () =>
      tripsWithDates
        .filter(({ startDate }) => Boolean(startDate && startDate.getTime() < today.getTime()))
        .sort((a, b) => {
          if (!a.startDate || !b.startDate) {
            return 0;
          }
          return b.startDate.getTime() - a.startDate.getTime();
        }),
    [today, tripsWithDates]
  );

  const nextTrip = upcomingTrips.find((item) => item.startDate);
  const nextTripCountdown = nextTrip?.startDate ? getDayDiff(today, nextTrip.startDate) : null;
  const lastSyncedLabel = useMemo(() => {
    if (!lastSyncedAt) {
      return null;
    }

    const parsedDate = new Date(lastSyncedAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return `Last synced ${parsedDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }, [lastSyncedAt]);

  const renderTripCard = (trip: Trip, key: string) => {
    const confirmedCount = trip.bookings.filter((booking) => booking.status === 'booked').length;
    const toBookCount = trip.bookings.filter((booking) => booking.status === 'not_booked').length;
    const photos = tripPhotos[trip.id] ?? [];
    const hasPhotos = photos.length > 0;
    const activePhotoIndex = photoIndexByTrip[trip.id] ?? 0;

    return (
      <View key={key} style={{ marginHorizontal: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        {hasPhotos ? (
          <View
            style={{
              marginBottom: 0,
              borderTopLeftRadius: theme.radii.card,
              borderTopRightRadius: theme.radii.card,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.colors.cardBorder,
              borderBottomWidth: 0,
            }}
          >
            <ScrollView
              horizontal={true}
              pagingEnabled={true}
              nestedScrollEnabled={true}
              directionalLockEnabled={true}
              alwaysBounceHorizontal={false}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / cardSlideWidth);
                setPhotoIndexByTrip((prev) => ({ ...prev, [trip.id]: nextIndex }));
              }}
            >
              {photos.map((photo, index) => (
                <Image
                  key={`${trip.id}-photo-${index}`}
                  source={photo}
                  resizeMode="cover"
                  style={{ width: cardSlideWidth, height: tripCardPhotoHeight }}
                />
              ))}
            </ScrollView>

            {photos.length > 1 ? (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: theme.spacing.xs + 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {photos.map((_, index) => {
                  const isActive = index === activePhotoIndex;
                  return (
                    <View
                      key={`${trip.id}-dot-${index}`}
                      style={{
                        width: isActive ? 14 : 5,
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                        marginHorizontal: 2,
                      }}
                    />
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity activeOpacity={0.75} onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}>
          <GlassCard
            style={
              hasPhotos
                ? {
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    borderTopWidth: 0,
                  }
                : undefined
            }
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginVertical: -6,
              }}
            >
              <View style={{ flex: 1, paddingRight: theme.spacing.lg }}>
                <Text
                  style={{
                    ...theme.typography.h2,
                    color: theme.colors.textPrimary,
                    marginBottom: theme.spacing.xs,
                  }}
                >
                  {trip.title}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: theme.colors.textSecondary,
                  }}
                >
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
                    <Text style={{ ...theme.typography.caption, color: theme.colors.accent }}>{`${confirmedCount} confirmed`}</Text>
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
      </View>
    );
  };

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
            Upcoming Travel
          </Text>

          <Text
            style={{
              fontSize: 13,
              color: theme.colors.textMuted,
              marginTop: theme.spacing.xs,
              textAlign: 'left',
            }}
          >
            {nextTripCountdown !== null
              ? `${nextTripCountdown} ${nextTripCountdown === 1 ? 'day' : 'days'} until our next trip`
              : 'No upcoming trips yet'}
          </Text>
        </View>

        <ScrollView
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refresh()} />}
          contentContainerStyle={{
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.xxl,
          }}
        >
          {upcomingTrips.map(({ trip }) => renderTripCard(trip, trip.id))}

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setShowPastTrips((prev) => !prev)}
            style={{
              marginTop: theme.spacing.xs,
              marginHorizontal: theme.spacing.xl,
              marginBottom: showPastTrips ? theme.spacing.sm : 0,
              alignSelf: 'flex-start',
              backgroundColor: theme.colors.card,
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              borderColor: theme.colors.cardBorder,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
            }}
          >
            <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
              {showPastTrips ? 'Past Trips ▴' : 'Past Trips ▾'}
            </Text>
          </TouchableOpacity>

          {showPastTrips ? (
            <View>
              {pastTrips.length === 0 ? (
                <View style={{ marginHorizontal: theme.spacing.xl }}>
                  <GlassCard>
                    <Text style={{ ...theme.typography.body, color: theme.colors.textSecondary }}>No past trips yet.</Text>
                  </GlassCard>
                </View>
              ) : (
                pastTrips.map(({ trip }) => renderTripCard(trip, `past-${trip.id}`))
              )}
            </View>
          ) : null}

          {isLoading ? (
            <Text
              style={{
                ...theme.typography.caption,
                color: theme.colors.textMuted,
                marginHorizontal: theme.spacing.xl,
                marginTop: theme.spacing.sm,
              }}
            >
              Syncing...
            </Text>
          ) : null}

          {!isLoading && lastSyncedLabel ? (
            <Text
              style={{
                ...theme.typography.caption,
                color: theme.colors.textMuted,
                marginHorizontal: theme.spacing.xl,
                marginTop: theme.spacing.sm,
              }}
            >
              {lastSyncedLabel}
            </Text>
          ) : null}

          {error ? (
            <Text
              style={{
                ...theme.typography.caption,
                color: '#A84B4B',
                marginHorizontal: theme.spacing.xl,
                marginTop: theme.spacing.xs,
              }}
            >
              {`Sync issue: ${error}`}
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
