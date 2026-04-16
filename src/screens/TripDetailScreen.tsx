import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { TripMap } from '../components/tripOverview/TripMap';
import { useTripsData } from '../data/TripsDataContext';
import type { Booking, BookingType, Trip } from '../data/trips';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { MapPin, RouteSegment, StopActivity } from '../components/tripOverview/types';

type Props = StackScreenProps<RootStackParamList, 'TripDetail'>;

type Coordinates = {
  latitude: number;
  longitude: number;
};

type MapDataset = {
  pins: MapPin[];
  routeSegments: RouteSegment[];
};

const colors = {
  accent: '#1e3d2f',
  topCard: 'rgba(232,240,233,0.92)',
};

const airportCoordinates: Record<string, Coordinates> = {
  YVR: { latitude: 49.1967, longitude: -123.1815 },
  HND: { latitude: 35.5494, longitude: 139.7798 },
  NRT: { latitude: 35.772, longitude: 140.3929 },
  SIN: { latitude: 1.3644, longitude: 103.9915 },
  BKK: { latitude: 13.69, longitude: 100.7501 },
  CNX: { latitude: 18.7668, longitude: 98.9626 },
  HAN: { latitude: 21.2187, longitude: 105.8042 },
  SGN: { latitude: 10.8188, longitude: 106.6519 },
  YOW: { latitude: 45.3225, longitude: -75.6692 },
  YUL: { latitude: 45.4706, longitude: -73.7408 },
  YHU: { latitude: 45.5175, longitude: -73.4169 },
  YYC: { latitude: 51.1139, longitude: -114.02 },
};

const cityCoordinates: Record<string, Coordinates> = {
  vancouver: { latitude: 49.2827, longitude: -123.1207 },
  tokyo: { latitude: 35.6762, longitude: 139.6503 },
  singapore: { latitude: 1.3521, longitude: 103.8198 },
  bangkok: { latitude: 13.7563, longitude: 100.5018 },
  chiangmai: { latitude: 18.7883, longitude: 98.9853 },
  hanoi: { latitude: 21.0278, longitude: 105.8342 },
  hochiminhcity: { latitude: 10.8231, longitude: 106.6297 },
  saigon: { latitude: 10.8231, longitude: 106.6297 },
  montreal: { latitude: 45.5017, longitude: -73.5673 },
  ottawa: { latitude: 45.4215, longitude: -75.6972 },
  calgary: { latitude: 51.0447, longitude: -114.0719 },
};

const countryCoordinates: Record<string, Coordinates> = {
  canada: { latitude: 56.1304, longitude: -106.3468 },
  japan: { latitude: 36.2048, longitude: 138.2529 },
  singapore: { latitude: 1.3521, longitude: 103.8198 },
  thailand: { latitude: 15.87, longitude: 100.9925 },
  vietnam: { latitude: 14.0583, longitude: 108.2772 },
};

const airportCountryByCode: Record<string, string> = {
  YVR: 'Canada',
  YOW: 'Canada',
  YUL: 'Canada',
  YHU: 'Canada',
  YYC: 'Canada',
  HND: 'Japan',
  NRT: 'Japan',
  SIN: 'Singapore',
  BKK: 'Thailand',
  CNX: 'Thailand',
  HAN: 'Vietnam',
  SGN: 'Vietnam',
};

const cityCountryByKey: Record<string, string> = {
  vancouver: 'Canada',
  ottawa: 'Canada',
  montreal: 'Canada',
  calgary: 'Canada',
  tokyo: 'Japan',
  singapore: 'Singapore',
  bangkok: 'Thailand',
  chiangmai: 'Thailand',
  hanoi: 'Vietnam',
  hochiminhcity: 'Vietnam',
  saigon: 'Vietnam',
};

const cityAliases: Record<string, string> = {
  hcmc: 'Ho Chi Minh City',
  'ho chi minh': 'Ho Chi Minh City',
  'ho chi minh city': 'Ho Chi Minh City',
  saigon: 'Ho Chi Minh City',
  'tokyo haneda': 'Tokyo',
  haneda: 'Tokyo',
  narita: 'Tokyo',
  'chiang mai': 'Chiang Mai',
};

const iconByBookingType: Record<BookingType, string> = {
  flight: '✈',
  hotel: '⌂',
  train: '🚆',
  bus: '🚌',
  event: '✦',
  concert: '✦',
  festival: '✦',
  ferry: '⛴',
  'food-tour': '✦',
};

function isFlightBookingType(type: BookingType): boolean {
  return type === 'flight';
}

function isHotelBookingType(type: BookingType): boolean {
  return type === 'hotel';
}

function isIdeaBookingType(type: BookingType): boolean {
  return type === 'event' || type === 'concert' || type === 'festival' || type === 'food-tour';
}

function toTitleCase(value: string): string {
  if (value.length <= 4 && value.toUpperCase() === value) {
    return value;
  }

  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeCityName(value: string): string {
  const trimmed = value.trim();
  const aliasKey = trimmed.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');

  return cityAliases[aliasKey] ?? toTitleCase(trimmed);
}

function normalizeCityKey(value: string): string {
  return normalizeCityName(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeCountryKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function resolveCountryName(options: { code?: string; city?: string; location?: string }): string | undefined {
  const code = options.code?.trim().toUpperCase();
  if (code && airportCountryByCode[code]) {
    return airportCountryByCode[code];
  }

  const city = options.city?.trim();
  if (city) {
    const byCity = cityCountryByKey[normalizeCityKey(city)];
    if (byCity) {
      return byCity;
    }
  }

  if (options.location) {
    const locationParts = options.location
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    for (const part of locationParts.reverse()) {
      const byCountryKey = countryCoordinates[normalizeCountryKey(part)];
      if (byCountryKey) {
        return toTitleCase(part);
      }

      const byCity = cityCountryByKey[normalizeCityKey(part)];
      if (byCity) {
        return byCity;
      }
    }
  }

  return undefined;
}

function resolveCountryCoordinates(country?: string): Coordinates | null {
  if (!country) {
    return null;
  }

  return countryCoordinates[normalizeCountryKey(country)] ?? null;
}

function maybeExtractPrice(notes?: string): string | undefined {
  if (!notes) {
    return undefined;
  }

  const match = notes.match(/([$€£]\s?\d+(?:\.\d{2})?)/);
  return match?.[1]?.replace(/\s+/g, '');
}

function maybeExtractNotionUrl(notes?: string): string | undefined {
  if (!notes) {
    return undefined;
  }

  const match = notes.match(/https?:\/\/\S+/);
  return match?.[0];
}

function getCityFromLocation(location?: string): string | undefined {
  if (!location) {
    return undefined;
  }

  const firstSegment = location.split('·')[0]?.split('|')[0]?.split(',')[0]?.trim();
  if (!firstSegment) {
    return undefined;
  }

  return normalizeCityName(firstSegment);
}

function parseCoordinatesFromText(value?: string): Coordinates | null {
  if (!value) {
    return null;
  }

  const match = value.match(/(?:^|[^\d-])(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)(?!\d)/);
  if (!match) {
    return null;
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }

  return { latitude, longitude };
}

function resolveCoordinates(options: {
  code?: string;
  city?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
}): Coordinates | null {
  if (
    Number.isFinite(options.latitude) &&
    Number.isFinite(options.longitude) &&
    Math.abs(options.latitude as number) <= 90 &&
    Math.abs(options.longitude as number) <= 180
  ) {
    return {
      latitude: options.latitude as number,
      longitude: options.longitude as number,
    };
  }

  const code = options.code?.trim().toUpperCase();
  if (code && airportCoordinates[code]) {
    return airportCoordinates[code];
  }

  const directCoordinate = parseCoordinatesFromText(options.location);
  if (directCoordinate) {
    return directCoordinate;
  }

  const candidateCities = [
    options.city,
    getCityFromLocation(options.location),
    options.location?.split(',')[0],
    options.location?.split('·')[0],
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  for (const candidate of candidateCities) {
    const normalized = normalizeCityKey(candidate);
    const found = cityCoordinates[normalized];
    if (found) {
      return found;
    }
  }

  return null;
}

function shortLabel(value: string, max = 12): string {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1)}…`;
}

function addPin(
  pinMap: Map<string, MapPin>,
  coordinates: Coordinates,
  payload: {
    title: string;
    label: string;
    status: Booking['status'];
    icon: string;
    iataCode?: string;
    activity: StopActivity;
  }
): void {
  const key = `${coordinates.latitude.toFixed(3)}:${coordinates.longitude.toFixed(3)}:${payload.title.toLowerCase()}`;
  const existing = pinMap.get(key);

  if (existing) {
    existing.activities.push(payload.activity);

    if (existing.status === 'not_booked' && payload.status === 'booked') {
      existing.status = 'booked';
      existing.variant = 'confirmed';
      existing.icon = payload.icon;
    }

    if (!existing.iataCode && payload.iataCode) {
      existing.iataCode = payload.iataCode;
    }

    return;
  }

  pinMap.set(key, {
    id: `pin-${pinMap.size + 1}`,
    cityKey: payload.activity.cityKey,
    title: payload.title,
    label: payload.label,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    variant: payload.status === 'booked' ? 'confirmed' : 'idea',
    icon: payload.icon,
    status: payload.status,
    iataCode: payload.iataCode,
    activities: [payload.activity],
  });
}

function finalizePins(pinMap: Map<string, MapPin>): MapPin[] {
  return Array.from(pinMap.values())
    .map((pin) => ({
      ...pin,
      activities: [...pin.activities].sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => (a.activities[0]?.order ?? 0) - (b.activities[0]?.order ?? 0));
}

function buildFlightsMapData(trip: Trip): MapDataset {
  const pinMap = new Map<string, MapPin>();
  const routeSegments: RouteSegment[] = [];

  trip.bookings.forEach((booking, bookingIndex) => {
    if (!isFlightBookingType(booking.type)) {
      return;
    }

    const baseOrder = bookingIndex * 100;
    const notionUrl = maybeExtractNotionUrl(booking.notes);
    const priceLabel = maybeExtractPrice(booking.notes);

    if (booking.legs.length > 0) {
      booking.legs.forEach((leg, legIndex) => {
        const fromCity = normalizeCityName(leg.fromCity || leg.fromCode || trip.title);
        const toCity = normalizeCityName(leg.toCity || leg.toCode || trip.title);
        const dateLabel =
          leg.departureDate && leg.arrivalDate && leg.departureDate !== leg.arrivalDate
            ? `${leg.departureDate} → ${leg.arrivalDate}`
            : leg.departureDate || leg.arrivalDate || 'TBD';
        const timeLabel =
          leg.departureTime && leg.arrivalTime && leg.departureTime !== leg.arrivalTime
            ? `${leg.departureTime} → ${leg.arrivalTime}`
            : leg.departureTime || leg.arrivalTime;
        const fromCountry = resolveCountryName({ code: leg.fromCode, city: fromCity }) ?? fromCity;
        const toCountry = resolveCountryName({ code: leg.toCode, city: toCity }) ?? toCity;
        const fromCoords =
          resolveCoordinates({ code: leg.fromCode, city: leg.fromCity }) ?? resolveCountryCoordinates(fromCountry);
        const toCoords =
          resolveCoordinates({ code: leg.toCode, city: leg.toCity }) ?? resolveCountryCoordinates(toCountry);
        const departureTitle = leg.fromCode ? `${fromCity} (${leg.fromCode})` : fromCity;
        const destinationTitle = leg.toCode ? `${toCity} (${leg.toCode})` : toCity;

        const baseLegActivity: Omit<
          StopActivity,
          'id' | 'city' | 'country' | 'cityKey' | 'iataCode' | 'addressLabel' | 'order'
        > = {
          bookingId: booking.id,
          bookingType: booking.type,
          status: booking.status,
          icon: iconByBookingType[booking.type],
          name: `${fromCity} → ${toCity}`,
          dateLabel,
          timeLabel,
          priceLabel,
          refLabel: booking.bookingRef,
          notionUrl,
          fromLatitude: fromCoords?.latitude,
          fromLongitude: fromCoords?.longitude,
          toLatitude: toCoords?.latitude,
          toLongitude: toCoords?.longitude,
        };

        if (fromCoords) {
          const departureActivity: StopActivity = {
            ...baseLegActivity,
            id: `${booking.id}-leg-${legIndex}-from`,
            city: fromCity,
            country: fromCountry,
            cityKey: normalizeCityKey(fromCity),
            iataCode: leg.fromCode,
            addressLabel: `${fromCity} ${leg.fromCode || ''}`.trim(),
            order: baseOrder + legIndex * 2,
          };

          addPin(pinMap, fromCoords, {
            title: departureTitle,
            label: shortLabel(departureTitle, 13),
            status: booking.status,
            icon: iconByBookingType[booking.type],
            iataCode: leg.fromCode,
            activity: departureActivity,
          });
        }

        if (toCoords) {
          const arrivalActivity: StopActivity = {
            ...baseLegActivity,
            id: `${booking.id}-leg-${legIndex}-to`,
            city: toCity,
            country: toCountry,
            cityKey: normalizeCityKey(toCity),
            iataCode: leg.toCode,
            addressLabel: `${toCity} ${leg.toCode || ''}`.trim(),
            order: baseOrder + legIndex * 2 + 1,
          };

          addPin(pinMap, toCoords, {
            title: destinationTitle,
            label: shortLabel(destinationTitle, 13),
            status: booking.status,
            icon: iconByBookingType[booking.type],
            iataCode: leg.toCode,
            activity: arrivalActivity,
          });
        }

        if (
          fromCoords &&
          toCoords &&
          (Math.abs(fromCoords.latitude - toCoords.latitude) > 0.001 ||
            Math.abs(fromCoords.longitude - toCoords.longitude) > 0.001)
        ) {
          routeSegments.push({
            id: `route-${booking.id}-${legIndex}`,
            fromLatitude: fromCoords.latitude,
            fromLongitude: fromCoords.longitude,
            toLatitude: toCoords.latitude,
            toLongitude: toCoords.longitude,
          });
        }
      });

      return;
    }

    if (booking.legs.length === 0) {
      return;
    }
  });

  return {
    pins: finalizePins(pinMap),
    routeSegments,
  };
}

function buildHotelsMapData(trip: Trip): MapDataset {
  const pinMap = new Map<string, MapPin>();

  trip.bookings.forEach((booking, bookingIndex) => {
    if (!isHotelBookingType(booking.type)) {
      return;
    }

    const baseOrder = bookingIndex * 100;
    const notionUrl = maybeExtractNotionUrl(booking.notes);
    const priceLabel = maybeExtractPrice(booking.notes);
    const locationCity = normalizeCityName(
      booking.hotelStay?.city ?? getCityFromLocation(booking.activityLocation) ?? trip.title
    );
    const country =
      resolveCountryName({
        city: locationCity,
        location: booking.activityLocation ?? booking.hotelStay?.address,
      }) ?? locationCity;
    const addressLabel = booking.activityLocation ?? booking.hotelStay?.address;
    const locationCoords =
      resolveCoordinates({
        city: locationCity,
        location: addressLabel,
        latitude: booking.latitude,
        longitude: booking.longitude,
      }) ?? resolveCountryCoordinates(country);

    if (!locationCoords) {
      return;
    }

    const activity: StopActivity = {
      id: `${booking.id}-hotel`,
      bookingId: booking.id,
      bookingType: booking.type,
      status: booking.status,
      icon: iconByBookingType[booking.type],
      name: booking.hotelStay?.name ?? booking.label,
      city: locationCity,
      country,
      cityKey: normalizeCityKey(locationCity),
      dateLabel: booking.hotelStay?.checkInDate ?? booking.activityDate ?? 'TBD',
      timeLabel: booking.hotelStay?.checkInTime ?? booking.activityTime,
      priceLabel,
      refLabel: booking.bookingRef ?? booking.hotelStay?.confirmationNumber,
      addressLabel,
      notionUrl,
      order: baseOrder,
    };

    addPin(pinMap, locationCoords, {
      title: locationCity,
      label: shortLabel(locationCity, 13),
      status: booking.status,
      icon: iconByBookingType[booking.type],
      activity,
    });
  });

  return {
    pins: finalizePins(pinMap),
    routeSegments: [],
  };
}

function buildIdeasMapData(trip: Trip): MapDataset {
  const pinMap = new Map<string, MapPin>();

  trip.bookings.forEach((booking, bookingIndex) => {
    if (!isIdeaBookingType(booking.type)) {
      return;
    }

    const baseOrder = bookingIndex * 100;
    const notionUrl = maybeExtractNotionUrl(booking.notes);
    const priceLabel = maybeExtractPrice(booking.notes);

    const city = normalizeCityName(
      booking.hotelStay?.city ??
        getCityFromLocation(booking.hotelStay?.address ?? booking.activityLocation) ??
        booking.legs[booking.legs.length - 1]?.toCity ??
        trip.title
    );
    const country =
      resolveCountryName({
        code: booking.legs[booking.legs.length - 1]?.toCode,
        city,
        location: booking.activityLocation ?? booking.hotelStay?.address,
      }) ?? city;
    const addressLabel = booking.activityLocation ?? booking.hotelStay?.address;
    const coordinates =
      resolveCoordinates({
        city,
        location: addressLabel,
        latitude: booking.latitude,
        longitude: booking.longitude,
      }) ?? resolveCountryCoordinates(country);
    if (!coordinates) {
      return;
    }

    const activity: StopActivity = {
      id: `${booking.id}-idea`,
      bookingId: booking.id,
      bookingType: booking.type,
      status: booking.status,
      icon: iconByBookingType[booking.type],
      name: booking.hotelStay?.name ?? booking.label,
      city,
      country,
      cityKey: normalizeCityKey(city),
      dateLabel: booking.hotelStay?.checkInDate ?? booking.activityDate ?? booking.legs[0]?.departureDate ?? 'TBD',
      timeLabel: booking.hotelStay?.checkInTime ?? booking.activityTime ?? booking.legs[0]?.departureTime,
      priceLabel,
      refLabel: booking.bookingRef ?? booking.hotelStay?.confirmationNumber,
      addressLabel,
      notionUrl,
      order: baseOrder,
    };

    addPin(pinMap, coordinates, {
      title: city,
      label: shortLabel(city, 13),
      status: booking.status,
      icon: iconByBookingType[booking.type],
      activity,
    });
  });

  return {
    pins: finalizePins(pinMap),
    routeSegments: [],
  };
}

function buildCombinedMapData(trip: Trip): MapDataset {
  const flights = buildFlightsMapData(trip);
  const hotels = buildHotelsMapData(trip);
  const ideas = buildIdeasMapData(trip);

  const pinMap = new Map<string, MapPin>();

  [...flights.pins, ...hotels.pins, ...ideas.pins].forEach((pin) => {
    pin.activities.forEach((activity) => {
      addPin(
        pinMap,
        { latitude: pin.latitude, longitude: pin.longitude },
        {
          title: pin.title,
          label: pin.label,
          status: activity.status,
          icon: activity.icon,
          iataCode: activity.iataCode,
          activity,
        }
      );
    });
  });

  return {
    pins: finalizePins(pinMap),
    routeSegments: flights.routeSegments,
  };
}

export function TripDetailScreen({ navigation, route }: Props) {
  const { trips } = useTripsData();
  const trip = trips.find((item) => item.id === route.params.tripId);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  const mapData = useMemo(() => (trip ? buildCombinedMapData(trip) : { pins: [], routeSegments: [] }), [trip]);

  useEffect(() => {
    if (mapData.pins.length === 0) {
      setSelectedPinId(null);
      return;
    }

    setSelectedPinId((previous) => (previous && mapData.pins.some((pin) => pin.id === previous) ? previous : null));
  }, [mapData.pins]);

  const selectedPin = useMemo(() => {
    if (!selectedPinId) {
      return null;
    }

    return mapData.pins.find((pin) => pin.id === selectedPinId) ?? null;
  }, [mapData.pins, selectedPinId]);

  const focusedActivity = useMemo(() => {
    if (!selectedPin) {
      return null;
    }

    return selectedPin.activities.find((activity) => activity.bookingType === 'flight') ?? selectedPin.activities[0] ?? null;
  }, [selectedPin]);

  const openActivityDetails = (activity: StopActivity) => {
    if (activity.bookingType === 'flight') {
      navigation.navigate('FlightDetail', {
        tripId: trip.id,
        flightId: activity.bookingId,
      });
      return;
    }

    if (activity.bookingType === 'hotel') {
      navigation.navigate('HotelDetail', {
        tripId: trip.id,
        bookingId: activity.bookingId,
      });
      return;
    }

    navigation.navigate('EventDetail', {
      tripId: trip.id,
      bookingId: activity.bookingId,
    });
  };

  if (!trip) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.fullCenter}>
          <Text style={styles.emptyTitle}>Trip not found</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.backGhostButton}>
            <Text style={styles.backGhostText}>Back</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <TripMap
        pins={mapData.pins}
        routeSegments={mapData.routeSegments}
        selectedPinId={selectedPin?.id ?? null}
        focusedPin={selectedPin}
        focusedActivity={focusedActivity}
        onPinPress={(pin) => {
          setSelectedPinId(pin.id);
        }}
      />

      <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.topCard}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backText}>‹</Text>
            </Pressable>

            <Text style={styles.tripTitle} numberOfLines={1}>
              {trip.title}
            </Text>

            <View style={styles.backButtonPlaceholder} />
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.bottomOverlay} pointerEvents="box-none">
        {focusedActivity ? (
          <Pressable
            style={styles.bottomPopupCard}
            onPress={() => openActivityDetails(focusedActivity)}
          >
            <View style={styles.bottomPopupHeader}>
              <Text style={styles.bottomPopupTitle} numberOfLines={1}>
                {`${focusedActivity.icon} ${focusedActivity.name}`}
              </Text>
              <View
                style={[
                  styles.bottomPopupStatus,
                  { backgroundColor: focusedActivity.status === 'booked' ? '#d0eadc' : '#e4efe8' },
                ]}
              >
                <Text style={styles.bottomPopupStatusText}>
                  {focusedActivity.status === 'booked' ? 'Confirmed' : 'Idea'}
                </Text>
              </View>
            </View>

            <Text style={styles.bottomPopupSubtitle} numberOfLines={1}>
              {[
                focusedActivity.addressLabel,
                [focusedActivity.city, focusedActivity.country].filter(Boolean).join(', '),
                [focusedActivity.dateLabel, focusedActivity.timeLabel].filter(Boolean).join(' · '),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <Text style={styles.bottomPopupHint}>Swipe up for details</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#e8f0e9',
  },
  fullCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#1e3d2f',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  backGhostButton: {
    backgroundColor: '#1e3d2f',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backGhostText: {
    color: '#ecf4ed',
    fontSize: 14,
    fontWeight: '700',
  },
  topOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  topCard: {
    backgroundColor: colors.topCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(30,61,47,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dce8df',
  },
  backButtonPlaceholder: {
    width: 34,
    height: 34,
  },
  backText: {
    color: colors.accent,
    fontSize: 28,
    lineHeight: 30,
    marginTop: -1,
  },
  tripTitle: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  bottomOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
  },
  bottomPopupCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c8dcd0',
    backgroundColor: 'rgba(245,251,247,0.98)',
    paddingHorizontal: 12,
    paddingVertical: 14,
    minHeight: 108,
  },
  bottomPopupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  bottomPopupTitle: {
    color: '#1c4433',
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  bottomPopupStatus: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bottomPopupStatusText: {
    color: '#264d3b',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  bottomPopupSubtitle: {
    color: '#5f7d6e',
    fontSize: 12,
    marginTop: 6,
  },
  bottomPopupHint: {
    color: '#5a7768',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
