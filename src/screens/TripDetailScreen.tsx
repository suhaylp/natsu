// ── screens/TripDetailScreen.tsx ──
import { useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { GlassCard } from '../components/GlassCard';
import { ConnectedLegs } from '../components/ConnectedLegs';
import { tripPhotos } from '../data/tripPhotos';
import { trips } from '../data/trips';
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

const weekdayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
const timelineLineLeft = theme.spacing.xl;
const timelineDotSize = theme.spacing.md - 2;
const timelineDotRadius = timelineDotSize / 2;
const timelineDotLeft = -32;
const timelineDotTop = theme.spacing.xl;

function getDayDateLabel(dateToken?: string): string {
  if (!dateToken) {
    return 'TBD';
  }

  try {
    const [monthToken, dayToken] = dateToken.trim().split(' ');
    const month = monthMap[monthToken];
    const day = Number(dayToken);

    if (month === undefined || Number.isNaN(day)) {
      return dateToken.toUpperCase();
    }

    const date = new Date(2026, month, day);
    const weekday = weekdayNames[date.getDay()];

    return `${weekday}, ${monthToken.toUpperCase()} ${day}`;
  } catch {
    return dateToken.toUpperCase();
  }
}

export function TripDetailScreen({ navigation, route }: Props) {
  const trip = trips.find((item) => item.id === route.params.tripId);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const { width } = useWindowDimensions();
  const carouselWidth = width - theme.spacing.xl * 2;

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

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 32,
                fontWeight: '500',
                color: theme.colors.textPrimary,
                lineHeight: 36,
                marginRight: theme.spacing.sm,
              }}
            >
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
          {tripPhotos[trip.id]?.length ? (
            <View style={{ marginBottom: theme.spacing.lg }}>
              <View
                style={{
                  borderRadius: theme.radii.card,
                  overflow: 'hidden',
                  shadowColor: '#1A3A2A',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.1,
                  shadowRadius: 20,
                  elevation: 4,
                }}
              >
                <ScrollView
                  horizontal={true}
                  pagingEnabled={true}
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / carouselWidth);
                    setActivePhotoIndex(nextIndex);
                  }}
                >
                  {tripPhotos[trip.id].map((photo, index) => (
                    <Image
                      key={`${trip.id}-photo-${index}`}
                      source={photo}
                      resizeMode="cover"
                      style={{ width: carouselWidth, height: 220 }}
                    />
                  ))}
                </ScrollView>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: theme.spacing.sm,
                }}
              >
                {tripPhotos[trip.id].map((_, index) => {
                  const isActive = index === activePhotoIndex;
                  return (
                    <View
                      key={`${trip.id}-dot-${index}`}
                      style={{
                        width: isActive ? 16 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: isActive ? theme.colors.accent : theme.colors.textMuted,
                        opacity: isActive ? 1 : 0.35,
                        marginHorizontal: 3,
                      }}
                    />
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={{ paddingLeft: 48, position: 'relative' }}>
            <View
              style={{
                position: 'absolute',
                left: timelineLineLeft,
                top: 0,
                bottom: 0,
                width: 2,
                backgroundColor: theme.colors.accent,
                opacity: 0.25,
                borderRadius: 1,
              }}
            />

            {trip.bookings.map((booking) => {
              const firstLeg = booking.legs[0];
              const bookingMeta = [booking.airline, booking.bookingRef].filter(Boolean).join(' · ');

              if (booking.status === 'not_booked') {
                return (
                  <View key={booking.id} style={{ position: 'relative', marginBottom: theme.spacing.lg }}>
                    <View
                      style={{
                        position: 'absolute',
                        left: timelineDotLeft,
                        top: timelineDotTop,
                        width: timelineDotSize,
                        height: timelineDotSize,
                        borderRadius: timelineDotRadius,
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
                      left: timelineDotLeft,
                      top: timelineDotTop,
                      width: timelineDotSize,
                      height: timelineDotSize,
                      borderRadius: timelineDotRadius,
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
                          {getDayDateLabel(firstLeg?.departureDate)}
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
                        {bookingMeta ? `✈️ ${bookingMeta}` : '✈️ Flight'}
                      </Text>

                      {booking.legs.length === 1 && firstLeg ? (
                        <View>
                          <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary }}>
                            {`${firstLeg.fromCity} → ${firstLeg.toCity}`}
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              color: theme.colors.textMuted,
                              marginTop: theme.spacing.xs - 2,
                            }}
                          >
                            {firstLeg.flightNumber}
                          </Text>
                        </View>
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
