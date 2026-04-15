import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import type { BookingType } from '../../data/trips';
import type { MapPin, RouteSegment, StopActivity } from './types';

type TripMapProps = {
  pins: MapPin[];
  routeSegments: RouteSegment[];
  selectedPinId: string | null;
  focusedPin: MapPin | null;
  focusedActivity: StopActivity | null;
  onPinPress: (pin: MapPin) => void;
};

type Bounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

type Point = {
  x: number;
  y: number;
};

const colors = {
  mapBg: '#e8f0e9',
  dark: '#2b6a4a',
  medium: '#8ebaa4',
  hotel: '#1f5d44',
  route: 'rgba(30,61,47,0.56)',
  grid: 'rgba(31,93,68,0.1)',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getBounds(pins: MapPin[], segments: RouteSegment[]): Bounds {
  const points = [
    ...pins.map((pin) => ({ latitude: pin.latitude, longitude: pin.longitude })),
    ...segments.flatMap((segment) => [
      { latitude: segment.fromLatitude, longitude: segment.fromLongitude },
      { latitude: segment.toLatitude, longitude: segment.toLongitude },
    ]),
  ];

  if (points.length === 0) {
    return {
      minLat: 2,
      maxLat: 40,
      minLon: 80,
      maxLon: 145,
    };
  }

  const minLat = Math.min(...points.map((point) => point.latitude));
  const maxLat = Math.max(...points.map((point) => point.latitude));
  const minLon = Math.min(...points.map((point) => point.longitude));
  const maxLon = Math.max(...points.map((point) => point.longitude));

  const latSpan = Math.max(maxLat - minLat, 1.5);
  const lonSpan = Math.max(maxLon - minLon, 1.5);
  const latPad = Math.max(latSpan * 0.18, 1.2);
  const lonPad = Math.max(lonSpan * 0.18, 1.2);

  return {
    minLat: clamp(minLat - latPad, -85, 85),
    maxLat: clamp(maxLat + latPad, -85, 85),
    minLon: clamp(minLon - lonPad, -180, 180),
    maxLon: clamp(maxLon + lonPad, -180, 180),
  };
}

function toPoint(latitude: number, longitude: number, bounds: Bounds): Point {
  const lonSpan = Math.max(bounds.maxLon - bounds.minLon, 0.0001);
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.0001);

  const x = clamp(((longitude - bounds.minLon) / lonSpan) * 100, 3, 97);
  const y = clamp((1 - (latitude - bounds.minLat) / latSpan) * 100, 4, 96);

  return { x, y };
}

function getIconForType(type: BookingType | undefined): string {
  if (type === 'flight') {
    return '✈';
  }

  if (type === 'hotel') {
    return '⌂';
  }

  return '✦';
}

export function TripMap({
  pins,
  routeSegments,
  selectedPinId,
  focusedPin,
  focusedActivity,
  onPinPress,
}: TripMapProps) {
  const focusedFlightSegment =
    focusedActivity?.bookingType === 'flight' &&
    focusedActivity.fromLatitude !== undefined &&
    focusedActivity.fromLongitude !== undefined &&
    focusedActivity.toLatitude !== undefined &&
    focusedActivity.toLongitude !== undefined
      ? {
          id: `focused-${focusedActivity.id}`,
          fromLatitude: focusedActivity.fromLatitude,
          fromLongitude: focusedActivity.fromLongitude,
          toLatitude: focusedActivity.toLatitude,
          toLongitude: focusedActivity.toLongitude,
        }
      : null;

  const effectiveSegments = focusedFlightSegment ? [focusedFlightSegment] : routeSegments;
  const bounds = getBounds(pins, effectiveSegments);

  return (
    <View style={styles.container}>
      <View style={styles.mapSurface}>
        <View style={styles.gridOverlay}>
          <View style={styles.gridVerticalLeft} />
          <View style={styles.gridVerticalRight} />
          <View style={styles.gridHorizontalTop} />
          <View style={styles.gridHorizontalBottom} />
        </View>

        <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 100 100" preserveAspectRatio="none">
          {effectiveSegments.map((segment) => {
            const fromPoint = toPoint(segment.fromLatitude, segment.fromLongitude, bounds);
            const toPointCoords = toPoint(segment.toLatitude, segment.toLongitude, bounds);

            return (
              <Line
                key={segment.id}
                x1={fromPoint.x}
                y1={fromPoint.y}
                x2={toPointCoords.x}
                y2={toPointCoords.y}
                stroke={colors.route}
                strokeWidth={0.4}
              />
            );
          })}
        </Svg>

        {pins.map((pin) => {
          const isSelected = pin.id === selectedPinId || pin.id === focusedPin?.id;
          const hasFlight = pin.activities.some((activity) => activity.bookingType === 'flight');
          const hasHotel = pin.activities.some((activity) => activity.bookingType === 'hotel');
          const hasHotelWithoutFlight = hasHotel && !hasFlight;
          const hasOnlyFlight = hasFlight && pin.activities.every((activity) => activity.bookingType === 'flight');
          const firstType = pin.activities[0]?.bookingType;
          const icon = hasFlight ? '✈' : hasHotelWithoutFlight ? '⌂' : getIconForType(firstType);
          const fill = hasFlight
            ? colors.dark
            : hasHotelWithoutFlight
              ? colors.hotel
              : pin.status === 'booked'
                ? colors.dark
                : colors.medium;
          const isIdea = !hasFlight && !hasHotel;
          const iconColor = isIdea && pin.status !== 'booked' ? '#1e3d2f' : '#ffffff';
          const point = toPoint(pin.latitude, pin.longitude, bounds);

          return (
            <Pressable
              key={pin.id}
              onPress={() => onPinPress(pin)}
              style={[
                styles.markerWrap,
                {
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                },
              ]}
            >
              <View
                style={[
                  styles.customPin,
                  { backgroundColor: fill },
                  hasOnlyFlight ? styles.customPinFlight : undefined,
                  hasHotelWithoutFlight ? styles.customPinHotel : undefined,
                  isSelected ? styles.customPinSelected : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.customPinText,
                    hasOnlyFlight ? styles.customPinFlightText : undefined,
                    hasHotelWithoutFlight ? styles.customPinHotelText : undefined,
                    { color: iconColor },
                  ]}
                >
                  {icon}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.mapBg,
  },
  mapSurface: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 0,
    backgroundColor: colors.mapBg,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridVerticalLeft: {
    position: 'absolute',
    left: '33%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.grid,
  },
  gridVerticalRight: {
    position: 'absolute',
    left: '66%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.grid,
  },
  gridHorizontalTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33%',
    height: 1,
    backgroundColor: colors.grid,
  },
  gridHorizontalBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '66%',
    height: 1,
    backgroundColor: colors.grid,
  },
  markerWrap: {
    position: 'absolute',
    transform: [{ translateX: -9.5 }, { translateY: -9.5 }],
  },
  customPin: {
    minWidth: 19,
    height: 19,
    borderRadius: 9.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.25,
    borderColor: '#ffffff',
    paddingHorizontal: 3,
  },
  customPinHotel: {
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
  },
  customPinFlight: {
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    paddingHorizontal: 2,
  },
  customPinSelected: {
    borderColor: '#0f5a3a',
    borderWidth: 1.75,
    transform: [{ scale: 1.03 }],
  },
  customPinText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  customPinFlightText: {
    fontSize: 7.5,
  },
  customPinHotelText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
