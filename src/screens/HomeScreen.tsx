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
import { LinearGradient } from 'expo-linear-gradient';
import { StackScreenProps } from '@react-navigation/stack';
import { GlassCard } from '../components/GlassCard';
import {
  HOME_SCREEN_COPY,
  RECENT_MOMENTS,
  SECRET_GREETINGS,
  TODAY_MEMORY,
} from '../data/homeContent';
import { trips } from '../data/trips';
import { theme } from '../theme/theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const [currentMessage, setCurrentMessage] = useState<string>(HOME_SCREEN_COPY.initialGreeting);

  const messageOpacity = useRef(new Animated.Value(1)).current;

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
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.xxl,
            paddingBottom: theme.spacing.xxxxl,
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
            <Animated.Text
              style={{
                fontSize: 14,
                color: '#5a8a6a',
                fontWeight: '500',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                marginBottom: 2,
                opacity: messageOpacity,
                textAlign: 'left',
              }}
            >
              {currentMessage}
            </Animated.Text>

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
            style={{ marginTop: theme.spacing.xxl }}
          >
            <GlassCard>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                  <Text style={{ fontSize: theme.spacing.lg, fontWeight: '600', color: theme.colors.textPrimary }}>
                    Travelling the world
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.spacing.md,
                      color: theme.colors.textMuted,
                      marginTop: theme.spacing.xs,
                    }}
                    numberOfLines={1}
                  >
                    {`${trips.length} trips upcoming`}
                  </Text>
                </View>

                <View
                  style={{
                    width: theme.spacing.xxxl,
                    height: theme.spacing.xxxl,
                    borderRadius: theme.spacing.lg,
                    backgroundColor: theme.colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: theme.spacing.lg, color: theme.colors.cardBorder, fontWeight: '600' }}>→</Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ComingSoon', { title: 'Money stuff' })}
            style={{ marginTop: theme.spacing.lg }}
          >
            <GlassCard>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                  <Text style={{ fontSize: theme.spacing.lg, fontWeight: '600', color: theme.colors.textPrimary }}>
                    Money stuff
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.spacing.md,
                      color: theme.colors.textMuted,
                      marginTop: theme.spacing.xs,
                    }}
                  >
                    Coming soon...
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
            onPress={() => navigation.navigate('ComingSoon', { title: 'Upcoming FUN!!' })}
            style={{ marginTop: theme.spacing.lg }}
          >
            <GlassCard>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                  <Text style={{ fontSize: theme.spacing.lg, fontWeight: '600', color: theme.colors.textPrimary }}>
                    Upcoming FUN!!
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.spacing.md,
                      color: theme.colors.textMuted,
                      marginTop: theme.spacing.xs,
                    }}
                  >
                    Coming soon...
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
            activeOpacity={0.9}
            onPress={shuffleMessage}
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
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
