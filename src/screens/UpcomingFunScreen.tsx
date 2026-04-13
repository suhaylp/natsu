import { useMemo, useState } from 'react';
import { Image, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { GlassCard } from '../components/GlassCard';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../theme/theme';

type Props = StackScreenProps<RootStackParamList, 'UpcomingFun'>;

type EventItem = {
  id: number;
  title: string;
  date: Date;
  dateLabel: string;
  location: string;
  category: string;
  confirmed: boolean;
  image: number;
};

const EVENTS: EventItem[] = [
  {
    id: 1,
    title: 'Night Garden – Harrison Tulip Festival',
    date: new Date('2026-04-18'),
    dateLabel: 'Sat Apr 18 · 4:00 – 10:00pm',
    location: '5039 Lougheed Hwy, Harrison',
    category: 'Events',
    confirmed: true,
    image: require('../../assets/photos/harrison.jpg'),
  },
  {
    id: 2,
    title: 'Escapade Music Festival',
    date: new Date('2026-06-01'),
    dateLabel: 'Jun 2026',
    location: 'Ottawa',
    category: 'Music',
    confirmed: false,
    image: require('../../assets/photos/esapade.jpg'),
  },
  {
    id: 3,
    title: 'FVDED in the Park',
    date: new Date('2026-07-01'),
    dateLabel: 'Jul 2026',
    location: 'Surrey',
    category: 'Music',
    confirmed: false,
    image: require('../../assets/photos/fvded.jpg'),
  },
  {
    id: 4,
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

function getDaysUntil(date: Date): number {
  return Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
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

  const filteredEvents = useMemo(() => {
    const sorted = [...EVENTS].sort((a, b) => a.date.getTime() - b.date.getTime());
    const withDays = sorted.map((event) => ({
      ...event,
      daysUntil: getDaysUntil(event.date),
    }));
    return withDays.filter((event) => matchesFilter(event, activeFilter));
  }, [activeFilter]);

  const heroEvent = filteredEvents[0];
  const laterEvents = filteredEvents.slice(1);

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
          <View style={{ marginBottom: theme.spacing.md }}>
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
          </View>
        ) : (
          <GlassCard>
            <Text style={{ ...theme.typography.body, color: theme.colors.textSecondary }}>No events for this filter yet.</Text>
          </GlassCard>
        )}

        {laterEvents.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>LATER THIS YEAR</Text>

            {laterEvents.map((event) => (
              <View key={event.id} style={{ marginBottom: theme.spacing.sm }}>
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
              </View>
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
