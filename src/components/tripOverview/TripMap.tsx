import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Svg, { Path } from 'react-native-svg';
import type { MapPin, RouteSegment, StopActivity } from './types';
import { theme } from '../../theme/theme';

type TripMapProps = {
  pins: MapPin[];
  routeSegments: RouteSegment[];
  selectedPinId: string | null;
  focusedPin: MapPin | null;
  focusedActivity: StopActivity | null;
  onPinPress: (pin: MapPin) => void;
  onMapPress: () => void;
};

type PinCategory = 'flight' | 'hotel' | 'sightseeing' | 'activities' | 'food';
type PinStyleKind = 'teardrop' | 'code' | 'cluster';

const colors = {
  mapBg: theme.colors.backgroundSecondary,
  flight: theme.colors.flight,
  hotel: theme.colors.hotel,
  sightseeing: theme.colors.sightseeing,
  activities: theme.colors.activities,
  food: theme.colors.food,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeLongitude(lon: number): number {
  const normalized = ((lon + 180) % 360 + 360) % 360 - 180;
  return normalized === -180 ? 180 : normalized;
}

function getWrappedLongitudeCenterAndSpan(longitudes: number[]): { center: number; span: number } {
  if (longitudes.length === 0) {
    return { center: 0, span: 0 };
  }

  if (longitudes.length === 1) {
    return { center: normalizeLongitude(longitudes[0]), span: 0 };
  }

  const normalized360 = longitudes
    .map((value) => ((value % 360) + 360) % 360)
    .sort((a, b) => a - b);

  let largestGap = -1;
  let largestGapIndex = 0;

  for (let index = 0; index < normalized360.length; index += 1) {
    const current = normalized360[index];
    const next = normalized360[(index + 1) % normalized360.length];
    const gap = index === normalized360.length - 1 ? next + 360 - current : next - current;

    if (gap > largestGap) {
      largestGap = gap;
      largestGapIndex = index;
    }
  }

  const arcStart = normalized360[(largestGapIndex + 1) % normalized360.length];
  const span = 360 - largestGap;
  const center360 = (arcStart + span / 2) % 360;
  const center = center360 > 180 ? center360 - 360 : center360;

  return {
    center: normalizeLongitude(center),
    span,
  };
}

function isActivityLike(activity: StopActivity): boolean {
  if (activity.bookingType !== 'event') {
    return false;
  }

  const haystack = [activity.name, activity.addressLabel, activity.refLabel]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /activit|adventure|class|tour|hike|workshop/.test(haystack);
}

function getInitialRegion(pins: MapPin[]) {
  if (pins.length === 0) {
    return {
      latitude: 18,
      longitude: 106,
      latitudeDelta: 45,
      longitudeDelta: 60,
    };
  }

  if (pins.length === 1) {
    return {
      latitude: pins[0].latitude,
      longitude: pins[0].longitude,
      latitudeDelta: 8,
      longitudeDelta: 8,
    };
  }

  const latitudes = pins.map((pin) => pin.latitude);
  const longitudes = pins.map((pin) => pin.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const latitudeCenter = clamp((minLat + maxLat) / 2, -85, 85);
  const { center: longitudeCenter, span: longitudeSpan } = getWrappedLongitudeCenterAndSpan(longitudes);
  const latitudeSpan = maxLat - minLat;

  return {
    latitude: Number.isFinite(latitudeCenter) ? latitudeCenter : 18,
    longitude: Number.isFinite(longitudeCenter) ? longitudeCenter : 106,
    latitudeDelta: clamp(Math.max(latitudeSpan * 1.65, 10), 6, 120),
    longitudeDelta: clamp(Math.max(longitudeSpan * 1.65, 12), 8, 160),
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const sanitized = hex.replace('#', '');
  const value = Number.parseInt(sanitized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function getPinCategory(pin: MapPin): PinCategory {
  const hasFlight = pin.activities.some((activity) => activity.bookingType === 'flight');
  if (hasFlight) {
    return 'flight';
  }

  const hasHotel = pin.activities.some((activity) => activity.bookingType === 'hotel');
  if (hasHotel) {
    return 'hotel';
  }
  const hasFood = pin.activities.some((activity) => activity.bookingType === 'food-tour');
  if (hasFood) {
    return 'food';
  }
  const hasActivities = pin.activities.some(
    (activity) => activity.bookingType === 'concert' || activity.bookingType === 'festival' || isActivityLike(activity)
  );
  if (hasActivities) {
    return 'activities';
  }
  return 'sightseeing';
}

function getCategoryColor(category: PinCategory): string {
  if (category === 'flight') {
    return colors.flight;
  }
  if (category === 'hotel') {
    return colors.hotel;
  }
  if (category === 'food') {
    return colors.food;
  }
  if (category === 'activities') {
    return colors.activities;
  }
  return colors.sightseeing;
}

function getPinKind(pin: MapPin): PinStyleKind {
  const category = getPinCategory(pin);
  if (pin.variant === 'cluster' || (pin.count ?? 0) > 1) {
    return 'cluster';
  }
  if (category !== 'flight' && pin.iataCode && pin.iataCode.length <= 4) {
    return 'code';
  }
  return 'teardrop';
}

function PinGlyph({ category }: { category: PinCategory }) {
  const fill = getCategoryColor(category);

  if (category === 'flight') {
    return (
      <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
        <Path d="M2.5 13.2L9.7 12.1L20.8 17.8L21.7 16.1L14.7 11.8L18.4 11.2C19.7 11 20.8 9.9 20.8 8.6C20.8 7.1 19.4 5.9 17.9 6.2L14.3 6.8L10.7 3.2L9.2 4.4L11.8 7.4L4.2 8.6L2.1 6.8L1 8.1L2.6 10L1 11.7L2.2 13L4 11.3L11.4 10.1L7.9 10.7L1.8 12.4L2.5 13.2Z" fill={fill} />
      </Svg>
    );
  }

  if (category === 'hotel') {
    return (
      <Svg width={9} height={9} viewBox="0 0 24 24" fill="none">
        <Path d="M4 20V10L12 4L20 10V20H15V14H9V20H4Z" fill={fill} />
      </Svg>
    );
  }

  if (category === 'activities') {
    return (
      <Svg width={9} height={9} viewBox="0 0 24 24" fill="none">
        <Path d="M12 3L14 8H19L15 11L16.5 16L12 13L7.5 16L9 11L5 8H10L12 3Z" fill={fill} />
      </Svg>
    );
  }

  if (category === 'food') {
    return (
      <Svg width={9} height={9} viewBox="0 0 24 24" fill="none">
        <Path d="M6 4V11C6 12 6.8 12.8 7.8 12.8V20H9.8V12.8C10.8 12.8 11.6 12 11.6 11V4H10V10H9V4H7.8V10H6.8V4H6Z" fill={fill} />
        <Path d="M15.2 4C17.3 4 19 5.7 19 7.8V20H17V14.5H15.2V4Z" fill={fill} />
      </Svg>
    );
  }

  return (
    <Svg width={9} height={9} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3L14.9 9.1L21.6 9.8L16.7 14.3L18.1 21L12 17.6L5.9 21L7.3 14.3L2.4 9.8L9.1 9.1L12 3Z" fill={fill} />
    </Svg>
  );
}

export function TripMap({
  pins,
  routeSegments,
  selectedPinId,
  focusedPin,
  focusedActivity,
  onPinPress,
  onMapPress,
}: TripMapProps) {
  const initialRegion = useMemo(() => getInitialRegion(pins), [pins]);
  const mapRef = useRef<MapView | null>(null);
  const markerPressInProgressRef = useRef(false);
  const mapPressBlockedUntilRef = useRef(0);
  const markerPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [trackMarkerViewChanges, setTrackMarkerViewChanges] = useState(true);
  const focusedFlightSegments = useMemo(() => {
    if (!selectedPinId || !focusedPin) {
      return [];
    }

    const resolvedFlightActivity =
      focusedActivity?.bookingType === 'flight'
        ? focusedActivity
        : focusedPin.activities.find((activity) => activity.bookingType === 'flight') ?? null;

    if (!resolvedFlightActivity) {
      return [];
    }

    const byBooking = routeSegments.filter((segment) =>
      segment.id.startsWith(`route-${resolvedFlightActivity.bookingId}-`)
    );

    if (byBooking.length > 0) {
      return byBooking;
    }

    if (
      resolvedFlightActivity.fromLatitude !== undefined &&
      resolvedFlightActivity.fromLongitude !== undefined &&
      resolvedFlightActivity.toLatitude !== undefined &&
      resolvedFlightActivity.toLongitude !== undefined
    ) {
      return [
        {
          id: `focused-${resolvedFlightActivity.id}`,
          fromLatitude: resolvedFlightActivity.fromLatitude,
          fromLongitude: resolvedFlightActivity.fromLongitude,
          toLatitude: resolvedFlightActivity.toLatitude,
          toLongitude: resolvedFlightActivity.toLongitude,
        },
      ];
    }

    return [];
  }, [focusedActivity, focusedPin, routeSegments, selectedPinId]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (focusedFlightSegments.length > 0) {
      const flightCoordinates = focusedFlightSegments.flatMap((segment) => [
        { latitude: segment.fromLatitude, longitude: segment.fromLongitude },
        { latitude: segment.toLatitude, longitude: segment.toLongitude },
      ]);
      const hasSpan = flightCoordinates.some((point, index) => {
        if (index === 0) {
          return false;
        }
        const first = flightCoordinates[0];
        return (
          Math.abs(first.latitude - point.latitude) > 0.02 ||
          Math.abs(first.longitude - point.longitude) > 0.02
        );
      });

      if (hasSpan) {
        mapRef.current.fitToCoordinates(flightCoordinates, {
          edgePadding: {
            top: 120,
            right: 72,
            bottom: 240,
            left: 72,
          },
          animated: true,
        });
        return;
      }
    }

    if (!focusedPin) {
      return;
    }

    mapRef.current.animateCamera(
      {
        center: {
          latitude: focusedPin.latitude,
          longitude: focusedPin.longitude,
        },
        zoom: 10.75,
      },
      {
        duration: 520,
      }
    );
  }, [focusedFlightSegments, focusedPin?.id]);

  useEffect(() => {
    setTrackMarkerViewChanges(true);
    const timeout = setTimeout(() => {
      setTrackMarkerViewChanges(false);
    }, 220);

    return () => {
      clearTimeout(timeout);
    };
  }, [pins, selectedPinId]);

  useEffect(() => {
    return () => {
      if (markerPressTimeoutRef.current) {
        clearTimeout(markerPressTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        mapType="standard"
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true}
        onPress={(event) => {
          if (Date.now() < mapPressBlockedUntilRef.current) {
            return;
          }
          if (markerPressInProgressRef.current) {
            return;
          }
          const action = (event.nativeEvent as { action?: string }).action;
          if (action === 'marker-press') {
            return;
          }
          onMapPress();
        }}
      >
        {focusedFlightSegments.map((segment) => (
          <Polyline
            key={segment.id}
            coordinates={[
              { latitude: segment.fromLatitude, longitude: segment.fromLongitude },
              { latitude: segment.toLatitude, longitude: segment.toLongitude },
            ]}
            strokeColor={colors.flight}
            strokeWidth={2}
            lineDashPattern={[8, 6]}
            geodesic={true}
            zIndex={90}
          />
        ))}

        {pins.map((pin) => {
          const isSelected = pin.id === selectedPinId;
          const kind = getPinKind(pin);
          const category = getPinCategory(pin);
          const fill = getCategoryColor(category);
          const haloColor = hexToRgba(fill, kind === 'cluster' ? 0.1 : 0.15);

          return (
            <Marker
              key={pin.id}
              identifier={pin.id}
              coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
              onPress={() => {
                markerPressInProgressRef.current = true;
                mapPressBlockedUntilRef.current = Date.now() + 700;
                if (markerPressTimeoutRef.current) {
                  clearTimeout(markerPressTimeoutRef.current);
                }
                markerPressTimeoutRef.current = setTimeout(() => {
                  markerPressInProgressRef.current = false;
                }, 180);
                onPinPress(pin);
              }}
              tracksViewChanges={trackMarkerViewChanges}
              anchor={{ x: 0.5, y: 1 }}
              zIndex={isSelected ? 2000 : 100}
            >
              <View
                collapsable={false}
                style={[
                  styles.pinOuter,
                  isSelected ? styles.pinOuterSelected : undefined,
                ]}
              >
                {isSelected ? <View style={[styles.pinHalo, { backgroundColor: haloColor }]} /> : null}

                {kind === 'cluster' ? (
                  <View style={[styles.clusterBubble, { backgroundColor: fill }]}>
                    <Text style={styles.clusterCountText}>{String(pin.count ?? pin.activities.length)}</Text>
                  </View>
                ) : kind === 'code' ? (
                  <>
                    <View style={[styles.codeHead, { backgroundColor: fill }]}>
                      <Text style={styles.codeText}>{pin.iataCode ?? '---'}</Text>
                    </View>
                    <View style={[styles.codeTip, { borderTopColor: fill }]} />
                  </>
                ) : (
                  <>
                    <View style={[styles.pinBubble, { backgroundColor: fill }]}>
                      <View style={[styles.pinInnerCircle, isSelected ? styles.pinInnerCircleSelected : undefined]}>
                        <PinGlyph category={category} />
                      </View>
                    </View>
                    <View style={[styles.pinTip, { borderTopColor: fill }]} />
                  </>
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.mapBg,
  },
  pinOuter: {
    width: 24,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  pinOuterSelected: {
    transform: [{ scale: 1 }],
  },
  pinHalo: {
    position: 'absolute',
    top: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  pinBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinInnerCircleSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pinTip: {
    marginTop: -1,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ translateY: -1.5 }],
  },
  codeHead: {
    minWidth: 26,
    height: 18,
    borderRadius: 8,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  codeTip: {
    marginTop: -1,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  clusterBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterCountText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
});
