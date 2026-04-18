import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { GlassCard } from '../components/GlassCard';
import { useTripsData } from '../data/TripsDataContext';
import { normalizeLocationText } from '../lib/locationText';
import { theme } from '../theme/theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'EventDetail'>;

type InfoRowProps = {
  label: string;
  value: string;
  isLast?: boolean;
};

const eventTypeMeta = {
  event: { icon: '📍', label: 'Event' },
  concert: { icon: '🎤', label: 'Concert' },
  festival: { icon: '🎪', label: 'Festival' },
} as const;

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

function extractImageUrlFromText(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.match(/https?:\/\/\S+\.(?:png|jpe?g|webp|gif)/i);
  return match?.[0];
}

export function EventDetailScreen({ navigation, route }: Props) {
  const { trips } = useTripsData();
  const trip = route.params.tripId ? trips.find((item) => item.id === route.params.tripId) : undefined;
  const booking = route.params.bookingId ? trip?.bookings.find((item) => item.id === route.params.bookingId) : undefined;

  const isBookingEvent = booking?.type === 'event' || booking?.type === 'concert' || booking?.type === 'festival';

  const headerTitle = isBookingEvent
    ? `${eventTypeMeta[booking.type].icon} ${eventTypeMeta[booking.type].label}`
    : route.params.category ?? 'Event';
  const title = isBookingEvent ? booking.label : route.params.title ?? 'Event details';
  const status = isBookingEvent
    ? booking.status === 'booked'
      ? 'Booked'
      : 'Not booked yet'
    : route.params.confirmed
      ? 'Booked'
      : 'Planned';
  const dateTimeLabel = isBookingEvent
    ? [booking.activityDate, booking.activityTime].filter(Boolean).join(' · ') || 'TBD'
    : route.params.dateLabel ?? 'TBD';
  const location = isBookingEvent
    ? normalizeLocationText(booking.activityLocation) ?? 'Location TBD'
    : normalizeLocationText(route.params.location) ?? 'Location TBD';
  const notes = isBookingEvent ? booking.notes : route.params.notes;
  const eventImageUrl = isBookingEvent ? booking.imageUrl ?? extractImageUrlFromText(booking.notes) : undefined;

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
            {headerTitle}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.xxl,
            paddingBottom: theme.spacing.xxl,
          }}
        >
          <GlassCard>
            <Text
              style={{
                ...theme.typography.h2,
                color: theme.colors.textPrimary,
                textAlign: 'center',
                marginBottom: theme.spacing.sm,
              }}
            >
              {title}
            </Text>

            <Text
              style={{
                ...theme.typography.caption,
                color: theme.colors.textMuted,
                textAlign: 'center',
                marginBottom: theme.spacing.lg,
              }}
            >
              {trip?.title ?? 'Upcoming event'}
            </Text>

            {eventImageUrl ? (
              <Image
                source={{ uri: eventImageUrl }}
                resizeMode="cover"
                style={{
                  width: '100%',
                  height: 180,
                  borderRadius: 12,
                  marginBottom: theme.spacing.lg,
                }}
              />
            ) : null}

            <InfoRow label="Status" value={status} />
            <InfoRow label="When" value={dateTimeLabel} />
            <InfoRow label="Where" value={location} isLast={!notes} />

            {notes ? (
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
                <Text style={{ ...theme.typography.body, color: theme.colors.textSecondary }}>{notes}</Text>
              </View>
            ) : null}
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
