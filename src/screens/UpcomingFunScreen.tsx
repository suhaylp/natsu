import { useMemo, useState } from 'react';
import { Image, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { GlassCard } from '../components/GlassCard';
import { useTripsData } from '../data/TripsDataContext';
import { getTripPhotos } from '../data/tripPhotoResolver';
import { type Booking } from '../data/trips';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../theme/theme';

type Props = StackScreenProps<RootStackParamList, 'UpcomingFun'>;

type EventCategory = 'Music' | 'Events' | 'Other';

type EventItem = {
  id: string;
  title: string;
  date: Date;
  dateLabel: string;
  location: string;
  category: EventCategory;
  confirmed: boolean;
  image: number;
  tripId?: string;
  bookingId?: string;
  notes?: string;
};

const MANUAL_EVENTS: EventItem[] = [
  {
    id: 'manual-1',
    title: 'Night Garden - Harrison Tulip Festival',
    date: new Date('2026-04-18'),
    dateLabel: 'Sat Apr 18 · 4:00 - 10:00pm',
    location: '5039 Lougheed Hwy, Harrison',
    category: 'Events',
    confirmed: true,
    image: require('../../assets/photos/harrison.jpg'),
    notes: 'Bring jackets for the evening temperature drop.',
  },
  {
    id: 'manual-3',
    title: 'FVDED in the Park',
    date: new Date('2026-07-01'),
    dateLabel: 'Jul 2026',
    location: 'Surrey',
    category: 'Music',
    confirmed: false,
    image: require('../../assets/photos/fvded.jpg'),
  },
  {
    id: 'manual-4',
    title: 'Tame Impala',
    date: new Date('2026-08-01'),
    dateLabel: 'Aug 2026',
    location: 'Vancouver',
    category: 'Music',
    confirmed: false,
    image: require('../../assets/photos/tameimpala.jpg'),
  },
];

const FILTERS = ['All', 'Music', 'Events', 'Other'] as const;
type FilterOption = (typeof FILTERS)[number];

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

function getDaysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(date);
  eventDate.setHours(0, 0, 0, 0);
  return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function matchesFilter(event: EventItem, filter: FilterOption): boolean {
  if (filter === 'All') {
    return true;
  }

  if (filter === 'Events') {
    return event.category === 'Events';
  }

  if (filter === 'Music') {
    return event.category === 'Music';
  }

  if (filter === 'Other') {
    return event.category !== 'Music' && event.category !== 'Events';
  }

  return false;
}

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

function isBookingEventType(booking: Booking): booking is Booking & { type: 'event' | 'concert' | 'festival' } {
  return booking.type === 'event' || booking.type === 'concert' || booking.type === 'festival';
}

function getEventCategoryFromBookingType(type: Booking['type']): EventCategory {
  if (type === 'concert' || type === 'festival') {
    return 'Music';
  }
  if (type === 'event') {
    return 'Events';
  }
  return 'Other';
}

function getEventImageForBooking(booking: Booking, trip: { id: string; title: string }): number {
  if (booking.type === 'concert') {
    return require('../../assets/photos/tameimpala.jpg');
  }

  if (booking.type === 'festival') {
    return require('../../assets/photos/fvded.jpg');
  }

  if (booking.type === 'event') {
    return require('../../assets/photos/harrison.jpg');
  }

  return getTripPhotos(trip)[0] ?? require('../../assets/photos/newyears1.jpg');
}

function PhotoAttachment({ source, height }: { source: number; height: number }) {
  return (
    <View
      style={{
        marginBottom: 0,
        borderTopLeftRadius: theme.radii.card,
        borderTopRightRadius: theme.radii.card,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
        borderBottomWidth: 0,
      }}
    >
      <Image source={source} resizeMode="cover" style={{ width: '100%', height }} />
    </View>
  );
}

export function UpcomingFunScreen({ navigation }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All');
  const { trips } = useTripsData();

  const tripEvents = useMemo(() => {
    return trips.flatMap((trip) => {
      const tripYear = getTripYear(trip.dateRange);

      return trip.bookings
        .filter((booking) => isBookingEventType(booking))
        .map((booking) => {
          const dateToken = booking.activityDate ?? booking.legs[0]?.departureDate;
          if (!dateToken) {
            return null;
          }

          const parsedDate = parseTripDate(dateToken, tripYear);
          if (!parsedDate) {
            return null;
          }

          return {
            id: `trip-${trip.id}-${booking.id}`,
            title: booking.label,
            date: parsedDate,
            dateLabel: [booking.activityDate ?? dateToken, booking.activityTime].filter(Boolean).join(' · '),
            location: booking.activityLocation ?? trip.title,
            category: getEventCategoryFromBookingType(booking.type),
            confirmed: booking.status === 'booked',
            image: getEventImageForBooking(booking, trip),
            tripId: trip.id,
            bookingId: booking.id,
            notes: booking.notes,
          } as EventItem;
        })
        .filter((event): event is EventItem => Boolean(event));
    });
  }, [trips]);

  const allEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [...MANUAL_EVENTS, ...tripEvents]
      .filter((event) => event.date.getTime() >= today.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [tripEvents]);

  const filteredEvents = useMemo(() => {
    return allEvents
      .map((event) => ({
        ...event,
        daysUntil: getDaysUntil(event.date),
      }))
      .filter((event) => matchesFilter(event, activeFilter));
  }, [activeFilter, allEvents]);

  const heroEvent = filteredEvents[0];
  const laterEvents = filteredEvents.slice(1);

  const openEventDetail = (event: EventItem) => {
    if (event.tripId && event.bookingId) {
      navigation.navigate('EventDetail', {
        tripId: event.tripId,
        bookingId: event.bookingId,
      });
      return;
    }

    navigation.navigate('EventDetail', {
      title: event.title,
      dateLabel: event.dateLabel,
      location: event.location,
      category: event.category,
      notes: event.notes,
      confirmed: event.confirmed,
    });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />

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
            color: theme.colors.textPrimary,
            fontWeight: '500',
            lineHeight: 36,
            textAlign: 'left',
          }}
        >
          Upcoming fun!!
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: theme.spacing.md }}
        >
          {FILTERS.map((filter, index) => {
            const isActive = filter === activeFilter;

            return (
              <TouchableOpacity
                key={filter}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(filter)}
                style={{
                  borderRadius: theme.radii.pill,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  marginRight: index === FILTERS.length - 1 ? 0 : theme.spacing.sm,
                  backgroundColor: isActive ? theme.colors.accent : 'rgba(255,255,255,0.5)',
                  borderWidth: isActive ? 0 : 0.5,
                  borderColor: isActive ? 'transparent' : 'rgba(255,255,255,0.8)',
                }}
              >
                <Text style={{ fontSize: 12, color: isActive ? '#fff' : theme.colors.accent }}>{filter}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {heroEvent ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => openEventDetail(heroEvent)} style={{ marginBottom: theme.spacing.md }}>
            <PhotoAttachment source={heroEvent.image} height={160} />

            <GlassCard
              style={{
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderTopWidth: 0,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <View
                  style={{
                    backgroundColor: theme.colors.accentLight,
                    borderRadius: theme.radii.pill,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.xs,
                  }}
                >
                  <Text style={{ ...theme.typography.caption, color: theme.colors.accent }}>{`IN ${heroEvent.daysUntil} DAYS`}</Text>
                </View>

                <View
                  style={{
                    backgroundColor: theme.colors.stub,
                    borderRadius: theme.radii.pill,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.xs,
                  }}
                >
                  <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>{heroEvent.category}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: theme.spacing.lg }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 4 }}>
                    {heroEvent.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginBottom: 2 }}>{heroEvent.dateLabel}</Text>
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>{heroEvent.location}</Text>
                </View>

                <Text style={{ color: theme.colors.accent, fontSize: 24 }}>→</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>
        ) : (
          <GlassCard>
            <Text style={{ ...theme.typography.body, color: theme.colors.textSecondary }}>No events for this filter yet.</Text>
          </GlassCard>
        )}

        {laterEvents.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>LATER THIS YEAR</Text>

            {laterEvents.map((event) => (
              <TouchableOpacity key={event.id} activeOpacity={0.85} onPress={() => openEventDetail(event)} style={{ marginBottom: theme.spacing.sm }}>
                <PhotoAttachment source={event.image} height={136} />

                <GlassCard
                  style={{
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    borderTopWidth: 0,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: -6 }}>
                    <View style={{ flex: 1, paddingRight: theme.spacing.lg }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <View
                          style={{
                            backgroundColor: theme.colors.stub,
                            borderRadius: theme.radii.pill,
                            paddingHorizontal: 10,
                            paddingVertical: 3,
                          }}
                        >
                          <Text style={{ fontSize: 10, color: theme.colors.accent, fontWeight: '600' }}>{event.category}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginLeft: 8 }}>{event.dateLabel}</Text>
                      </View>

                      <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 2 }}>
                        {event.title}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>{event.location}</Text>
                    </View>

                    <Text style={{ color: theme.colors.accent, fontSize: 24 }}>→</Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </>
        ) : null}

        <Text style={styles.footer}>Made by Suhayl (with love) ♥ 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  screen: { flex: 1, backgroundColor: '#d4e9dc' },
  scroll: { padding: 22, paddingTop: 0 },
  sectionLabel: {
    fontSize: 11,
    color: '#5a8a6a',
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  footer: { textAlign: 'center', fontSize: 11, color: '#7aaa8a', paddingVertical: 18 },
} as const;
