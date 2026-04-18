import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import Svg, { Path } from 'react-native-svg';
import { TripMap } from '../components/tripOverview/TripMap';
import { useTripsData } from '../data/TripsDataContext';
import type { Booking, BookingType, Trip } from '../data/trips';
import { normalizeLocationText } from '../lib/locationText';
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
type SwipeGroup = 'flight' | 'hotel' | 'sightseeing' | 'activities' | 'food';

const colors = {
  accent: '#1e3d2f',
  topCard: 'rgba(232,240,233,0.92)',
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'flights', label: 'Flights' },
  { key: 'hotels', label: 'Hotels' },
  { key: 'sightseeing', label: 'Sightseeing' },
  { key: 'activities', label: 'Activities' },
  { key: 'food', label: 'Food' },
] as const;

type FilterKey = (typeof FILTER_OPTIONS)[number]['key'];

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

function SheetFlightBadgeIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12H9L20 6.5V9.3L14.5 12L20 14.7V17.5L9 12H3Z"
        stroke="#534AB7"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SheetHotelBadgeIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 20V9.6C3 9.2 3.2 8.8 3.5 8.6L11.4 2.9C11.8 2.6 12.3 2.6 12.7 2.9L20.5 8.6C20.8 8.8 21 9.2 21 9.6V20H16V14.6C16 14 15.6 13.5 15 13.5H9C8.4 13.5 8 14 8 14.6V20H3Z"
        fill="#185FA5"
      />
    </Svg>
  );
}

function SheetPlaneRowIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12H9.2L20 7V9.4L14.9 12L20 14.6V17L9.2 12H3Z"
        stroke="#6D7280"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SheetSightseeingBadgeIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3L14.9 9.1L21.6 9.8L16.7 14.3L18.1 21L12 17.6L5.9 21L7.3 14.3L2.4 9.8L9.1 9.1L12 3Z" fill="#EA4335" />
    </Svg>
  );
}

function SheetActivitiesBadgeIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12H20M12 4V20" stroke="#FB8C00" strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M7 7L17 17M17 7L7 17" stroke="#FB8C00" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function SheetFoodBadgeIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3V11C6 12.1 6.9 13 8 13V21" stroke="#34A853" strokeWidth={2} strokeLinecap="round" />
      <Path d="M10 3V21" stroke="#34A853" strokeWidth={2} strokeLinecap="round" />
      <Path d="M16 3C18.2 3 20 4.8 20 7V21" stroke="#34A853" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function isFlightBookingType(type: BookingType): boolean {
  return type === 'flight';
}

function isHotelBookingType(type: BookingType): boolean {
  return type === 'hotel';
}

function isIdeaBookingType(type: BookingType): boolean {
  return type === 'event' || type === 'concert' || type === 'festival' || type === 'food-tour';
}

type ExperienceType = 'sightseeing' | 'activities' | 'food';

function getExperienceType(activity: StopActivity): ExperienceType {
  if (activity.bookingType === 'food-tour') {
    return 'food';
  }
  if (activity.bookingType === 'concert' || activity.bookingType === 'festival') {
    return 'activities';
  }
  if (activity.bookingType === 'event' && isActivityLike(activity)) {
    return 'activities';
  }
  return 'sightseeing';
}

function getExperienceLabel(type: ExperienceType): string {
  if (type === 'food') {
    return 'Food';
  }
  if (type === 'activities') {
    return 'Activities';
  }
  return 'Sightseeing';
}

function getFilterTint(key: FilterKey, active: boolean): { bg: string; border: string; text: string } {
  const palette = {
    all: { bg: '#F5F7FA', border: '#D0D5DD', text: '#475467' },
    flights: { bg: '#F3F0FF', border: '#D5D0F5', text: '#3C3489' },
    hotels: { bg: '#EBF5FF', border: '#CFE2F3', text: '#0C447C' },
    sightseeing: { bg: '#FDECEC', border: '#F5CBC7', text: '#B42318' },
    activities: { bg: '#FFF4E8', border: '#FCD9BD', text: '#B54708' },
    food: { bg: '#ECF9F0', border: '#CAEED5', text: '#166534' },
  } as const;

  const base = palette[key];
  if (!active) {
    return base;
  }

  return {
    bg: base.bg,
    border: base.text,
    text: base.text,
  };
}

function matchesFilter(activity: StopActivity, filter: FilterKey): boolean {
  if (filter === 'all') {
    return true;
  }
  if (filter === 'flights') {
    return activity.bookingType === 'flight';
  }
  if (filter === 'hotels') {
    return activity.bookingType === 'hotel';
  }
  if (filter === 'sightseeing') {
    return isIdeaBookingType(activity.bookingType) && getExperienceType(activity) === 'sightseeing';
  }
  if (filter === 'activities') {
    return isIdeaBookingType(activity.bookingType) && getExperienceType(activity) === 'activities';
  }
  if (filter === 'food') {
    return isIdeaBookingType(activity.bookingType) && getExperienceType(activity) === 'food';
  }
  return true;
}

function getSwipeGroup(activity: StopActivity): SwipeGroup {
  if (activity.bookingType === 'flight') {
    return 'flight';
  }
  if (activity.bookingType === 'hotel') {
    return 'hotel';
  }
  return getExperienceType(activity);
}

function getSwipeActivities(pins: MapPin[], group: SwipeGroup): StopActivity[] {
  const flattened = pins.flatMap((pin) => pin.activities);
  const grouped = flattened.filter((activity) => {
    if (group === 'flight') {
      return activity.bookingType === 'flight';
    }
    if (group === 'hotel') {
      return activity.bookingType === 'hotel';
    }
    if (!isIdeaBookingType(activity.bookingType)) {
      return false;
    }
    return getExperienceType(activity) === group;
  });

  const deduped = new Map<string, StopActivity>();
  grouped.forEach((activity) => {
    const key =
      group === 'flight'
        ? activity.bookingId
        : activity.id;
    if (!deduped.has(key)) {
      deduped.set(key, activity);
    }
  });

  return Array.from(deduped.values()).sort((a, b) => a.order - b.order);
}

function getDefaultActivityForPin(pin: MapPin | null): StopActivity | null {
  if (!pin) {
    return null;
  }
  return pin.activities.find((activity) => activity.bookingType === 'flight') ?? pin.activities[0] ?? null;
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
    const locationParts = (normalizeLocationText(options.location) ?? options.location)
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

  const match = notes.match(/((?:[A-Z]{3}\s*)?[$€£¥]\s?\d+(?:\.\d{1,2})?|\b\d+(?:\.\d{1,2})?\s?(?:USD|CAD|EUR|GBP|JPY|THB|VND|SGD)\b)/i);
  return match?.[1]?.replace(/\s+/g, ' ').trim();
}

function withCurrencyLabel(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  const upper = normalized.toUpperCase();

  if (/(USD|CAD|EUR|GBP|JPY|THB|VND|SGD)/.test(upper)) {
    return normalized;
  }

  if (normalized.includes('$')) {
    return `USD ${normalized}`;
  }
  if (normalized.includes('€')) {
    return `EUR ${normalized}`;
  }
  if (normalized.includes('£')) {
    return `GBP ${normalized}`;
  }
  if (normalized.includes('¥')) {
    return `JPY ${normalized}`;
  }

  const numeric = Number(normalized.replace(/,/g, ''));
  if (Number.isFinite(numeric)) {
    return `USD $${numeric.toFixed(2).replace(/\.00$/, '')}`;
  }

  return `${normalized} (currency)`;
}

function isActivityLike(activity: StopActivity): boolean {
  const haystack = [activity.name, activity.addressLabel, activity.refLabel]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /activit|adventure|class|tour|hike|workshop/.test(haystack);
}

function maybeExtractNotionUrl(notes?: string): string | undefined {
  if (!notes) {
    return undefined;
  }

  const match = notes.match(/https?:\/\/\S+/);
  return match?.[0];
}

function splitArrowValue(value?: string): { first?: string; second?: string } {
  if (!value) {
    return {};
  }
  const parts = value.split('→').map((part) => part.trim()).filter(Boolean);
  return { first: parts[0], second: parts[1] };
}

function parseRouteCodes(activity: StopActivity): { fromCode: string; toCode: string } {
  return {
    fromCode: activity.fromCode ?? '—',
    toCode: activity.toCode ?? activity.iataCode ?? '—',
  };
}

function toDateAndTimeParts(activity: StopActivity): { dateValue: string; timeValue?: string } {
  return {
    dateValue: activity.dateLabel || 'TBD',
    timeValue: activity.timeLabel,
  };
}

function parseFlightSegments(activity: StopActivity): {
  depDate: string;
  arrDate: string;
  depTime: string;
  arrTime: string;
} {
  const dateParts = splitArrowValue(activity.dateLabel);
  const timeParts = splitArrowValue(activity.timeLabel);

  return {
    depDate: dateParts.first ?? activity.dateLabel ?? 'TBD',
    arrDate: dateParts.second ?? dateParts.first ?? activity.dateLabel ?? 'TBD',
    depTime: timeParts.first ?? activity.timeLabel ?? 'TBD',
    arrTime: timeParts.second ?? timeParts.first ?? activity.timeLabel ?? 'TBD',
  };
}

type FlightLegSheetData = {
  key: string;
  fromCode: string;
  toCode: string;
  depDate: string;
  arrDate: string;
  depTime: string;
  arrTime: string;
  duration: string;
};

function getFocusedFlightLegIndex(activity: StopActivity): number {
  const match = activity.id.match(/-leg-(\d+)-(?:from|to)$/);
  if (!match) {
    return 0;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function buildFlightLegSheetData(trip: Trip, activity: StopActivity): {
  legs: FlightLegSheetData[];
  initialLegIndex: number;
} {
  const booking = trip.bookings.find((item) => item.id === activity.bookingId && item.type === 'flight');

  if (!booking || booking.legs.length === 0) {
    const route = parseRouteCodes(activity);
    const segment = parseFlightSegments(activity);
    return {
      legs: [
        {
          key: `${activity.id}-fallback`,
          fromCode: route.fromCode,
          toCode: route.toCode,
          depDate: segment.depDate,
          arrDate: segment.arrDate,
          depTime: segment.depTime,
          arrTime: segment.arrTime,
          duration: 'TBD',
        },
      ],
      initialLegIndex: 0,
    };
  }

  const legs = booking.legs.map((leg, index) => ({
    key: `${booking.id}-leg-${index}`,
    fromCode: leg.fromCode?.trim().toUpperCase() || '—',
    toCode: leg.toCode?.trim().toUpperCase() || '—',
    depDate: leg.departureDate || 'TBD',
    arrDate: leg.arrivalDate || leg.departureDate || 'TBD',
    depTime: leg.departureTime || 'TBD',
    arrTime: leg.arrivalTime || leg.departureTime || 'TBD',
    duration: leg.duration || 'TBD',
  }));

  const initialLegIndex = Math.min(getFocusedFlightLegIndex(activity), Math.max(0, legs.length - 1));
  return { legs, initialLegIndex };
}

function buildFlightChainLabel(legs: FlightLegSheetData[]): string {
  if (legs.length === 0) {
    return '— > —';
  }

  const chain: string[] = [];
  const firstFrom = legs[0]?.fromCode?.trim().toUpperCase();
  if (firstFrom) {
    chain.push(firstFrom);
  }

  legs.forEach((leg) => {
    const to = leg.toCode?.trim().toUpperCase();
    if (!to) {
      return;
    }
    if (chain[chain.length - 1] !== to) {
      chain.push(to);
    }
  });

  if (chain.length <= 1) {
    const fallbackTo = legs[0]?.toCode?.trim().toUpperCase() || '—';
    return `${chain[0] ?? '—'} > ${fallbackTo}`;
  }

  return chain.join(' > ');
}

function getCityFromLocation(location?: string): string | undefined {
  if (!location) {
    return undefined;
  }

  const normalizedLocation = normalizeLocationText(location) ?? location;
  const firstSegment = normalizedLocation.split(',')[0]?.trim();
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
    const priceLabel = withCurrencyLabel(maybeExtractPrice(booking.notes));

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
          fromCode: leg.fromCode,
          toCode: leg.toCode,
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
    const priceLabel = withCurrencyLabel(maybeExtractPrice(booking.notes));
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
    const priceLabel = withCurrencyLabel(maybeExtractPrice(booking.notes));

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
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [flightLegIndex, setFlightLegIndex] = useState(0);
  const [flightPagerWidth, setFlightPagerWidth] = useState(0);
  const sheetTranslate = useRef(new Animated.Value(0)).current;
  const flightPagerRef = useRef<ScrollView | null>(null);
  const hasInitializedSelectionRef = useRef(false);

  const sheetSnapOpen = 0;
  const sheetSnapClosed = 186;

  const animateSheetTo = (nextValue: number) => {
    Animated.spring(sheetTranslate, {
      toValue: nextValue,
      useNativeDriver: true,
      damping: 24,
      stiffness: 220,
      mass: 0.85,
    }).start();
  };

  const mapData = useMemo(() => (trip ? buildCombinedMapData(trip) : { pins: [], routeSegments: [] }), [trip]);

  const filteredMapData = useMemo<MapDataset>(() => {
    const pins = mapData.pins
      .map((pin) => {
        const activities = pin.activities.filter((activity) => matchesFilter(activity, activeFilter));
        if (activities.length === 0) {
          return null;
        }

        const status = activities.some((activity) => activity.status === 'booked') ? 'booked' : 'not_booked';
        return {
          ...pin,
          activities,
          status,
          variant: status === 'booked' ? 'confirmed' : 'idea',
        } as MapPin;
      })
      .filter((pin): pin is MapPin => Boolean(pin));

    const routeSegments =
      activeFilter === 'all' || activeFilter === 'flights'
        ? mapData.routeSegments
        : [];

    return { pins, routeSegments };
  }, [activeFilter, mapData.pins, mapData.routeSegments]);

  useEffect(() => {
    if (filteredMapData.pins.length === 0) {
      setSelectedPinId(null);
      return;
    }

    setSelectedPinId((previous) => {
      if (!previous) {
        if (!hasInitializedSelectionRef.current) {
          hasInitializedSelectionRef.current = true;
          return filteredMapData.pins[0]?.id ?? null;
        }
        return previous;
      }

      return filteredMapData.pins.some((pin) => pin.id === previous) ? previous : filteredMapData.pins[0]?.id ?? null;
    });
  }, [filteredMapData.pins]);

  const selectedPin = useMemo(() => {
    if (!selectedPinId) {
      return null;
    }

    return filteredMapData.pins.find((pin) => pin.id === selectedPinId) ?? null;
  }, [filteredMapData.pins, selectedPinId]);

  const focusedActivity = useMemo(() => {
    if (!selectedPin) {
      return null;
    }

    if (selectedActivityId) {
      const byId = selectedPin.activities.find((activity) => activity.id === selectedActivityId);
      if (byId) {
        return byId;
      }
    }

    return getDefaultActivityForPin(selectedPin);
  }, [selectedActivityId, selectedPin]);

  useEffect(() => {
    animateSheetTo(focusedActivity ? sheetSnapOpen : sheetSnapClosed);
  }, [focusedActivity?.id]);

  useEffect(() => {
    if (!selectedPin || selectedPin.activities.length === 0) {
      setSelectedActivityId(null);
      return;
    }

    setSelectedActivityId((previous) =>
      previous && selectedPin.activities.some((activity) => activity.id === previous)
        ? previous
        : getDefaultActivityForPin(selectedPin)?.id ?? null
    );
  }, [selectedPin]);

  const swipeActivities = useMemo(
    () => (focusedActivity ? getSwipeActivities(filteredMapData.pins, getSwipeGroup(focusedActivity)) : []),
    [filteredMapData.pins, focusedActivity?.id]
  );

  const activeSwipeIndex = useMemo(() => {
    if (!focusedActivity || swipeActivities.length === 0) {
      return 0;
    }
    const exact = swipeActivities.findIndex((activity) => activity.id === focusedActivity.id);
    if (exact >= 0) {
      return exact;
    }
    const normalizedFocused = focusedActivity.id.replace(/-(from|to)$/i, '');
    const byFlightPair = swipeActivities.findIndex(
      (activity) => activity.id.replace(/-(from|to)$/i, '') === normalizedFocused
    );
    return byFlightPair >= 0 ? byFlightPair : 0;
  }, [focusedActivity?.id, swipeActivities]);

  useEffect(() => {
    setFlightLegIndex(activeSwipeIndex);
  }, [activeSwipeIndex, focusedActivity?.id]);

  useEffect(() => {
    if (flightPagerWidth <= 0 || !flightPagerRef.current) {
      return;
    }
    const targetX = flightLegIndex * flightPagerWidth;
    flightPagerRef.current.scrollTo({ x: targetX, y: 0, animated: false });
  }, [flightLegIndex, flightPagerWidth, swipeActivities.length]);

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

  const openInMaps = (activity: StopActivity) => {
    const locationFallback = [activity.city, activity.country].filter(Boolean).join(', ');
    const query = normalizeLocationText(activity.addressLabel) ?? (locationFallback || activity.name);

    const encoded = encodeURIComponent(query);
    const appleUrl = `http://maps.apple.com/?q=${encoded}`;
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

    void Linking.openURL(appleUrl).catch(() => {
      void Linking.openURL(webUrl).catch(() => {});
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) => Math.abs(gestureState.dy) > 8,
        onPanResponderGrant: () => {},
        onPanResponderMove: () => {},
        onPanResponderRelease: () => {
          animateSheetTo(sheetSnapOpen);
        },
      }),
    [sheetTranslate]
  );

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
        pins={filteredMapData.pins}
        routeSegments={filteredMapData.routeSegments}
        selectedPinId={selectedPin?.id ?? null}
        focusedPin={selectedPin}
        focusedActivity={focusedActivity}
        onPinPress={(pin) => {
          setSelectedPinId(pin.id);
          setSelectedActivityId(getDefaultActivityForPin(pin)?.id ?? null);
          animateSheetTo(sheetSnapOpen);
        }}
        onMapPress={() => {
          setSelectedPinId(null);
          setSelectedActivityId(null);
          animateSheetTo(sheetSnapClosed);
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

            <Pressable
              onPress={() => navigation.navigate('Itinerary', { tripId: trip.id })}
              style={styles.itineraryButton}
            >
              <Text style={styles.itineraryButtonText}>≡</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTER_OPTIONS.map((option) => {
              const isActive = activeFilter === option.key;
              const tint = getFilterTint(option.key, isActive);
              return (
                <Pressable
                  key={option.key}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: tint.bg,
                      borderColor: tint.border,
                    },
                  ]}
                  onPress={() => setActiveFilter(option.key)}
                >
                  <Text style={[styles.filterChipText, { color: tint.text }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>

      <View style={styles.bottomOverlay} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY: sheetTranslate }],
            },
          ]}
        >
          <View {...panResponder.panHandlers}>
            <View style={styles.bottomSheetHandleWrap}>
              <View style={styles.bottomSheetHandle} />
            </View>
          </View>

          {focusedActivity ? (
            <View style={styles.sheetContent}>
              {(() => {
                const swipeGroup = getSwipeGroup(focusedActivity);
                const swipeActivities = getSwipeActivities(filteredMapData.pins, swipeGroup);
                const pages = swipeActivities.length > 0 ? swipeActivities : [focusedActivity];

                return (
                  <View
                    style={styles.flightPagerWrap}
                    onLayout={(event) => {
                      const measuredWidth = Math.round(event.nativeEvent.layout.width);
                      if (measuredWidth > 0 && measuredWidth !== flightPagerWidth) {
                        setFlightPagerWidth(measuredWidth);
                      }
                    }}
                  >
                    <ScrollView
                      ref={flightPagerRef}
                      horizontal={true}
                      pagingEnabled={true}
                      showsHorizontalScrollIndicator={false}
                      onMomentumScrollEnd={(event) => {
                        if (flightPagerWidth <= 0 || pages.length <= 1) {
                          return;
                        }

                        const nextIndex = Math.round(event.nativeEvent.contentOffset.x / flightPagerWidth);
                        const clamped = Math.max(0, Math.min(nextIndex, pages.length - 1));
                        if (clamped !== flightLegIndex) {
                          setFlightLegIndex(clamped);
                        }

                        const nextActivity = pages[clamped];
                        if (nextActivity) {
                          setSelectedActivityId(nextActivity.id);
                          const pinForActivity = filteredMapData.pins.find((pin) =>
                            pin.activities.some((activity) => activity.id === nextActivity.id)
                          );
                          if (pinForActivity && pinForActivity.id !== selectedPinId) {
                            setSelectedPinId(pinForActivity.id);
                          }
                        }
                      }}
                    >
                      {pages.map((pageActivity, pageIndex) => {
                        const experienceType = getExperienceType(pageActivity);
                        const isFlight = pageActivity.bookingType === 'flight';
                        const isHotel = pageActivity.bookingType === 'hotel';
                        const isSplitFlightBooking =
                          isFlight &&
                          pages.length > 1 &&
                          pages.every(
                            (candidate) =>
                              candidate.bookingType === 'flight' && candidate.bookingId === pageActivity.bookingId
                          );
                        const headerTagLabel = isFlight
                          ? isSplitFlightBooking
                            ? `Flight ${pageIndex + 1}/${pages.length}`
                            : 'Flight'
                          : isHotel
                            ? 'Hotel'
                            : getExperienceLabel(experienceType);
                        const headerTagStyle = isFlight
                          ? styles.headerTypeTagFlight
                          : isHotel
                            ? styles.headerTypeTagHotel
                            : experienceType === 'activities'
                              ? styles.headerTypeTagActivities
                              : experienceType === 'food'
                                ? styles.headerTypeTagFood
                                : styles.headerTypeTagSightseeing;
                        const headerTagTextStyle = isFlight
                          ? styles.headerTypeTagTextFlight
                          : isHotel
                            ? styles.headerTypeTagTextHotel
                            : experienceType === 'activities'
                              ? styles.headerTypeTagTextActivities
                              : experienceType === 'food'
                                ? styles.headerTypeTagTextFood
                                : styles.headerTypeTagTextSightseeing;
                        const hotelBooking = isHotel
                          ? trip.bookings.find((booking) => booking.id === pageActivity.bookingId && booking.type === 'hotel')
                          : undefined;
                        const checkOutDate = hotelBooking?.hotelStay?.checkOutDate ?? pageActivity.dateLabel ?? 'TBD';
                        const checkOutTime = hotelBooking?.hotelStay?.checkOutTime ?? pageActivity.timeLabel;
                        const flightData = isFlight ? buildFlightLegSheetData(trip, pageActivity) : null;
                        const flightLegs = flightData?.legs ?? [];
                        const firstFlightLeg = flightLegs[0] ?? null;
                        const lastFlightLeg = flightLegs[flightLegs.length - 1] ?? firstFlightLeg;
                        const flightChainLabel = buildFlightChainLabel(flightLegs);

                        return (
                          <View
                            key={pageActivity.id}
                            style={[
                              styles.flightLegPage,
                              flightPagerWidth > 0 ? { width: flightPagerWidth } : null,
                            ]}
                          >
                            <View style={styles.sheetHeader}>
                              <View
                                style={[
                                  styles.headerIconBadge,
                                  isFlight
                                    ? styles.headerIconBadgeFlight
                                    : isHotel
                                      ? styles.headerIconBadgeHotel
                                      : experienceType === 'activities'
                                        ? styles.headerIconBadgeActivities
                                        : experienceType === 'food'
                                          ? styles.headerIconBadgeFood
                                          : styles.headerIconBadgeSightseeing,
                                ]}
                              >
                                {isFlight ? (
                                  <SheetFlightBadgeIcon />
                                ) : isHotel ? (
                                  <SheetHotelBadgeIcon />
                                ) : experienceType === 'activities' ? (
                                  <SheetActivitiesBadgeIcon />
                                ) : experienceType === 'food' ? (
                                  <SheetFoodBadgeIcon />
                                ) : (
                                  <SheetSightseeingBadgeIcon />
                                )}
                              </View>

                              <View style={styles.headerTextBlock}>
                                <Text style={styles.headerTitle} numberOfLines={1}>
                                  {pageActivity.name}
                                </Text>
                                <Text style={styles.headerSubtitle} numberOfLines={1}>
                                  {isFlight
                                    ? `${flightChainLabel} · ${(firstFlightLeg?.depDate ?? pageActivity.dateLabel) || 'TBD'}`
                                    : isHotel
                                      ? [pageActivity.city, pageActivity.country].filter(Boolean).join(' · ') || 'Stay details'
                                      : [pageActivity.city, pageActivity.country].filter(Boolean).join(' · ') || 'Experience details'}
                                </Text>
                              </View>

                              <View style={[styles.headerTypeTag, headerTagStyle]}>
                                <Text style={[styles.headerTypeTagText, headerTagTextStyle]}>
                                  {headerTagLabel}
                                </Text>
                              </View>
                            </View>

                            {isFlight ? (
                              <View style={styles.sheetBody}>
                                <View style={styles.flightRouteRow}>
                                  <Text style={styles.flightCodeText} numberOfLines={1}>
                                    {firstFlightLeg?.fromCode ?? pageActivity.fromCode ?? '—'}
                                  </Text>
                                  <View style={styles.flightMidWrap}>
                                    <View style={styles.flightDivider} />
                                    <SheetPlaneRowIcon />
                                    <View style={styles.flightDivider} />
                                  </View>
                                  <Text style={styles.flightCodeText} numberOfLines={1}>
                                    {lastFlightLeg?.toCode ?? pageActivity.toCode ?? pageActivity.iataCode ?? '—'}
                                  </Text>
                                </View>
                                {flightLegs.length > 1 ? (
                                  <Text style={styles.flightChainSubLabel} numberOfLines={1}>
                                    {flightChainLabel}
                                  </Text>
                                ) : null}

                                <View style={styles.infoGrid}>
                                  <View style={styles.infoTile}>
                                    <Text style={styles.tileLabel}>Departs</Text>
                                    <Text style={styles.tileValue}>{firstFlightLeg?.depTime ?? parseFlightSegments(pageActivity).depTime}</Text>
                                    <Text style={styles.tileSubLabel}>{firstFlightLeg?.depDate ?? parseFlightSegments(pageActivity).depDate}</Text>
                                  </View>
                                  <View style={styles.infoTile}>
                                    <Text style={styles.tileLabel}>Arrives</Text>
                                    <Text style={styles.tileValue}>{lastFlightLeg?.arrTime ?? parseFlightSegments(pageActivity).arrTime}</Text>
                                    <Text style={styles.tileSubLabel}>{lastFlightLeg?.arrDate ?? parseFlightSegments(pageActivity).arrDate}</Text>
                                  </View>
                                  <View style={styles.infoTile}>
                                    <Text style={styles.tileLabel}>Duration</Text>
                                    <Text style={styles.tileValue}>{flightLegs.length > 1 ? `${flightLegs.length} legs` : firstFlightLeg?.duration ?? 'TBD'}</Text>
                                    <Text style={styles.tileSubLabel}>{flightLegs.length > 1 ? 'Connected' : 'Direct'}</Text>
                                  </View>
                                </View>
                              </View>
                            ) : isHotel ? (
                              <View style={styles.sheetBody}>
                                <View style={styles.infoGridTwo}>
                                  <View style={styles.infoTile}>
                                    <Text style={styles.tileLabel}>Check-in</Text>
                                    <Text style={styles.tileValue}>{toDateAndTimeParts(pageActivity).dateValue}</Text>
                                    <Text style={styles.tileSubLabel}>
                                      {toDateAndTimeParts(pageActivity).timeValue
                                        ? `from ${toDateAndTimeParts(pageActivity).timeValue}`
                                        : 'from TBD'}
                                    </Text>
                                  </View>
                                  <View style={styles.infoTile}>
                                    <Text style={styles.tileLabel}>Check-out</Text>
                                    <Text style={styles.tileValue}>{checkOutDate}</Text>
                                    <Text style={styles.tileSubLabel}>
                                      {checkOutTime
                                        ? `from ${checkOutTime}`
                                        : 'from TBD'}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            ) : (
                              <View style={styles.sheetBody}>
                                <View style={styles.infoGridTwo}>
                                  <View style={styles.infoTile}>
                                    <Text style={styles.tileLabel}>Type</Text>
                                    <Text style={styles.tileValue}>{getExperienceLabel(experienceType)}</Text>
                                    <Text style={styles.tileSubLabel}>
                                      {[pageActivity.city, pageActivity.country].filter(Boolean).join(', ') || 'Location TBD'}
                                    </Text>
                                  </View>
                                  <View style={styles.infoTile}>
                                    <Text style={styles.tileLabel}>Price</Text>
                                    <Text style={styles.tileValue}>{withCurrencyLabel(pageActivity.priceLabel) ?? 'Currency TBD'}</Text>
                                    <Text style={styles.tileSubLabel}>per person</Text>
                                  </View>
                                </View>
                              </View>
                            )}

                            <View style={styles.buttonRow}>
                              <Pressable style={styles.moreInfoButton} onPress={() => openActivityDetails(pageActivity)}>
                                <Text style={styles.moreInfoButtonText}>More info</Text>
                              </Pressable>
                              <Pressable
                                style={[
                                  styles.openMapsButton,
                                  isFlight
                                    ? styles.openMapsButtonFlight
                                    : isHotel
                                      ? styles.openMapsButtonHotel
                                      : experienceType === 'activities'
                                        ? styles.openMapsButtonActivities
                                        : experienceType === 'food'
                                          ? styles.openMapsButtonFood
                                          : styles.openMapsButtonSightseeing,
                                ]}
                                onPress={() => openInMaps(pageActivity)}
                              >
                                <Text style={styles.openMapsButtonText}>Open in Maps</Text>
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                );
              })()}
            </View>
          ) : (
            <View style={styles.bottomSheetEmptyWrap}>
              <Text style={styles.bottomSheetEmptyText}>Tap a pin to see details.</Text>
            </View>
          )}
        </Animated.View>
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
    paddingTop: 9,
    paddingBottom: 8,
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
  itineraryButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dce8df',
    borderWidth: 1,
    borderColor: 'rgba(30,61,47,0.2)',
  },
  itineraryButtonText: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 20,
    marginTop: -1,
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
  filterRow: {
    paddingTop: 8,
    paddingBottom: 2,
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 4,
  },
  bottomSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(12,24,44,0.12)',
    overflow: 'hidden',
    paddingBottom: 12,
  },
  bottomSheetHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D0D5DD',
  },
  sheetContent: {
    paddingHorizontal: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(12,24,44,0.14)',
  },
  headerIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBadgeFlight: {
    backgroundColor: '#EEEDFE',
  },
  headerIconBadgeHotel: {
    backgroundColor: '#E6F1FB',
  },
  headerIconBadgeSightseeing: {
    backgroundColor: '#FDECEC',
  },
  headerIconBadgeActivities: {
    backgroundColor: '#FFF4E8',
  },
  headerIconBadgeFood: {
    backgroundColor: '#ECF9F0',
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  headerTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '500',
  },
  headerSubtitle: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  headerTypeTag: {
    borderRadius: 7,
    paddingVertical: 4,
    paddingHorizontal: 9,
    marginTop: 2,
  },
  headerTypeTagFlight: {
    backgroundColor: '#EEEDFE',
  },
  headerTypeTagHotel: {
    backgroundColor: '#E6F1FB',
  },
  headerTypeTagSightseeing: {
    backgroundColor: '#FDECEC',
  },
  headerTypeTagActivities: {
    backgroundColor: '#FFF4E8',
  },
  headerTypeTagFood: {
    backgroundColor: '#ECF9F0',
  },
  headerTypeTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerTypeTagTextFlight: {
    color: '#3C3489',
  },
  headerTypeTagTextHotel: {
    color: '#0C447C',
  },
  headerTypeTagTextSightseeing: {
    color: '#B42318',
  },
  headerTypeTagTextActivities: {
    color: '#B54708',
  },
  headerTypeTagTextFood: {
    color: '#166534',
  },
  sheetBody: {
    paddingTop: 12,
  },
  flightRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  flightChainSubLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '400',
    marginTop: -2,
    marginBottom: 10,
    textAlign: 'center',
  },
  flightPagerWrap: {
    marginHorizontal: -2,
  },
  flightLegPage: {
    paddingHorizontal: 2,
  },
  flightCodeText: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '500',
    minWidth: 52,
    textAlign: 'center',
  },
  flightMidWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  flightDivider: {
    flex: 1,
    minWidth: 0,
    height: 0.5,
    backgroundColor: 'rgba(17,24,39,0.2)',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  infoGridTwo: {
    flexDirection: 'row',
    gap: 8,
  },
  infoTile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#F7F8FA',
    borderRadius: 11,
    padding: 10,
  },
  tileLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '400',
  },
  tileValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
  },
  tileSubLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '400',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  moreInfoButton: {
    flex: 1,
    minWidth: 0,
    borderRadius: 11,
    borderWidth: 0.5,
    borderColor: 'rgba(17,24,39,0.25)',
    backgroundColor: '#F7F8FA',
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreInfoButtonText: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '500',
  },
  openMapsButton: {
    flex: 1,
    minWidth: 0,
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openMapsButtonFlight: {
    backgroundColor: '#534AB7',
  },
  openMapsButtonHotel: {
    backgroundColor: '#185FA5',
  },
  openMapsButtonSightseeing: {
    backgroundColor: '#EA4335',
  },
  openMapsButtonActivities: {
    backgroundColor: '#FB8C00',
  },
  openMapsButtonFood: {
    backgroundColor: '#34A853',
  },
  openMapsButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  bottomSheetEmptyWrap: {
    minHeight: 124,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetEmptyText: {
    color: '#4d6d5d',
    fontSize: 13,
    fontWeight: '600',
  },
});
