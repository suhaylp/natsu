import { StackScreenProps } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../components/GlassCard';
import {
  HOME_SCREEN_COPY,
  RECENT_MOMENTS,
  SECRET_GREETINGS,
  TODAY_MEMORY,
} from '../data/homeContent';
import { useTripsData } from '../data/TripsDataContext';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../theme/theme';

type Props = StackScreenProps<RootStackParamList, 'Home'>;

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

function parseNearestFutureDate(dateToken: string, now: Date): Date | null {
  try {
    const [monthToken, dayToken] = dateToken.trim().split(' ');
    const month = monthMap[monthToken];
    const day = Number(dayToken);

    if (month === undefined || Number.isNaN(day)) {
      return null;
    }

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const candidate = new Date(today.getFullYear(), month, day);
    candidate.setHours(0, 0, 0, 0);

    if (candidate < today) {
      candidate.setFullYear(candidate.getFullYear() + 1);
    }

    return candidate;
  } catch {
    return null;
  }
}

export function HomeScreen({ navigation }: Props) {
  const [currentMessage, setCurrentMessage] = useState<string>(HOME_SCREEN_COPY.initialGreeting);
  const { trips } = useTripsData();

  const messageOpacity = useRef(new Animated.Value(1)).current;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextTripDate = trips
    .flatMap((trip) =>
      trip.bookings
        .filter((booking) => booking.status === 'booked')
        .map((booking) => booking.legs[0]?.departureDate)
        .filter((departureDate): departureDate is string => Boolean(departureDate))
    )
    .map((departureDate) => parseNearestFutureDate(departureDate, today))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const daysUntilNextTrip =
    nextTripDate !== undefined ? Math.ceil((nextTripDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const shuffleMessage = () => {
    if (SECRET_GREETINGS.length === 0) {
      return;
    }

    let nextMessage = SECRET_GREETINGS[Math.floor(Math.random() * SECRET_GREETINGS.length)];
    if (SECRET_GREETINGS.length > 1) {
      while (nextMessage === currentMessage) {
        nextMessage = SECRET_GREETINGS[Math.floor(Math.random() * SECRET_GREETINGS.length)];
      }
    }

    Animated.timing(messageOpacity, {
      toValue: 0,
      duration: 150,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setCurrentMessage(nextMessage);
      Animated.timing(messageOpacity, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  };

  return (
    <LinearGradient
      colors={[theme.colors.backgroundGradientStart, theme.colors.backgroundGradientEnd]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <StatusBar hidden />

        <ScrollView
          scrollEnabled={false}
          bounces={false}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.xxl,
            paddingTop: theme.spacing.xxxl,
            paddingBottom: theme.spacing.xxxxl + theme.spacing.xxxl,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              alignItems: 'flex-start',
              width: '100%',
              marginTop: theme.spacing.xxxl + theme.spacing.sm,
              marginBottom: theme.spacing.sm,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={shuffleMessage}
              style={{ paddingVertical: theme.spacing.xs, marginBottom: 2 }}
            >
              <Animated.Text
                style={{
                  fontSize: 14,
                  color: '#5a8a6a',
                  fontWeight: '500',
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  opacity: messageOpacity,
                  textAlign: 'left',
                }}
              >
                {currentMessage}
              </Animated.Text>
            </TouchableOpacity>

            <Text
              style={{
                fontSize: 32,
                fontWeight: '500',
                color: '#1a4030',
                lineHeight: 36,
                marginBottom: theme.spacing.xs,
                textAlign: 'left',
              }}
            >
              {HOME_SCREEN_COPY.memoryHeading}
            </Text>
          </View>

          <View
            style={{
              marginTop: 0,
              borderRadius: 22,
              overflow: 'hidden',
            }}
          >
            <Image source={TODAY_MEMORY.image} style={{ width: '100%', height: 188 }} resizeMode="cover" />
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 35, 22, 0.4)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: theme.spacing.lg,
                right: theme.spacing.lg,
                bottom: theme.spacing.lg,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: 'rgba(255, 255, 255, 0.75)',
                  letterSpacing: 0.5,
                  marginBottom: 2,
                }}
              >
                {TODAY_MEMORY.caption}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: '#ffffff',
                }}
              >
                {TODAY_MEMORY.title}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: theme.spacing.lg }}>
            <Text
              style={{
                fontSize: 11,
                color: '#5a8a6a',
                fontWeight: '500',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              {HOME_SCREEN_COPY.recentMomentsHeading}
            </Text>

            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
              {RECENT_MOMENTS.map((moment, index) => (
                <View key={`recent-moment-${index}`}>
                  <Image
                    source={moment.image}
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: 14,
                      marginBottom: 6,
                      marginRight: 8,
                    }}
                    resizeMode="cover"
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '500',
                      color: '#1a4030',
                    }}
                    numberOfLines={1}
                  >
                    {moment.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: '#7aaa8a',
                    }}
                  >
                    {moment.date}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Trips')}
            style={{ marginTop: theme.spacing.lg }}
          >
            <GlassCard>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginVertical: -2,
                }}
              >
                <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary }}>
                    ✈️ Travelling the world
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: theme.colors.textSecondary,
                      marginTop: theme.spacing.xs,
                    }}
                    numberOfLines={1}
                  >
                    {daysUntilNextTrip !== null
                      ? `${daysUntilNextTrip} ${daysUntilNextTrip === 1 ? 'day' : 'days'} until our next trip`
                      : 'Our next trip is coming soon'}
                  </Text>
                </View>

                <View
                  style={{
                    width: theme.spacing.xxxl,
                    height: theme.spacing.xxxl,
                    borderRadius: theme.spacing.lg,
                    backgroundColor: theme.colors.accentLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: theme.spacing.lg,
                      color: theme.colors.accent,
                      fontWeight: '600',
                    }}
                  >
                    →
                  </Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('UpcomingFun')}
            style={{ marginTop: theme.spacing.lg }}
          >
            <GlassCard>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginVertical: -6,
                }}
              >
                <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary }}>
                    🎤 Upcoming events
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: theme.colors.textSecondary,
                      marginTop: theme.spacing.xs,
                    }}
                  >
                    So many plans...
                  </Text>
                </View>

                <View
                  style={{
                    width: theme.spacing.xxxl,
                    height: theme.spacing.xxxl,
                    borderRadius: theme.spacing.lg,
                    backgroundColor: theme.colors.accentLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: theme.spacing.lg, color: theme.colors.accent, fontWeight: '600' }}>→</Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('MoneyStuff')}
            style={{ marginTop: theme.spacing.lg }}
          >
            <GlassCard>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginVertical: -6,
                }}
              >
                <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary }}>
                    💰 Money stuff
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: theme.colors.textSecondary,
                      marginTop: theme.spacing.xs,
                    }}
                  >
                    Saving for the future muahahah
                  </Text>
                </View>

                <View
                  style={{
                    width: theme.spacing.xxxl,
                    height: theme.spacing.xxxl,
                    borderRadius: theme.spacing.lg,
                    backgroundColor: theme.colors.accentLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: theme.spacing.lg, color: theme.colors.accent, fontWeight: '600' }}>→</Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>

          <View
            style={{
              alignSelf: 'center',
              marginTop: theme.spacing.xxxl,
              paddingHorizontal: theme.spacing.xs,
              paddingVertical: theme.spacing.xs,
            }}
          >
            <Text style={{ fontSize: theme.spacing.sm + 3, color: theme.colors.textMuted }}>
              Made by Suhayl (with love) ♥ 2026
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
