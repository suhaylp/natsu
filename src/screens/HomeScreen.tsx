import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StackScreenProps } from '@react-navigation/stack';
import { GlassCard } from '../components/GlassCard';
import { homeMessages, defaultMessage } from '../data/messages';
import { carouselPhotos } from '../data/photos';
import { trips } from '../data/trips';
import { theme } from '../theme/theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();

  const horizontalPadding = theme.spacing.xxl;
  const pageWidth = width - horizontalPadding * 2;
  const carouselHeight = theme.spacing.xxxxl * 4 + theme.spacing.sm;
  const activeDotWidth = theme.spacing.lg;
  const inactiveDotSize = theme.spacing.sm - 3;
  const dotRadius = theme.spacing.xs - 1;

  const [activeIndex, setActiveIndex] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(defaultMessage);

  const messageOpacity = useRef(new Animated.Value(1)).current;
  const dotWidthsRef = useRef<Animated.Value[]>([]);

  const slideCount = carouselPhotos.length > 0 ? carouselPhotos.length : 1;

  if (dotWidthsRef.current.length !== slideCount) {
    dotWidthsRef.current = Array.from({ length: slideCount }, (_, index) =>
      new Animated.Value(index === activeIndex ? activeDotWidth : inactiveDotSize)
    );
  }

  useEffect(() => {
    const animations = dotWidthsRef.current.map((value, index) =>
      Animated.spring(value, {
        toValue: index === activeIndex ? activeDotWidth : inactiveDotSize,
        friction: 7,
        tension: 40,
        useNativeDriver: false,
      })
    );

    Animated.parallel(animations).start();
  }, [activeDotWidth, activeIndex, inactiveDotSize]);

  const handleCarouselEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (carouselPhotos.length <= 1) {
      setActiveIndex(0);
      return;
    }

    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);

    if (nextIndex < 0) {
      setActiveIndex(0);
      return;
    }

    if (nextIndex > carouselPhotos.length - 1) {
      setActiveIndex(carouselPhotos.length - 1);
      return;
    }

    setActiveIndex(nextIndex);
  };

  const shuffleMessage = () => {
    if (homeMessages.length <= 1) {
      return;
    }

    let nextMessage = currentMessage;

    while (nextMessage === currentMessage) {
      nextMessage = homeMessages[Math.floor(Math.random() * homeMessages.length)];
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
              alignItems: 'center',
              marginTop: theme.spacing.xxxl + theme.spacing.sm,
              marginBottom: theme.spacing.xxl + theme.spacing.xs,
            }}
          >
            <Text
              style={{
                fontSize: 30,
                fontWeight: '700',
                color: theme.colors.textPrimary,
                textAlign: 'center',
                letterSpacing: -0.5,
                lineHeight: 36,
              }}
            >
              {"Welcome to\nNatSu's App"}
            </Text>

            <Animated.Text
              style={{
                fontSize: theme.spacing.md + 1,
                color: theme.colors.textMuted,
                marginTop: theme.spacing.sm,
                textAlign: 'center',
                opacity: messageOpacity,
              }}
            >
              {currentMessage}
            </Animated.Text>
          </View>

          <View
            style={{
              borderRadius: theme.radii.card,
              overflow: 'hidden',
              shadowColor: theme.colors.textPrimary,
              shadowOffset: { width: 0, height: theme.spacing.md - 2 },
              shadowOpacity: 0.1,
              shadowRadius: theme.spacing.xxl,
              elevation: 8,
            }}
          >
            {carouselPhotos.length > 0 ? (
              <ScrollView
                horizontal={true}
                pagingEnabled={true}
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleCarouselEnd}
              >
                {carouselPhotos.map((photo, index) => (
                  <View key={`home-photo-${index}`} style={{ width: pageWidth, height: carouselHeight }}>
                    <Image source={photo} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={{ width: pageWidth, height: carouselHeight }}>
                <GlassCard style={{ width: pageWidth, height: carouselHeight }}>
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text
                      style={{
                        fontSize: theme.spacing.xxl + theme.spacing.xs,
                        color: theme.colors.accent,
                        marginBottom: theme.spacing.sm,
                      }}
                    >
                      ✦
                    </Text>
                    <Text
                      style={{
                        fontSize: theme.spacing.md + 1,
                        color: theme.colors.textMuted,
                        textAlign: 'center',
                      }}
                    >
                      Add photos in data/photos.ts
                    </Text>
                  </View>
                </GlassCard>
              </View>
            )}
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: theme.spacing.md,
            }}
          >
            {dotWidthsRef.current.map((dotWidth, index) => (
              <Animated.View
                key={`home-dot-${index}`}
                style={{
                  width: dotWidth,
                  height: inactiveDotSize,
                  borderRadius: dotRadius,
                  backgroundColor: index === activeIndex ? theme.colors.accent : theme.colors.textMuted,
                  opacity: index === activeIndex ? 1 : 0.35,
                  marginHorizontal: theme.spacing.xs / 2,
                }}
              />
            ))}
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
