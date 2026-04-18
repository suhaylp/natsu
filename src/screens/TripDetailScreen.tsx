import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import Svg, { Path } from 'react-native-svg';
import { TripMap } from '../components/tripOverview/TripMap';
import { useTripsData } from '../data/TripsDataContext';
import type { Booking, BookingType, Trip } from '../data/trips';
import { normalizeLocationText } from '../lib/locationText';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { MapPin, RouteSegment, StopActivity } from '../components/tripOverview/types';
import { ItineraryScreen } from './ItineraryScreen';

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
  allowAirportCodeFallback?: boolean;
  allowCityFallback?: boolean;
}): Coordinates | null {
  const allowAirportCodeFallback = options.allowAirportCodeFallback ?? true;
  const allowCityFallback = options.allowCityFallback ?? true;

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
  if (allowAirportCodeFallback && code && airportCoordinates[code]) {
    return airportCoordinates[code];
  }

  const directCoordinate = parseCoordinatesFromText(options.location);
  if (directCoordinate) {
    return directCoordinate;
  }

  if (!allowCityFallback) {
    return null;
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
    const locationCoords = resolveCoordinates({
      city: locationCity,
      location: addressLabel,
      latitude: booking.latitude,
      longitude: booking.longitude,
      allowAirportCodeFallback: false,
      allowCityFallback: false,
    });

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
    const coordinates = resolveCoordinates({
      city,
      location: addressLabel,
      latitude: booking.latitude,
      longitude: booking.longitude,
      allowAirportCodeFallback: false,
      allowCityFallback: false,
    });
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


type TripDetailTabKey = 'overview' | 'map' | 'itinerary' | 'currency' | 'docs';
type EmbeddedItineraryFilter = 'all-types' | 'flights' | 'hotels' | 'sightseeing' | 'activities' | 'food';

type ExchangeRatesPayload = {
  result?: string;
  rates?: Record<string, number>;
};

type ExchangeRateCacheEntry = {
  fetchedAt: number;
  rates: Record<string, number>;
};

type OverviewFlight = {
  booking: Booking;
  departureDate: Date | null;
  departureDateLabel: string;
  departureTimeLabel: string;
  routeLabel: string;
};

type OverviewHotel = {
  booking: Booking;
  checkInDate: Date | null;
  checkInLabel: string;
  locationLabel: string;
};

type DocItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
};

const monthLabelToIndex: Record<string, number> = {
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

const detailTabs: Array<{ key: TripDetailTabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'map', label: 'Map' },
  { key: 'itinerary', label: 'Itinerary' },
  { key: 'currency', label: 'Currency' },
  { key: 'docs', label: 'Docs' },
];

const countryToCurrency: Record<string, string> = {
  Canada: 'CAD',
  Japan: 'JPY',
  Singapore: 'SGD',
  Thailand: 'THB',
  Vietnam: 'VND',
  'United States': 'USD',
};

const currencyNames: Record<string, string> = {
  CAD: 'Canadian Dollar',
  JPY: 'Japanese Yen',
  SGD: 'Singapore Dollar',
  THB: 'Thai Baht',
  VND: 'Vietnamese Dong',
  USD: 'US Dollar',
};

const exchangeRateCache = new Map<string, ExchangeRateCacheEntry>();

const design = {
  backgroundGradient: ['#c8e6d4', '#a8d4bc', '#b8dcc8'] as const,
  screenTitle: '#0f2d1e',
  bodyText: '#1a4a33',
  mutedText: '#3a6b52',
  border: 'rgba(255,255,255,0.7)',
  borderSoft: 'rgba(255,255,255,0.6)',
  glass: 'rgba(255,255,255,0.45)',
  glassStrong: 'rgba(255,255,255,0.55)',
  flight: '#534AB7',
  hotel: '#185FA5',
  activity: '#1D9E75',
  docs: '#BA7517',
};

function parseMonthDayLabel(dateLabel?: string): { month: number; day: number } | null {
  if (!dateLabel) {
    return null;
  }

  const match = dateLabel.trim().match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
  if (!match?.[1] || !match[2]) {
    return null;
  }

  const month = monthLabelToIndex[match[1]];
  const day = Number(match[2]);

  if (month === undefined || Number.isNaN(day)) {
    return null;
  }

  return { month, day };
}

function parseDateRangeYear(dateRange: string): number {
  const yearMatches = dateRange.match(/\b(20\d{2})\b/g);
  if (yearMatches && yearMatches.length > 0) {
    return Number(yearMatches[yearMatches.length - 1]);
  }
  return new Date().getFullYear();
}

function parseTripDateLabel(dateLabel: string | undefined, tripYear: number): Date | null {
  const parsedMonthDay = parseMonthDayLabel(dateLabel);
  if (!parsedMonthDay) {
    return null;
  }

  const parsed = new Date(tripYear, parsedMonthDay.month, parsedMonthDay.day);
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function parseTripRangeBounds(dateRange: string): { start: Date; end: Date } | null {
  const sameMonthMatch = dateRange.match(/^([A-Za-z]{3})\s+(\d{1,2})\s*[–-]\s*(\d{1,2}),\s*(\d{4})$/);
  if (sameMonthMatch?.[1] && sameMonthMatch[2] && sameMonthMatch[3] && sameMonthMatch[4]) {
    const month = monthLabelToIndex[sameMonthMatch[1]];
    const startDay = Number(sameMonthMatch[2]);
    const endDay = Number(sameMonthMatch[3]);
    const year = Number(sameMonthMatch[4]);
    if (month === undefined || Number.isNaN(startDay) || Number.isNaN(endDay) || Number.isNaN(year)) {
      return null;
    }

    const start = new Date(year, month, startDay);
    const end = new Date(year, month, endDay);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return { start, end };
  }

  const crossMonthMatch = dateRange.match(/^([A-Za-z]{3})\s+(\d{1,2})\s*[–-]\s*([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/);
  if (crossMonthMatch?.[1] && crossMonthMatch[2] && crossMonthMatch[3] && crossMonthMatch[4] && crossMonthMatch[5]) {
    const startMonth = monthLabelToIndex[crossMonthMatch[1]];
    const startDay = Number(crossMonthMatch[2]);
    const endMonth = monthLabelToIndex[crossMonthMatch[3]];
    const endDay = Number(crossMonthMatch[4]);
    const year = Number(crossMonthMatch[5]);

    if (
      startMonth === undefined ||
      endMonth === undefined ||
      Number.isNaN(startDay) ||
      Number.isNaN(endDay) ||
      Number.isNaN(year)
    ) {
      return null;
    }

    const start = new Date(year, startMonth, startDay);
    const end = new Date(year, endMonth, endDay);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return { start, end };
  }

  return null;
}

function buildTripHeaderSubtitle(trip: Trip): string {
  const bounds = parseTripRangeBounds(trip.dateRange);
  if (!bounds) {
    return trip.dateRange;
  }

  const dayCount = Math.floor((bounds.end.getTime() - bounds.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return `${trip.dateRange} · ${dayCount} ${dayCount === 1 ? 'day' : 'days'}`;
}

function getDaysFromToday(date: Date | null): number | null {
  if (!date) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function buildFlightRouteLabel(booking: Booking): string {
  if (booking.legs.length === 0) {
    return booking.label;
  }

  const chain: string[] = [];
  const firstFrom = booking.legs[0]?.fromCode?.trim().toUpperCase();
  if (firstFrom) {
    chain.push(firstFrom);
  }

  booking.legs.forEach((leg) => {
    const toCode = leg.toCode?.trim().toUpperCase();
    if (!toCode) {
      return;
    }
    if (chain[chain.length - 1] !== toCode) {
      chain.push(toCode);
    }
  });

  return chain.length > 0 ? chain.join(' → ') : booking.label;
}

function buildOverviewFlights(trip: Trip): OverviewFlight[] {
  const tripYear = parseDateRangeYear(trip.dateRange);

  return trip.bookings
    .filter((booking) => booking.type === 'flight')
    .map((booking) => {
      const firstLeg = booking.legs[0];
      const departureDateLabel = firstLeg?.departureDate ?? 'TBD';
      const departureDate = parseTripDateLabel(firstLeg?.departureDate, tripYear);
      const departureTimeLabel = firstLeg?.departureTime ?? 'TBD';
      const routeLabel = buildFlightRouteLabel(booking);

      return {
        booking,
        departureDate,
        departureDateLabel,
        departureTimeLabel,
        routeLabel,
      };
    })
    .sort((a, b) => {
      const aTime = a.departureDate?.getTime() ?? Number.POSITIVE_INFINITY;
      const bTime = b.departureDate?.getTime() ?? Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
}

function buildOverviewHotels(trip: Trip): OverviewHotel[] {
  const tripYear = parseDateRangeYear(trip.dateRange);

  return trip.bookings
    .filter((booking) => booking.type === 'hotel')
    .map((booking) => {
      const checkInLabel = booking.hotelStay?.checkInDate ?? booking.activityDate ?? 'TBD';
      const checkInDate = parseTripDateLabel(checkInLabel, tripYear);
      const locationLabel = booking.hotelStay?.city ?? getCityFromLocation(booking.activityLocation) ?? trip.title;

      return {
        booking,
        checkInDate,
        checkInLabel,
        locationLabel,
      };
    })
    .sort((a, b) => {
      const aTime = a.checkInDate?.getTime() ?? Number.POSITIVE_INFINITY;
      const bTime = b.checkInDate?.getTime() ?? Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
}

function collectCountriesInTripOrder(mapData: MapDataset): string[] {
  const allActivities = mapData.pins
    .flatMap((pin) => pin.activities)
    .slice()
    .sort((a, b) => a.order - b.order);

  const seen = new Set<string>();
  const ordered: string[] = [];

  allActivities.forEach((activity) => {
    const country = activity.country?.trim();
    if (!country) {
      return;
    }

    const normalized = country.toLowerCase();
    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    ordered.push(country);
  });

  return ordered;
}

function collectDestinationCurrencies(countries: string[]): string[] {
  const seen = new Set<string>();
  const currencies: string[] = [];

  countries.forEach((country) => {
    const currency = countryToCurrency[country];
    if (!currency || currency === 'CAD' || seen.has(currency)) {
      return;
    }

    seen.add(currency);
    currencies.push(currency);
  });

  return currencies;
}

function formatCurrencyAmount(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: currencyCode === 'JPY' || currencyCode === 'VND' ? 0 : 2,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

function minutesSince(timestamp: number): number {
  return Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60)));
}

function categoryToneForActivity(activity: StopActivity): { label: string; bg: string; text: string } {
  if (activity.bookingType === 'flight') {
    return { label: 'Flight', bg: '#EEEDFE', text: '#3C3489' };
  }

  if (activity.bookingType === 'hotel') {
    return { label: 'Hotel', bg: '#E6F1FB', text: '#0C447C' };
  }

  const experience = getExperienceType(activity);
  if (experience === 'food') {
    return { label: 'Food', bg: '#FAECE7', text: '#4A1B0C' };
  }
  if (experience === 'activities') {
    return { label: 'Activities', bg: '#E1F5EE', text: '#085041' };
  }

  return { label: 'Sightseeing', bg: '#E1F5EE', text: '#085041' };
}

function buildDocsList(trip: Trip, countries: string[]): DocItem[] {
  const destinationCountries = countries.filter((country) => country.toLowerCase() !== 'canada');
  const eVisaDocs = destinationCountries.map((country) => ({
    id: `visa-${country.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    title: `${country} e-visa`,
    subtitle: 'Linked travel authorization',
    icon: '📄',
  }));

  const flightCount = trip.bookings.filter((booking) => booking.type === 'flight').length;
  const hotelCount = trip.bookings.filter((booking) => booking.type === 'hotel').length;

  return [
    {
      id: 'passport',
      title: 'Passport',
      subtitle: 'Expiry check recommended',
      icon: '🛂',
    },
    ...eVisaDocs,
    {
      id: 'insurance',
      title: 'Travel insurance',
      subtitle: 'Policy details attached',
      icon: '🛡️',
    },
    {
      id: 'bookings',
      title: 'Booking confirmations',
      subtitle: `${flightCount} flights · ${hotelCount} hotels`,
      icon: '📁',
    },
  ];
}

function FrostedSurface({
  children,
  style,
  tint = design.glass,
}: {
  children?: ReactNode;
  style?: object;
  tint?: string;
}) {
  return (
    <View style={[style, { overflow: 'hidden' }]}> 
      <BlurView intensity={32} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      {children}
    </View>
  );
}

function ChevronLeftIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18L9 12L15 6" stroke="#0f2d1e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRightIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18L15 12L9 6" stroke="#0f2d1e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function OverviewPlaneIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
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

function OverviewHotelIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 20V9.6C3 9.2 3.2 8.8 3.5 8.6L11.4 2.9C11.8 2.6 12.3 2.6 12.7 2.9L20.5 8.6C20.8 8.8 21 9.2 21 9.6V20H16V14.6C16 14 15.6 13.5 15 13.5H9C8.4 13.5 8 14 8 14.6V20H3Z"
        stroke="#185FA5"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function OverviewGlobeIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2.5C17.2 2.5 21.5 6.8 21.5 12C21.5 17.2 17.2 21.5 12 21.5C6.8 21.5 2.5 17.2 2.5 12C2.5 6.8 6.8 2.5 12 2.5Z" stroke="#1D9E75" strokeWidth={1.8} />
      <Path d="M2.8 12H21.2" stroke="#1D9E75" strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M12 2.8C14.4 5.2 15.8 8.5 15.8 12C15.8 15.5 14.4 18.8 12 21.2" stroke="#1D9E75" strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M12 2.8C9.6 5.2 8.2 8.5 8.2 12C8.2 15.5 9.6 18.8 12 21.2" stroke="#1D9E75" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function OverviewDocIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M7 3.5H13.5L18 8V20.5H7V3.5Z" stroke="#BA7517" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.5 3.5V8H18" stroke="#BA7517" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9.8 12H15.2" stroke="#BA7517" strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M9.8 15.5H13.8" stroke="#BA7517" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function TileActionArrow({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tileArrowButton, pressed ? styles.pressScale : null]}>
      <FrostedSurface style={styles.tileArrowInner} tint={design.glassStrong}>
        <ChevronRightIcon />
      </FrostedSurface>
    </Pressable>
  );
}

function OverviewTabContent(props: {
  trip: Trip;
  mapData: MapDataset;
  destinationCurrencies: string[];
  destinationCountries: string[];
  docsCount: number;
  onOpenMap: () => void;
  onOpenCurrency: () => void;
  onOpenDocs: () => void;
  onOpenItineraryFlights: () => void;
  onOpenItineraryHotels: () => void;
}) {
  const overviewFlights = useMemo(() => buildOverviewFlights(props.trip), [props.trip]);
  const overviewHotels = useMemo(() => buildOverviewHotels(props.trip), [props.trip]);

  const nextFlight = useMemo(() => {
    if (overviewFlights.length === 0) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return overviewFlights.find((flight) => flight.departureDate && flight.departureDate.getTime() >= today.getTime()) ?? overviewFlights[0];
  }, [overviewFlights]);

  const firstHotel = overviewHotels[0] ?? null;
  const mapCountryCount = props.destinationCountries.length;

  return (
    <ScrollView
      style={styles.tabScroll}
      contentContainerStyle={styles.overviewScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={props.onOpenItineraryFlights} style={({ pressed }) => [styles.tilePressWrap, pressed ? styles.pressScale : null]}>
        <FrostedSurface style={styles.overviewTile}>
          <View style={styles.tileMainRow}>
            <View style={[styles.tileBadge, { backgroundColor: 'rgba(83,74,183,0.12)' }]}> 
              <OverviewPlaneIcon />
            </View>

            <View style={styles.tileBody}>
              <Text style={styles.tileTitle}>
                {nextFlight ? `Next flight in ${Math.max(0, getDaysFromToday(nextFlight.departureDate) ?? 0)} days` : 'No flights booked yet'}
              </Text>
              <Text style={styles.tileSubtitle} numberOfLines={1}>
                {nextFlight
                  ? `${nextFlight.routeLabel} · ${nextFlight.departureDateLabel} ${nextFlight.departureTimeLabel}`
                  : 'Add a flight to see it here'}
              </Text>
            </View>

            <TileActionArrow onPress={props.onOpenItineraryFlights} />
          </View>
        </FrostedSurface>
      </Pressable>

      <Pressable onPress={props.onOpenItineraryHotels} style={({ pressed }) => [styles.tilePressWrap, pressed ? styles.pressScale : null]}>
        <FrostedSurface style={styles.overviewTile}>
          <View style={styles.tileMainRow}>
            <View style={[styles.tileBadge, { backgroundColor: 'rgba(24,95,165,0.12)' }]}> 
              <OverviewHotelIcon />
            </View>

            <View style={styles.tileBody}>
              <Text style={styles.tileTitle}>{firstHotel ? 'First hotel stay' : 'No hotels booked yet'}</Text>
              <Text style={styles.tileSubtitle} numberOfLines={1}>
                {firstHotel
                  ? `${firstHotel.booking.hotelStay?.name ?? firstHotel.booking.label} · ${firstHotel.locationLabel} · ${firstHotel.checkInLabel}`
                  : 'Add accommodation to see it here'}
              </Text>
            </View>

            <TileActionArrow onPress={props.onOpenItineraryHotels} />
          </View>
        </FrostedSurface>
      </Pressable>

      <Pressable onPress={props.onOpenCurrency} style={({ pressed }) => [styles.tilePressWrap, pressed ? styles.pressScale : null]}>
        <FrostedSurface style={styles.overviewTile}>
          <View style={styles.currencyTileHeader}>
            <Text style={styles.currencyTileLabel}>Currency converter</Text>
            <Text style={styles.currencyTileMeta}>{`${props.destinationCurrencies.length} currencies`}</Text>
          </View>

          <View style={styles.currencyPreviewRow}>
            <FrostedSurface style={styles.currencyPreviewBox} tint="rgba(255,255,255,0.6)">
              <Text style={styles.currencyCode}>CAD</Text>
              <Text style={styles.currencyAmount}>1.00</Text>
            </FrostedSurface>

            {props.destinationCurrencies.slice(0, 3).map((currency) => (
              <View key={`overview-currency-${currency}`} style={styles.currencyPreviewPair}>
                <Text style={styles.currencyArrow}>→</Text>
                <FrostedSurface style={styles.currencyPreviewBox} tint="rgba(255,255,255,0.6)">
                  <Text style={styles.currencyCode}>{currency}</Text>
                  <Text style={styles.currencyAmount}>...</Text>
                </FrostedSurface>
              </View>
            ))}
          </View>
        </FrostedSurface>
      </Pressable>

      <Pressable onPress={props.onOpenMap} style={({ pressed }) => [styles.tilePressWrap, pressed ? styles.pressScale : null]}>
        <FrostedSurface style={styles.overviewTile}>
          <View style={styles.tileMainRow}>
            <View style={[styles.tileBadge, { backgroundColor: 'rgba(29,158,117,0.12)' }]}> 
              <OverviewGlobeIcon />
            </View>

            <View style={styles.tileBody}>
              <Text style={styles.tileTitle}>Trip map</Text>
              <Text style={styles.tileSubtitle}>{`${mapCountryCount} countries · ${props.mapData.pins.length} pins`}</Text>
            </View>

            <TileActionArrow onPress={props.onOpenMap} />
          </View>
        </FrostedSurface>
      </Pressable>

      <Pressable onPress={props.onOpenDocs} style={({ pressed }) => [styles.tilePressWrap, pressed ? styles.pressScale : null]}>
        <FrostedSurface style={styles.overviewTile}>
          <View style={styles.tileMainRow}>
            <View style={[styles.tileBadge, { backgroundColor: 'rgba(186,117,23,0.12)' }]}> 
              <OverviewDocIcon />
            </View>

            <View style={styles.tileBody}>
              <Text style={styles.tileTitle}>Docs & visas</Text>
              <Text style={styles.tileSubtitle}>{`Passport · ${props.docsCount} e-visas`}</Text>
            </View>

            <TileActionArrow onPress={props.onOpenDocs} />
          </View>
        </FrostedSurface>
      </Pressable>
    </ScrollView>
  );
}

function MapTabContent(props: {
  trip: Trip;
  navigation: Props['navigation'];
  fullScreen?: boolean;
}) {
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const mapData = useMemo(() => buildCombinedMapData(props.trip), [props.trip]);

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

    const routeSegments = activeFilter === 'all' || activeFilter === 'flights' ? mapData.routeSegments : [];

    return { pins, routeSegments };
  }, [activeFilter, mapData.pins, mapData.routeSegments]);

  useEffect(() => {
    if (!selectedPinId) {
      return;
    }

    const selectedPinStillVisible = filteredMapData.pins.some((pin) => pin.id === selectedPinId);
    if (!selectedPinStillVisible) {
      setSelectedPinId(null);
      setSelectedActivityId(null);
    }
  }, [filteredMapData.pins, selectedPinId]);

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

  const openActivityDetails = (activity: StopActivity) => {
    if (activity.bookingType === 'flight') {
      props.navigation.navigate('FlightDetail', {
        tripId: props.trip.id,
        flightId: activity.bookingId,
      });
      return;
    }

    if (activity.bookingType === 'hotel') {
      props.navigation.navigate('HotelDetail', {
        tripId: props.trip.id,
        bookingId: activity.bookingId,
      });
      return;
    }

    props.navigation.navigate('EventDetail', {
      tripId: props.trip.id,
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

  return (
    <View style={[styles.mapTabRoot, props.fullScreen ? styles.mapTabRootFullScreen : null]}>
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.mapFilterRow, props.fullScreen ? styles.mapFilterRowFullScreen : null]}
      >
        {FILTER_OPTIONS.map((option) => {
          const active = activeFilter === option.key;
          const tint = getFilterTint(option.key, active);

          return (
            <Pressable
              key={`map-filter-${option.key}`}
              onPress={() => setActiveFilter(option.key)}
              style={({ pressed }) => [styles.mapFilterPress, pressed ? styles.pressScale : null]}
            >
              <FrostedSurface
                style={[
                  styles.mapFilterChip,
                  {
                    backgroundColor: tint.bg,
                    borderColor: active ? tint.text : tint.border,
                  },
                ]}
                tint={active ? tint.bg : 'rgba(255,255,255,0.35)'}
              >
                <Text style={[styles.mapFilterText, { color: tint.text }]}>{option.label}</Text>
              </FrostedSurface>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.mapPaneWrap, props.fullScreen ? styles.mapPaneWrapFullScreen : null]}>
        <TripMap
          pins={filteredMapData.pins}
          routeSegments={filteredMapData.routeSegments}
          selectedPinId={selectedPin?.id ?? null}
          focusedPin={selectedPin}
          focusedActivity={focusedActivity}
          onPinPress={(pin) => {
            setSelectedPinId(pin.id);
            setSelectedActivityId(getDefaultActivityForPin(pin)?.id ?? null);
          }}
          onMapPress={() => {
            setSelectedPinId(null);
            setSelectedActivityId(null);
          }}
        />

        {focusedActivity ? (
          <View style={styles.mapDetailOverlay} pointerEvents="box-none">
            <FrostedSurface style={styles.mapDetailCard} tint="rgba(255,255,255,0.55)">
              <View style={styles.mapDetailHeaderRow}>
                <View style={styles.mapDetailTextWrap}>
                  <Text style={styles.mapDetailTitle} numberOfLines={1}>
                    {focusedActivity.name}
                  </Text>
                  <Text style={styles.mapDetailSubtitle} numberOfLines={1}>
                    {[focusedActivity.city, focusedActivity.country].filter(Boolean).join(' · ')}
                  </Text>
                </View>

                {(() => {
                  const tone = categoryToneForActivity(focusedActivity);
                  return (
                    <View style={[styles.mapCategoryTag, { backgroundColor: tone.bg }]}> 
                      <Text style={[styles.mapCategoryTagText, { color: tone.text }]}>{tone.label}</Text>
                    </View>
                  );
                })()}
              </View>

              {selectedPin && selectedPin.activities.length > 1 ? (
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapActivitySwitchRow}>
                  {selectedPin.activities.map((activity) => {
                    const isActive = focusedActivity.id === activity.id;
                    return (
                      <Pressable
                        key={`activity-select-${activity.id}`}
                        onPress={() => setSelectedActivityId(activity.id)}
                        style={({ pressed }) => [styles.mapActivityChipPress, pressed ? styles.pressScale : null]}
                      >
                        <FrostedSurface
                          style={[
                            styles.mapActivityChip,
                            isActive ? styles.mapActivityChipActive : styles.mapActivityChipInactive,
                          ]}
                          tint={isActive ? 'rgba(15,45,30,0.85)' : 'rgba(255,255,255,0.6)'}
                        >
                          <Text style={[styles.mapActivityChipText, isActive ? styles.mapActivityChipTextActive : null]} numberOfLines={1}>
                            {activity.name}
                          </Text>
                        </FrostedSurface>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}

              <View style={styles.mapActionRow}>
                <Pressable onPress={() => openActivityDetails(focusedActivity)} style={({ pressed }) => [styles.mapActionPress, pressed ? styles.pressScale : null]}>
                  <FrostedSurface style={styles.mapActionSecondary} tint="rgba(255,255,255,0.62)">
                    <Text style={styles.mapActionSecondaryText}>Details</Text>
                  </FrostedSurface>
                </Pressable>

                <Pressable onPress={() => openInMaps(focusedActivity)} style={({ pressed }) => [styles.mapActionPress, pressed ? styles.pressScale : null]}>
                  <FrostedSurface style={styles.mapActionPrimary} tint="rgba(15,45,30,0.82)">
                    <Text style={styles.mapActionPrimaryText}>Open Maps</Text>
                  </FrostedSurface>
                </Pressable>
              </View>
            </FrostedSurface>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function CurrencyTabContent(props: {
  destinationCurrencies: string[];
  baseAmountInput: string;
  onBaseAmountChange: (value: string) => void;
  ratesLoading: boolean;
  ratesError: string | null;
  rates: Record<string, number> | null;
  ratesFetchedAt: number | null;
  onRetry: () => void;
}) {
  const parsedBaseAmount = Number.parseFloat(props.baseAmountInput);
  const baseAmount = Number.isFinite(parsedBaseAmount) ? parsedBaseAmount : 0;

  return (
    <ScrollView style={styles.tabScroll} contentContainerStyle={styles.currencyScrollContent} showsVerticalScrollIndicator={false}>
      <FrostedSurface style={styles.currencyInputTile}>
        <Text style={styles.currencyInputLabel}>Base amount (CAD)</Text>
        <TextInput
          value={props.baseAmountInput}
          onChangeText={props.onBaseAmountChange}
          keyboardType="decimal-pad"
          style={styles.currencyInput}
          placeholder="1.00"
          placeholderTextColor="rgba(58,107,82,0.6)"
        />
        <Text style={styles.currencyUpdatedLabel}>
          {props.ratesFetchedAt
            ? `Last updated ${minutesSince(props.ratesFetchedAt)} min ago`
            : props.ratesLoading
              ? 'Fetching latest rates...'
              : 'Rates unavailable'}
        </Text>
      </FrostedSurface>

      {props.ratesError ? (
        <Pressable onPress={props.onRetry} style={({ pressed }) => [styles.tilePressWrap, pressed ? styles.pressScale : null]}>
          <FrostedSurface style={styles.currencyErrorTile} tint="rgba(255,245,245,0.75)">
            <Text style={styles.currencyErrorText}>Couldn't load exchange rates — tap to retry</Text>
          </FrostedSurface>
        </Pressable>
      ) : null}

      {props.destinationCurrencies.map((currencyCode) => {
        const rate = props.rates?.[currencyCode];
        const convertedValue = rate ? baseAmount * rate : null;
        return (
          <FrostedSurface key={`currency-row-${currencyCode}`} style={styles.currencyResultTile}>
            <View style={styles.currencyResultTopRow}>
              <Text style={styles.currencyResultCode}>{currencyCode}</Text>
              <Text style={styles.currencyResultName}>{currencyNames[currencyCode] ?? 'Currency'}</Text>
            </View>
            <Text style={styles.currencyResultAmount}>
              {convertedValue !== null ? formatCurrencyAmount(convertedValue, currencyCode) : 'Unavailable'}
            </Text>
          </FrostedSurface>
        );
      })}
    </ScrollView>
  );
}

function DocsTabContent({ docs }: { docs: DocItem[] }) {
  return (
    <ScrollView style={styles.tabScroll} contentContainerStyle={styles.docsScrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.docsHeaderRow}>
        <Text style={styles.docsHeaderTitle}>Travel docs</Text>
        <Pressable style={({ pressed }) => [styles.docsAddPress, pressed ? styles.pressScale : null]}>
          <FrostedSurface style={styles.docsAddButton}>
            <Text style={styles.docsAddText}>+</Text>
          </FrostedSurface>
        </Pressable>
      </View>

      {docs.map((doc) => (
        <FrostedSurface key={doc.id} style={styles.docTile}>
          <View style={styles.docIconWrap}>
            <Text style={styles.docIcon}>{doc.icon}</Text>
          </View>
          <View style={styles.docTextWrap}>
            <Text style={styles.docTitle}>{doc.title}</Text>
            <Text style={styles.docSubtitle}>{doc.subtitle}</Text>
          </View>
        </FrostedSurface>
      ))}
    </ScrollView>
  );
}

export function TripDetailScreen({ navigation, route }: Props) {
  const { trips, isLoading } = useTripsData();
  const trip = trips.find((item) => item.id === route.params.tripId);

  const [activeTab, setActiveTab] = useState<TripDetailTabKey>('overview');
  const [itineraryInitialType, setItineraryInitialType] = useState<EmbeddedItineraryFilter>('all-types');
  const [baseAmountInput, setBaseAmountInput] = useState('1');
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [ratesFetchedAt, setRatesFetchedAt] = useState<number | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const tabContentOpacity = useRef(new Animated.Value(1)).current;

  const mapData = useMemo(() => (trip ? buildCombinedMapData(trip) : { pins: [], routeSegments: [] }), [trip]);

  const destinationCountries = useMemo(() => collectCountriesInTripOrder(mapData), [mapData]);
  const destinationCurrencies = useMemo(() => collectDestinationCurrencies(destinationCountries), [destinationCountries]);
  const docs = useMemo(() => (trip ? buildDocsList(trip, destinationCountries) : []), [destinationCountries, trip]);
  const docsCount = useMemo(
    () => docs.filter((doc) => doc.id.startsWith('visa-')).length,
    [docs]
  );

  const tripSubtitle = useMemo(() => (trip ? buildTripHeaderSubtitle(trip) : ''), [trip]);
  const activeTabLabel = useMemo(() => detailTabs.find((tab) => tab.key === activeTab)?.label ?? '', [activeTab]);
  const showingFullScreenTab = activeTab !== 'overview';

  const animateTabSwitch = (nextTab: TripDetailTabKey) => {
    if (nextTab === activeTab) {
      return;
    }

    Animated.timing(tabContentOpacity, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(nextTab);
      Animated.timing(tabContentOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    });
  };

  const fetchExchangeRates = async (force = false) => {
    const cacheKey = 'CAD';
    const cached = exchangeRateCache.get(cacheKey);

    if (!force && cached && Date.now() - cached.fetchedAt < 30 * 60 * 1000) {
      setRates(cached.rates);
      setRatesFetchedAt(cached.fetchedAt);
      setRatesError(null);
      return;
    }

    setRatesLoading(true);
    setRatesError(null);

    try {
      const response = await fetch('https://open.er-api.com/v6/latest/CAD');
      const payload = (await response.json()) as ExchangeRatesPayload;

      if (!response.ok || payload.result === 'error' || !payload.rates) {
        throw new Error('Exchange rate fetch failed');
      }

      exchangeRateCache.set(cacheKey, {
        fetchedAt: Date.now(),
        rates: payload.rates,
      });

      setRates(payload.rates);
      setRatesFetchedAt(Date.now());
      setRatesError(null);
    } catch {
      setRatesError('Could not fetch exchange rates');
    } finally {
      setRatesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'currency') {
      void fetchExchangeRates(false);
    }
  }, [activeTab]);

  if (!trip) {
    return (
      <View style={styles.screenRoot}>
        <LinearGradient
          colors={design.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <StatusBar style="dark" />
        <SafeAreaView style={styles.fallbackCenter}>
          <Text style={styles.fallbackTitle}>{isLoading ? 'Loading trip...' : 'Trip not found'}</Text>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.fallbackBackPress, pressed ? styles.pressScale : null]}>
            <FrostedSurface style={styles.fallbackBackButton}>
              <Text style={styles.fallbackBackText}>Back</Text>
            </FrostedSurface>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screenRoot}>
      <LinearGradient
        colors={design.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <StatusBar style="dark" />

      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top', 'bottom']}>
        {showingFullScreenTab ? (
          <Animated.View style={[styles.fullScreenTabShell, { opacity: tabContentOpacity }]}>
            <View style={styles.fullScreenTabTopBar}>
              <Pressable
                onPress={() => animateTabSwitch('overview')}
                style={({ pressed }) => [styles.fullScreenBackPress, pressed ? styles.pressScale : null]}
              >
                <FrostedSurface style={styles.fullScreenBackButton}>
                  <ChevronLeftIcon />
                </FrostedSurface>
              </Pressable>
              <Text style={styles.fullScreenTabTitle}>{activeTabLabel}</Text>
            </View>

            <View style={styles.fullScreenTabBody}>
              {activeTab === 'map' ? <MapTabContent trip={trip} navigation={navigation} fullScreen={true} /> : null}

              {activeTab === 'itinerary' ? (
                <View style={styles.embeddedScreenFill}>
                  <ItineraryScreen
                    key={`embedded-itinerary-${trip.id}-${itineraryInitialType}`}
                    navigation={navigation as never}
                    route={{
                      key: `embedded-itinerary-${trip.id}`,
                      name: 'Itinerary',
                      params: { tripId: trip.id },
                    } as never}
                    embedded={true}
                    initialTypeFilter={itineraryInitialType}
                  />
                </View>
              ) : null}

              {activeTab === 'currency' ? (
                <CurrencyTabContent
                  destinationCurrencies={destinationCurrencies.length > 0 ? destinationCurrencies : ['USD']}
                  baseAmountInput={baseAmountInput}
                  onBaseAmountChange={setBaseAmountInput}
                  ratesLoading={ratesLoading}
                  ratesError={ratesError}
                  rates={rates}
                  ratesFetchedAt={ratesFetchedAt}
                  onRetry={() => {
                    void fetchExchangeRates(true);
                  }}
                />
              ) : null}

              {activeTab === 'docs' ? <DocsTabContent docs={docs} /> : null}
            </View>
          </Animated.View>
        ) : (
          <>
            <View style={styles.navContainer}>
              <View style={styles.navRow}>
                <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.backButtonPress, pressed ? styles.pressScale : null]}>
                  <FrostedSurface style={styles.backButton}>
                    <ChevronLeftIcon />
                  </FrostedSurface>
                </Pressable>

                <Text style={styles.tripTitleInline} numberOfLines={1}>
                  {trip.title}
                </Text>
              </View>

              <Text style={styles.tripSubtitleInline} numberOfLines={1}>
                {tripSubtitle}
              </Text>
            </View>

            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
              {detailTabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <Pressable
                    key={`detail-tab-${tab.key}`}
                    onPress={() => animateTabSwitch(tab.key)}
                    style={({ pressed }) => [styles.tabChipPress, pressed ? styles.pressScale : null]}
                  >
                    <FrostedSurface
                      style={[styles.tabChip, isActive ? styles.tabChipActive : styles.tabChipInactive]}
                      tint={isActive ? 'rgba(15,45,30,0.85)' : 'rgba(255,255,255,0.35)'}
                    >
                      <Text style={[styles.tabChipText, isActive ? styles.tabChipTextActive : styles.tabChipTextInactive]}>
                        {tab.label}
                      </Text>
                    </FrostedSurface>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Animated.View style={[styles.tabContentWrap, { opacity: tabContentOpacity }]}>
              {activeTab === 'overview' ? (
                <OverviewTabContent
                  trip={trip}
                  mapData={mapData}
                  destinationCurrencies={destinationCurrencies.slice(0, 3)}
                  destinationCountries={destinationCountries}
                  docsCount={docsCount}
                  onOpenMap={() => animateTabSwitch('map')}
                  onOpenCurrency={() => animateTabSwitch('currency')}
                  onOpenDocs={() => animateTabSwitch('docs')}
                  onOpenItineraryFlights={() => {
                    setItineraryInitialType('flights');
                    animateTabSwitch('itinerary');
                  }}
                  onOpenItineraryHotels={() => {
                    setItineraryInitialType('hotels');
                    animateTabSwitch('itinerary');
                  }}
                />
              ) : null}
            </Animated.View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#c8e6d4',
  },
  safeArea: {
    flex: 1,
  },
  fullScreenTabShell: {
    flex: 1,
  },
  fullScreenTabTopBar: {
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullScreenBackPress: {
    borderRadius: 14,
  },
  fullScreenBackButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: design.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenTabTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: design.mutedText,
    letterSpacing: 0.3,
  },
  fullScreenTabBody: {
    flex: 1,
  },
  navContainer: {
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonPress: {
    borderRadius: 16,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: design.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripTitleInline: {
    marginLeft: 10,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: design.screenTitle,
    flexShrink: 1,
  },
  tripSubtitleInline: {
    marginTop: 6,
    marginBottom: 16,
    marginLeft: 42,
    fontSize: 13,
    fontWeight: '400',
    color: design.mutedText,
  },
  tabRow: {
    paddingHorizontal: 20,
    gap: 6,
  },
  tabChipPress: {
    borderRadius: 20,
  },
  tabChip: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 32,
    justifyContent: 'center',
  },
  tabChipActive: {
    borderWidth: 0,
  },
  tabChipInactive: {
    borderWidth: 0.5,
    borderColor: design.borderSoft,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabChipTextActive: {
    color: '#e8f5ee',
  },
  tabChipTextInactive: {
    color: design.mutedText,
  },
  tabContentWrap: {
    flex: 1,
    marginTop: 6,
  },
  tabScroll: {
    flex: 1,
  },
  overviewScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  tilePressWrap: {
    borderRadius: 18,
  },
  overviewTile: {
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: design.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tileBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBody: {
    flex: 1,
    minWidth: 0,
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: design.screenTitle,
  },
  tileSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '400',
    color: design.mutedText,
  },
  tileArrowButton: {
    borderRadius: 14,
  },
  tileArrowInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencyTileLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: design.mutedText,
  },
  currencyTileMeta: {
    fontSize: 11,
    fontWeight: '400',
    color: design.mutedText,
  },
  currencyPreviewRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyPreviewPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyPreviewBox: {
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 82,
  },
  currencyCode: {
    fontSize: 11,
    fontWeight: '500',
    color: design.mutedText,
  },
  currencyAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: design.screenTitle,
    marginTop: 2,
  },
  currencyArrow: {
    fontSize: 16,
    fontWeight: '500',
    color: design.mutedText,
  },
  mapTabRoot: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  mapTabRootFullScreen: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  mapFilterRow: {
    gap: 8,
    paddingBottom: 10,
  },
  mapFilterRowFullScreen: {
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 8,
  },
  mapFilterPress: {
    borderRadius: 20,
  },
  mapFilterChip: {
    borderRadius: 20,
    borderWidth: 0.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  mapFilterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mapPaneWrap: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: design.border,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  mapPaneWrapFullScreen: {
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  mapDetailOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  mapDetailCard: {
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: design.border,
    padding: 12,
  },
  mapDetailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  mapDetailTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  mapDetailTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: design.screenTitle,
  },
  mapDetailSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '400',
    color: design.mutedText,
  },
  mapCategoryTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mapCategoryTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  mapActivitySwitchRow: {
    marginTop: 10,
    gap: 6,
  },
  mapActivityChipPress: {
    borderRadius: 14,
  },
  mapActivityChip: {
    borderRadius: 14,
    borderWidth: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 180,
  },
  mapActivityChipActive: {
    borderColor: 'rgba(15,45,30,0.85)',
  },
  mapActivityChipInactive: {
    borderColor: 'rgba(255,255,255,0.8)',
  },
  mapActivityChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: design.bodyText,
  },
  mapActivityChipTextActive: {
    color: '#e8f5ee',
  },
  mapActionRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  mapActionPress: {
    flex: 1,
    borderRadius: 12,
  },
  mapActionSecondary: {
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  mapActionSecondaryText: {
    fontSize: 13,
    fontWeight: '500',
    color: design.mutedText,
  },
  mapActionPrimary: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  mapActionPrimaryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#e8f5ee',
  },
  embeddedScreenFill: {
    flex: 1,
  },
  currencyScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  currencyInputTile: {
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: design.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  currencyInputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: design.mutedText,
  },
  currencyInput: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '700',
    color: design.screenTitle,
    paddingVertical: 0,
  },
  currencyUpdatedLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '400',
    color: design.mutedText,
  },
  currencyErrorTile: {
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(186,55,44,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  currencyErrorText: {
    color: '#8b2c22',
    fontSize: 12,
    fontWeight: '500',
  },
  currencyResultTile: {
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: design.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencyResultTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencyResultCode: {
    fontSize: 12,
    fontWeight: '600',
    color: design.mutedText,
    letterSpacing: 0.4,
  },
  currencyResultName: {
    fontSize: 11,
    fontWeight: '400',
    color: design.mutedText,
  },
  currencyResultAmount: {
    marginTop: 5,
    fontSize: 24,
    fontWeight: '700',
    color: design.screenTitle,
    letterSpacing: -0.2,
  },
  docsScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  docsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docsHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: design.screenTitle,
  },
  docsAddPress: {
    borderRadius: 14,
  },
  docsAddButton: {
    width: 32,
    height: 32,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: design.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docsAddText: {
    fontSize: 22,
    lineHeight: 22,
    marginTop: -2,
    color: design.screenTitle,
    fontWeight: '500',
  },
  docTile: {
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: design.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(186,117,23,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docIcon: {
    fontSize: 16,
  },
  docTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: design.screenTitle,
  },
  docSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '400',
    color: design.mutedText,
  },
  fallbackCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  fallbackTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: design.screenTitle,
    marginBottom: 12,
  },
  fallbackBackPress: {
    borderRadius: 999,
  },
  fallbackBackButton: {
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: design.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  fallbackBackText: {
    fontSize: 13,
    fontWeight: '600',
    color: design.screenTitle,
  },
  pressScale: {
    transform: [{ scale: 0.97 }],
  },
});
