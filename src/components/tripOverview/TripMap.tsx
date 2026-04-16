import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
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

const colors = {
  mapBg: '#e8f0e9',
  dark: '#2b6a4a',
  medium: '#8ebaa4',
  hotel: '#1f5d44',
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

export function TripMap({
  pins,
  routeSegments,
  selectedPinId,
  focusedPin,
  focusedActivity,
  onPinPress,
}: TripMapProps) {
  const initialRegion = useMemo(() => getInitialRegion(pins), [pins]);
  const mapKey = `pins:${pins.map((pin) => pin.id).join('|')}`;
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (
      focusedActivity?.bookingType === 'flight' &&
      focusedActivity.fromLatitude !== undefined &&
      focusedActivity.fromLongitude !== undefined &&
      focusedActivity.toLatitude !== undefined &&
      focusedActivity.toLongitude !== undefined
    ) {
      const from = { latitude: focusedActivity.fromLatitude, longitude: focusedActivity.fromLongitude };
      const to = { latitude: focusedActivity.toLatitude, longitude: focusedActivity.toLongitude };
      const hasSpan =
        Math.abs(from.latitude - to.latitude) > 0.02 || Math.abs(from.longitude - to.longitude) > 0.02;

      if (hasSpan) {
        mapRef.current.fitToCoordinates([from, to], {
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
  }, [focusedActivity?.id, focusedPin?.id]);

  useEffect(() => {
    if (!mapRef.current || focusedPin || focusedActivity?.bookingType === 'flight') {
      return;
    }

    mapRef.current.animateToRegion(initialRegion, 600);
  }, [focusedActivity?.bookingType, focusedPin, initialRegion]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        key={mapKey}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        mapType="standard"
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true}
      >
        {routeSegments.map((segment) => (
          <Polyline
            key={segment.id}
            coordinates={[
              { latitude: segment.fromLatitude, longitude: segment.fromLongitude },
              { latitude: segment.toLatitude, longitude: segment.toLongitude },
            ]}
            geodesic={true}
            strokeWidth={2}
            strokeColor="rgba(30,61,47,0.56)"
          />
        ))}

        {pins.map((pin) => {
          const isSelected = pin.id === selectedPinId;
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

          return (
            <Marker
              key={pin.id}
              coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
              onPress={() => onPinPress(pin)}
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
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.mapBg,
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
