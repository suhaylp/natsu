import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapPin, RouteSegment, StopActivity } from './types';

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
  mapBg: '#e8f0e9',
  flight: '#534AB7',
  hotel: '#185FA5',
  sightseeing: '#EA4335',
  activities: '#FB8C00',
  food: '#34A853',
};

function hexToRgba(hex: string, alpha: number): string {
  const sanitized = hex.replace('#', '');
  const value = Number.parseInt(sanitized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
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

function glyphSvg(category: PinCategory): string {
  const fill = getCategoryColor(category);

  if (category === 'flight') {
    return `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 13.2L9.7 12.1L20.8 17.8L21.7 16.1L14.7 11.8L18.4 11.2C19.7 11 20.8 9.9 20.8 8.6C20.8 7.1 19.4 5.9 17.9 6.2L14.3 6.8L10.7 3.2L9.2 4.4L11.8 7.4L4.2 8.6L2.1 6.8L1 8.1L2.6 10L1 11.7L2.2 13L4 11.3L11.4 10.1L7.9 10.7L1.8 12.4L2.5 13.2Z" fill="${fill}"/></svg>`;
  }

  if (category === 'hotel') {
    return `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20V10L12 4L20 10V20H15V14H9V20H4Z" fill="${fill}"/></svg>`;
  }

  if (category === 'activities') {
    return `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3L14 8H19L15 11L16.5 16L12 13L7.5 16L9 11L5 8H10L12 3Z" fill="${fill}"/></svg>`;
  }

  if (category === 'food') {
    return `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 4V11C6 12 6.8 12.8 7.8 12.8V20H9.8V12.8C10.8 12.8 11.6 12 11.6 11V4H10V10H9V4H7.8V10H6.8V4H6Z" fill="${fill}"/><path d="M15.2 4C17.3 4 19 5.7 19 7.8V20H17V14.5H15.2V4Z" fill="${fill}"/></svg>`;
  }

  return `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3L14.9 9.1L21.6 9.8L16.7 14.3L18.1 21L12 17.6L5.9 21L7.3 14.3L2.4 9.8L9.1 9.1L12 3Z" fill="${fill}"/></svg>`;
}

function createPinIcon(pin: MapPin, options: { isSelected: boolean }): L.DivIcon {
  const category = getPinCategory(pin);
  const fill = getCategoryColor(category);
  const kind = getPinKind(pin);
  const haloAlpha = kind === 'cluster' ? 0.1 : 0.15;
  const haloColor = hexToRgba(fill, haloAlpha);
  const wrapperOpacity = 1;
  const scale = options.isSelected ? 1.45 : 1;

  if (kind === 'cluster') {
    return L.divIcon({
      className: '',
      iconSize: [24, 34],
      iconAnchor: [12, 30],
      html: `<div style="
        width:24px;
        height:34px;
        position:relative;
        display:flex;
        align-items:flex-start;
        justify-content:center;
        transform:scale(${scale});
        transform-origin:center bottom;
        opacity:${wrapperOpacity};
      ">
        ${options.isSelected ? `<div style="position:absolute;top:0;width:30px;height:30px;border-radius:15px;background:${haloColor};"></div>` : ''}
        <div style="
          width:24px;
          height:24px;
          border-radius:12px;
          background:${fill};
          color:#fff;
          font-size:13px;
          font-weight:500;
          display:flex;
          align-items:center;
          justify-content:center;
          line-height:1;
        ">${String(pin.count ?? pin.activities.length)}</div>
      </div>`,
    });
  }

  if (kind === 'code') {
    const code = (pin.iataCode ?? '---').slice(0, 4);
    const width = Math.max(30, code.length * 10 + 10);
    return L.divIcon({
      className: '',
      iconSize: [Math.max(26, width), 34],
      iconAnchor: [Math.max(13, width / 2), 30],
      html: `<div style="
        width:${Math.max(26, width)}px;
        height:34px;
        position:relative;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:flex-start;
        transform:scale(${scale});
        transform-origin:center bottom;
        opacity:${wrapperOpacity};
      ">
        ${options.isSelected ? `<div style="position:absolute;top:0;width:30px;height:30px;border-radius:15px;background:${haloColor};"></div>` : ''}
        <div style="
          min-width:${width}px;
          height:18px;
          padding:0 5px;
          border-radius:8px;
          background:${fill};
          color:#fff;
          font-size:10px;
          font-weight:500;
          display:flex;
          align-items:center;
          justify-content:center;
          line-height:1;
          letter-spacing:0.2px;
          box-sizing:border-box;
        ">${code}</div>
        <div style="
          margin-top:-1px;
          width:0;
          height:0;
          border-left:5px solid transparent;
          border-right:5px solid transparent;
          border-top:8px solid ${fill};
        "></div>
      </div>`,
    });
  }

  return L.divIcon({
    className: '',
    iconSize: [24, 34],
    iconAnchor: [12, 30],
    html: `<div style="
      width:24px;
      height:34px;
      position:relative;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:flex-start;
      transform:scale(${scale});
      transform-origin:center bottom;
      opacity:${wrapperOpacity};
    ">
      ${options.isSelected ? `<div style="position:absolute;top:0;width:30px;height:30px;border-radius:15px;background:${haloColor};"></div>` : ''}
      <div style="
        width:24px;
        height:24px;
        border-radius:12px;
        background:${fill};
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <div style="
          width:10px;
          height:10px;
          border-radius:5px;
          background:#fff;
          display:flex;
          align-items:center;
          justify-content:center;
        ">${glyphSvg(category)}</div>
      </div>
      <div style="
        margin-top:-1px;
        width:0;
        height:0;
        border-left:6px solid transparent;
        border-right:6px solid transparent;
        border-top:10px solid ${fill};
        transform:translateY(-1.5px);
      "></div>
    </div>`,
  });
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
  const containerRef = useRef<HTMLElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLinesLayerRef = useRef<L.LayerGroup | null>(null);
  const markerClickRef = useRef(false);
  const onPinPressRef = useRef(onPinPress);
  const onMapPressRef = useRef(onMapPress);
  const hasAutoFitViewportRef = useRef(false);
  const hasSeenFocusedSelectionRef = useRef(false);

  useEffect(() => {
    onPinPressRef.current = onPinPress;
  }, [onPinPress]);

  useEffect(() => {
    onMapPressRef.current = onMapPress;
  }, [onMapPress]);

  const focusedFlightSegments = useMemo(() => {
    if (!selectedPinId || focusedActivity?.bookingType !== 'flight') {
      return [];
    }

    const byBooking = routeSegments.filter((segment) =>
      segment.id.startsWith(`route-${focusedActivity.bookingId}-`)
    );
    if (byBooking.length > 0) {
      return byBooking;
    }

    if (
      focusedActivity.fromLatitude !== undefined &&
      focusedActivity.fromLongitude !== undefined &&
      focusedActivity.toLatitude !== undefined &&
      focusedActivity.toLongitude !== undefined
    ) {
      return [
        {
          id: `focused-${focusedActivity.id}`,
          fromLatitude: focusedActivity.fromLatitude,
          fromLongitude: focusedActivity.fromLongitude,
          toLatitude: focusedActivity.toLatitude,
          toLongitude: focusedActivity.toLongitude,
        },
      ];
    }

    return [];
  }, [focusedActivity, routeSegments, selectedPinId]);

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
    routeLinesLayerRef.current = L.layerGroup().addTo(map);
    map.on('click', () => {
      if (markerClickRef.current) {
        markerClickRef.current = false;
        return;
      }
      onMapPressRef.current();
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      routeLinesLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    const routeLinesLayer = routeLinesLayerRef.current;

    if (!map || !markersLayer || !routeLinesLayer) {
      return;
    }

    markersLayer.clearLayers();
    routeLinesLayer.clearLayers();

    const renderOrder = [...pins].sort((a, b) => {
      if (a.id === selectedPinId) {
        return 1;
      }
      if (b.id === selectedPinId) {
        return -1;
      }
      return 0;
    });

    renderOrder.forEach((pin) => {
      const isSelected = pin.id === selectedPinId;
      const marker = L.marker([pin.latitude, pin.longitude], {
        icon: createPinIcon(pin, { isSelected }),
        keyboard: false,
        zIndexOffset: isSelected ? 2000 : 100,
      });
      marker.on('click', () => {
        markerClickRef.current = true;
        onPinPressRef.current(pin);
      });
      marker.addTo(markersLayer);
    });

    if (focusedFlightSegments.length > 0) {
      hasSeenFocusedSelectionRef.current = true;
      const coordinates = focusedFlightSegments.flatMap((segment) => {
        const from: [number, number] = [segment.fromLatitude, segment.fromLongitude];
        const to: [number, number] = [segment.toLatitude, segment.toLongitude];

        L.polyline([from, to], {
          color: colors.flight,
          weight: 2,
          opacity: 0.9,
          dashArray: '8 6',
        }).addTo(routeLinesLayer);

        return [from, to];
      });

      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds.pad(0.55), {
        animate: true,
        duration: 0.85,
        easeLinearity: 0.25,
      });
      return;
    }

    if (focusedPin) {
      hasSeenFocusedSelectionRef.current = true;
      map.flyTo([focusedPin.latitude, focusedPin.longitude], 11.5, {
        animate: true,
        duration: 0.75,
        easeLinearity: 0.25,
      });
      return;
    }

    if (hasSeenFocusedSelectionRef.current || hasAutoFitViewportRef.current) {
      return;
    }

    const allCoordinates = pins.map((pin) => [pin.latitude, pin.longitude] as [number, number]);

    if (allCoordinates.length === 1) {
      hasAutoFitViewportRef.current = true;
      map.flyTo(allCoordinates[0], 11.5, {
        animate: true,
        duration: 0.75,
        easeLinearity: 0.25,
      });
      return;
    }

    if (allCoordinates.length > 1) {
      hasAutoFitViewportRef.current = true;
      map.fitBounds(L.latLngBounds(allCoordinates), {
        padding: [48, 48],
        animate: true,
        duration: 0.9,
        easeLinearity: 0.25,
      });
    }
  }, [focusedFlightSegments, focusedPin, pins, selectedPinId]);

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
