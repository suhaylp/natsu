import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { theme } from '../theme/theme';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { StackScreenProps } from '@react-navigation/stack';
import { getTripPhotos } from '../data/tripPhotoResolver';
import { useTripsData } from '../data/TripsDataContext';
import type { Booking, Trip } from '../data/trips';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'Trips'>;

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

type TripWithStart = {
  trip: Trip;
  startDate: Date | null;
};

type CountSummary = {
  flights: number;
  hotels: number;
  activities: number;
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

function parseDateRangeStart(dateRange: string): Date | null {
  const sameMonth = dateRange.match(/^([A-Za-z]{3})\s+(\d{1,2})\s*[–-]\s*\d{1,2},\s*(\d{4})$/);
  if (sameMonth?.[1] && sameMonth[2] && sameMonth[3]) {
    return parseTripDate(`${sameMonth[1]} ${sameMonth[2]}`, Number(sameMonth[3]));
  }

  const crossMonth = dateRange.match(/^([A-Za-z]{3})\s+(\d{1,2})\s*[–-]\s*[A-Za-z]{3}\s+\d{1,2},\s*(\d{4})$/);
  if (crossMonth?.[1] && crossMonth[2] && crossMonth[3]) {
    return parseTripDate(`${crossMonth[1]} ${crossMonth[2]}`, Number(crossMonth[3]));
  }

  return null;
}

function getTripStartDate(trip: Trip): Date | null {
  const year = getTripYear(trip.dateRange);
  const parsedLegDates = trip.bookings
    .flatMap((booking) => booking.legs.map((leg) => parseTripDate(leg.departureDate, year)))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  if (parsedLegDates.length > 0) {
    return parsedLegDates[0];
  }

  return parseDateRangeStart(trip.dateRange);
}

function getDayDiff(fromDate: Date, toDate: Date): number {
  return Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
}

function summarizeCounts(bookings: Booking[]): CountSummary {
  const flights = bookings.filter((booking) => booking.type === 'flight').length;
  const hotels = bookings.filter((booking) => booking.type === 'hotel').length;
  const activities = bookings.filter((booking) => booking.type !== 'flight' && booking.type !== 'hotel').length;

  return {
    flights,
    hotels,
    activities,
  };
}

function GlassLayer({ children, style, tint = 'rgba(255,255,255,0.45)' }: { children?: ReactNode; style?: object; tint?: string }) {
  return (
    <View style={[style, { overflow: 'hidden' }]}>
      <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      {children}
    </View>
  );
}

function UpcomingTripCard(props: {
  trip: Trip;
  startDate: Date | null;
  daysAway: number | null;
  onPress: () => void;
}) {
  const photos = getTripPhotos(props.trip);
  const heroPhoto = photos[0];
  const [heroLoadFailed, setHeroLoadFailed] = useState(false);
  const counts = summarizeCounts(props.trip.bookings);

  useEffect(() => {
    setHeroLoadFailed(false);
  }, [heroPhoto]);

  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [styles.upcomingCardWrap, pressed ? styles.pressScale : null]}
    >
      <View style={styles.upcomingCard}>
        {heroPhoto && !heroLoadFailed ? (
          <Image
            source={heroPhoto}
            style={styles.upcomingHero}
            resizeMode="cover"
            onError={() => setHeroLoadFailed(true)}
          />
        ) : null}

        <GlassLayer style={styles.upcomingFooter} tint="rgba(255,255,255,0.50)">
          <View style={styles.upcomingTopRow}>
            <View style={styles.upcomingTitleWrap}>
              <Text style={styles.tripName}>{props.trip.title}</Text>
              <Text style={styles.tripDate}>{props.trip.dateRange}</Text>
            </View>

            <View style={styles.arrowButton}>
              <Text style={styles.arrowText}>›</Text>
            </View>
          </View>

          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
          >
            {props.daysAway !== null ? (
              <GlassLayer style={styles.daysPill} tint="rgba(15,45,30,0.1)">
                <Text style={styles.daysPillText}>{`${props.daysAway} ${props.daysAway === 1 ? 'day' : 'days'} away`}</Text>
              </GlassLayer>
            ) : null}

            <GlassLayer style={styles.flightPill} tint={theme.colors.flightLight}>
              <Text style={styles.flightPillText}>{`${counts.flights} flights`}</Text>
            </GlassLayer>

            <GlassLayer style={styles.hotelPill} tint={theme.colors.hotelLight}>
              <Text style={styles.hotelPillText}>{`${counts.hotels} hotels`}</Text>
            </GlassLayer>

            <GlassLayer style={styles.activityPill} tint={theme.colors.activitiesLight}>
              <Text style={styles.activityPillText}>{`${counts.activities} activities`}</Text>
            </GlassLayer>
          </ScrollView>
        </GlassLayer>
      </View>
    </Pressable>
  );
}

function PastTripCard({ trip }: { trip: Trip }) {
  const photos = getTripPhotos(trip);
  const photo = photos[0];
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);

  useEffect(() => {
    setPhotoLoadFailed(false);
  }, [photo]);

  return (
    <View style={styles.pastTripCard}>
      {photo && !photoLoadFailed ? (
        <Image
          source={photo}
          style={styles.pastTripImage}
          resizeMode="cover"
          onError={() => setPhotoLoadFailed(true)}
        />
      ) : null}
      <View style={styles.pastTripMeta}>
        <Text style={styles.pastTripName} numberOfLines={1}>
          {trip.title}
        </Text>
        <Text style={styles.pastTripDate} numberOfLines={1}>
          {trip.dateRange}
        </Text>
      </View>
    </View>
  );
}

export function TripsScreen({ navigation }: Props) {
  const { trips, isLoading, error, refresh, ensureTripLoaded } = useTripsData();

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const tripsWithDates = useMemo<TripWithStart[]>(
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

  const soonestUpcoming = useMemo(
    () => upcomingTrips.find((tripItem) => Boolean(tripItem.startDate))?.startDate ?? null,
    [upcomingTrips]
  );

  const daysUntilNextTrip = soonestUpcoming ? getDayDiff(today, soonestUpcoming) : null;
  const isInitialLoading = isLoading && trips.length === 0 && !error;
  const subtitleText = isInitialLoading
    ? 'Loading upcoming trips...'
    : daysUntilNextTrip !== null
      ? `${daysUntilNextTrip} ${daysUntilNextTrip === 1 ? 'day' : 'days'} until your next trip`
      : 'No upcoming trips planned';

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[theme.colors.backgroundGradientStart, theme.colors.backgroundGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top', 'bottom']}>
        <StatusBar style="dark" />

        <ScrollView
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refresh()} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.screenTitle}>{'Upcoming\nTravel'}</Text>
          <Text style={styles.screenSubtitle}>{subtitleText}</Text>

          <View style={styles.upcomingList}>
            {upcomingTrips.map(({ trip, startDate }) => {
              const daysAway = startDate ? Math.max(0, getDayDiff(today, startDate)) : null;
              return (
                <UpcomingTripCard
                  key={trip.id}
                  trip={trip}
                  startDate={startDate}
                  daysAway={daysAway}
                  onPress={() => {
                    void ensureTripLoaded(trip.id);
                    navigation.navigate('TripDetail', { tripId: trip.id });
                  }}
                />
              );
            })}
          </View>

          <Text style={styles.pastLabel}>PAST TRIPS</Text>

          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pastScroll}
          >
            {pastTrips.length > 0 ? (
              pastTrips.map(({ trip }) => (
                <PastTripCard key={`past-${trip.id}`} trip={trip} />
              ))
            ) : isInitialLoading ? null : (
              <GlassLayer style={styles.emptyPastCard} tint="rgba(255,255,255,0.35)">
                <Text style={styles.emptyPastText}>No past trips yet</Text>
              </GlassLayer>
            )}
          </ScrollView>

          {error ? <Text style={styles.errorText}>{`Sync issue: ${error}`}</Text> : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  screenSubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.textSecondary,
  },
  upcomingList: {
    marginTop: 20,
    gap: 14,
  },
  upcomingCardWrap: {
    borderRadius: 22,
  },
  pressScale: {
    transform: [{ scale: 0.97 }],
  },
  upcomingCard: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  upcomingHero: {
    width: '100%',
    height: 170,
  },
  upcomingFooter: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.7)',
  },
  upcomingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  upcomingTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  tripName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  tripDate: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '400',
    color: theme.colors.textSecondary,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  arrowText: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    lineHeight: 22,
    marginTop: -2,
  },
  pillRow: {
    gap: 8,
    paddingTop: 10,
  },
  daysPill: {
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(15,45,30,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  daysPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  flightPill: {
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(88,86,214,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  flightPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.flight,
  },
  hotelPill: {
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(0,122,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hotelPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.hotel,
  },
  activityPill: {
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255,149,0,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activityPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.activities,
  },
  pastLabel: {
    marginTop: 18,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: 0.72,
    textTransform: 'uppercase',
  },
  pastScroll: {
    gap: 10,
    paddingTop: 8,
  },
  pastTripCard: {
    width: 100,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  pastTripImage: {
    width: 100,
    height: 64,
  },
  pastTripMeta: {
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 8,
  },
  pastTripName: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  pastTripDate: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '400',
    color: theme.colors.textSecondary,
  },
  emptyPastCard: {
    width: 180,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 18,
    justifyContent: 'center',
  },
  emptyPastText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  errorText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '500',
    color: '#7A271A',
  },
});
