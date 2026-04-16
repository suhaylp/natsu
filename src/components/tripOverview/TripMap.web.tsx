import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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

function getIconForType(type: BookingType | undefined): string {
  if (type === 'flight') {
    return '✈';
  }

  if (type === 'hotel') {
    return '⌂';
  }

  return '✦';
}

function createPinIcon(pin: MapPin, isSelected: boolean): L.DivIcon {
  const hasFlight = pin.activities.some((activity) => activity.bookingType === 'flight');
  const hasHotel = pin.activities.some((activity) => activity.bookingType === 'hotel');
  const hasHotelWithoutFlight = hasHotel && !hasFlight;
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
  const textColor = isIdea && pin.status !== 'booked' ? '#1e3d2f' : '#ffffff';
  const size = hasFlight ? 15 : hasHotelWithoutFlight ? 17 : 19;
  const borderColor = isSelected ? '#0f5a3a' : '#ffffff';
  const borderWidth = isSelected ? 1.75 : 1.25;

  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="
      width:${size}px;
      height:${size}px;
      border-radius:${size / 2}px;
      background:${fill};
      border:${borderWidth}px solid ${borderColor};
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:${hasFlight ? 7.5 : 9.5}px;
      font-weight:700;
      color:${textColor};
      box-sizing:border-box;
      line-height:1;
    ">${icon}</div>`,
  });
}

export function TripMap({
  pins,
  routeSegments,
  selectedPinId,
  focusedPin,
  focusedActivity,
  onPinPress,
}: TripMapProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  const focusedFlightSegment = useMemo(() => {
    if (
      focusedActivity?.bookingType === 'flight' &&
      focusedActivity.fromLatitude !== undefined &&
      focusedActivity.fromLongitude !== undefined &&
      focusedActivity.toLatitude !== undefined &&
      focusedActivity.toLongitude !== undefined
    ) {
      return {
        fromLatitude: focusedActivity.fromLatitude,
        fromLongitude: focusedActivity.fromLongitude,
        toLatitude: focusedActivity.toLatitude,
        toLongitude: focusedActivity.toLongitude,
      };
    }

    return null;
  }, [focusedActivity]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      boxZoom: false,
      keyboard: false,
    }).setView([13.75, 100.5], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      routesLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    const routesLayer = routesLayerRef.current;

    if (!map || !markersLayer || !routesLayer) {
      return;
    }

    markersLayer.clearLayers();
    routesLayer.clearLayers();

    routeSegments.forEach((segment) => {
      L.polyline(
        [
          [segment.fromLatitude, segment.fromLongitude],
          [segment.toLatitude, segment.toLongitude],
        ],
        {
          color: 'rgba(30,61,47,0.56)',
          weight: 2,
        }
      ).addTo(routesLayer);
    });

    pins.forEach((pin) => {
      const marker = L.marker([pin.latitude, pin.longitude], {
        icon: createPinIcon(pin, pin.id === selectedPinId),
        keyboard: false,
      });
      marker.on('click', () => onPinPress(pin));
      marker.addTo(markersLayer);
    });

    if (focusedFlightSegment) {
      const bounds = L.latLngBounds(
        [focusedFlightSegment.fromLatitude, focusedFlightSegment.fromLongitude],
        [focusedFlightSegment.toLatitude, focusedFlightSegment.toLongitude]
      );
      map.fitBounds(bounds.pad(0.55), { animate: true });
      return;
    }

    if (focusedPin) {
      map.setView([focusedPin.latitude, focusedPin.longitude], 11, { animate: true });
      return;
    }

    const allCoordinates = [
      ...pins.map((pin) => [pin.latitude, pin.longitude] as [number, number]),
      ...routeSegments.flatMap((segment) => [
        [segment.fromLatitude, segment.fromLongitude] as [number, number],
        [segment.toLatitude, segment.toLongitude] as [number, number],
      ]),
    ];

    if (allCoordinates.length === 1) {
      map.setView(allCoordinates[0], 11, { animate: true });
      return;
    }

    if (allCoordinates.length > 1) {
      map.fitBounds(L.latLngBounds(allCoordinates), { padding: [48, 48], animate: true });
    }
  }, [focusedFlightSegment, focusedPin, onPinPress, pins, routeSegments, selectedPinId]);

  return (
    <View style={styles.container}>
      <View ref={containerRef as never} style={styles.mapElement} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mapBg,
  },
  mapElement: {
    width: '100%',
    height: '100%',
  },
});
