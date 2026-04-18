import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { useTripsData } from '../data/TripsDataContext';
import type { Booking, Trip } from '../data/trips';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type {
  ItineraryApiItem,
  ItineraryCardType,
} from '../lib/itinerarySync/contracts';

type Props = StackScreenProps<RootStackParamList, 'Itinerary'>;
type EmbeddedProps = {
  embedded?: boolean;
  initialTypeFilter?: TypeFilterKey;
};

type TypeFilterKey = 'all-types' | 'flights' | 'hotels' | 'sightseeing' | 'activities' | 'food';
type CityFilterKey = 'all-cities' | string;

type TagTone = 'flight' | 'hotel' | 'sightseeing' | 'activities' | 'food' | 'confirmed';

type Tag = {
  id: string;
  label: string;
  tone: TagTone;
  showDot?: boolean;
};

type UiItem = ItineraryApiItem & {
  cityKey: string;
  cityLabel: string;
  tags: Tag[];
};

type DaySection = {
  key: string;
  dayNumber?: number;
  label: string;
  items: UiItem[];
};

type CitySegment = {
  cityKey: string;
  cityLabel: string;
  nights: number;
  days: DaySection[];
};

type RowItem =
  | { kind: 'header'; key: 'header' }
  | { kind: 'error'; key: 'error'; message: string }
  | { kind: 'empty'; key: 'empty' }
  | { kind: 'divider'; key: string; segment: CitySegment }
  | { kind: 'day'; key: string; cityKey: string; day: DaySection };

const colors = {
  screenBg: '#e8f0e9',
  headerCardBg: 'rgba(232,240,233,0.92)',
  headerCardBorder: 'rgba(30,61,47,0.18)',
  primaryText: '#111827',
  secondaryText: '#667085',
  tertiaryText: '#98A2B3',
  accent: '#1e3d2f',
  backButtonBg: '#dce8df',
  tertiaryBorder: 'rgba(12,24,44,0.14)',
  cardBg: '#ffffff',
  activePillBg: '#534AB7',
  activePillText: '#EEEDFE',
  inactivePillBg: '#ffffff',
  inactivePillText: '#667085',
  inactivePillBorder: 'rgba(12,24,44,0.16)',
  skeleton: '#d6dfd8',
};

const BASE_CITY_ORDER = [
  { key: 'singapore', label: 'Singapore' },
  { key: 'bangkok', label: 'Bangkok' },
  { key: 'ko-tao', label: 'Ko Tao' },
  { key: 'chiang-mai', label: 'Chiang Mai' },
  { key: 'chiang-rai', label: 'Chiang Rai' },
  { key: 'hanoi', label: 'Hanoi' },
  { key: 'ha-long-bay', label: 'Ha Long Bay' },
  { key: 'da-nang-hoi-an', label: 'Da Nang/Hoi An' },
  { key: 'ho-chi-minh-city', label: 'Ho Chi Minh City' },
  { key: 'tokyo', label: 'Tokyo' },
] as const;

const TYPE_FILTER_OPTIONS: Array<{ key: TypeFilterKey; label: string }> = [
  { key: 'all-types', label: 'All types' },
  { key: 'flights', label: 'Flights' },
  { key: 'hotels', label: 'Hotels' },
  { key: 'sightseeing', label: 'Sightseeing' },
  { key: 'activities', label: 'Activities' },
  { key: 'food', label: 'Food' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function normalizeLoose(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function canonicalCityLabel(raw: string): string {
  const normalized = normalizeLoose(raw);

  const aliasMap: Array<{ label: string; aliases: string[] }> = [
    { label: 'Singapore', aliases: ['singapore'] },
    { label: 'Bangkok', aliases: ['bangkok'] },
    { label: 'Chiang Mai', aliases: ['chiang mai'] },
    { label: 'Chiang Rai', aliases: ['chiang rai'] },
    { label: 'Ko Tao', aliases: ['ko tao', 'koh tao'] },
    { label: 'Hanoi', aliases: ['hanoi'] },
    { label: 'Da Nang/Hoi An', aliases: ['da nang hoi an', 'da nang', 'hoi an'] },
    { label: 'Ha Long Bay', aliases: ['ha long bay', 'halong bay'] },
    { label: 'Ho Chi Minh City', aliases: ['ho chi minh city', 'saigon'] },
    { label: 'Tokyo', aliases: ['tokyo', 'haneda', 'narita'] },
    { label: 'Montreal', aliases: ['montreal'] },
    { label: 'Ottawa', aliases: ['ottawa'] },
    { label: 'Vancouver', aliases: ['vancouver'] },
    { label: 'Calgary', aliases: ['calgary'] },
    { label: 'Phun Phin', aliases: ['phun phin'] },
  ];

  for (const alias of aliasMap) {
    if (alias.aliases.some((candidate) => normalized.includes(normalizeLoose(candidate)))) {
      return alias.label;
    }
  }

  return toTitleCase(raw.replace(/\s+/g, ' ').trim());
}

function cityKeyFromLabel(label: string): string {
  return normalizeLoose(label).replace(/\s+/g, '-');
}

function parseIsoDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) {
    return null;
  }

  return parsed;
}

function formatMonthDay(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

function parseTripStartDate(dateRange?: string): Date | null {
  if (!dateRange) {
    return null;
  }

  const match = dateRange.match(/^([A-Za-z]{3,9})\s+(\d{1,2})\s*[–-]\s*[A-Za-z]{3,9}\s+\d{1,2},\s*(\d{4})/);
  if (!match?.[1] || !match[2] || !match[3]) {
    return null;
  }

  const monthIndex = MONTHS.findIndex((month) => month.toLowerCase() === match[1].slice(0, 3).toLowerCase());
  if (monthIndex < 0) {
    return null;
  }

  const day = Number(match[2]);
  const year = Number(match[3]);

  if (!Number.isFinite(day) || !Number.isFinite(year)) {
    return null;
  }

  return new Date(Date.UTC(year, monthIndex, day));
}

function parseTripDayCountFromDateRange(dateRange?: string): number | undefined {
  if (!dateRange) {
    return undefined;
  }

  const match = dateRange.match(
    /^([A-Za-z]{3,9})\s+(\d{1,2})\s*[–-]\s*(?:(?:([A-Za-z]{3,9})\s+)?(\d{1,2})),\s*(\d{4})/
  );

  if (!match?.[1] || !match[2] || !match[4] || !match[5]) {
    return undefined;
  }

  const startMonthName = match[1];
  const endMonthName = match[3] ?? startMonthName;
  const startDay = Number(match[2]);
  const endDay = Number(match[4]);
  const year = Number(match[5]);

  const startMonthIndex = MONTHS.findIndex((month) => month.toLowerCase() === startMonthName.slice(0, 3).toLowerCase());
  const endMonthIndex = MONTHS.findIndex((month) => month.toLowerCase() === endMonthName.slice(0, 3).toLowerCase());

  if (startMonthIndex < 0 || endMonthIndex < 0) {
    return undefined;
  }

  if (!Number.isFinite(startDay) || !Number.isFinite(endDay) || !Number.isFinite(year)) {
    return undefined;
  }

  const start = new Date(Date.UTC(year, startMonthIndex, startDay));
  const end = new Date(Date.UTC(year, endMonthIndex, endDay));

  if (!Number.isFinite(start.valueOf()) || !Number.isFinite(end.valueOf())) {
    return undefined;
  }

  const diffDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  return diffDays > 0 ? diffDays : undefined;
}

function utcDayValue(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function parseDateLabel(value: string | undefined, tripStartDate: Date | null): Date | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const iso = parseIsoDate(trimmed);
    if (iso) {
      return iso;
    }
  }

  const monthMatch = trimmed.match(/([A-Za-z]{3,9})\s+(\d{1,2})/);
  if (!monthMatch?.[1] || !monthMatch[2]) {
    return null;
  }

  const monthIndex = MONTHS.findIndex((month) => month.toLowerCase() === monthMatch[1].slice(0, 3).toLowerCase());
  if (monthIndex < 0) {
    return null;
  }

  const day = Number(monthMatch[2]);
  if (!Number.isFinite(day)) {
    return null;
  }

  const baseYear = tripStartDate ? tripStartDate.getUTCFullYear() : new Date().getUTCFullYear();
  let candidate = new Date(Date.UTC(baseYear, monthIndex, day));

  if (tripStartDate && candidate.getTime() + 14 * 24 * 60 * 60 * 1000 < tripStartDate.getTime()) {
    candidate = new Date(Date.UTC(baseYear + 1, monthIndex, day));
  }

  return candidate;
}

function deriveDayNumber(date: Date | null, tripStartDate: Date | null): number | undefined {
  if (!date || !tripStartDate) {
    return undefined;
  }

  const delta = Math.floor((utcDayValue(date) - utcDayValue(tripStartDate)) / (24 * 60 * 60 * 1000)) + 1;
  return delta >= 1 ? delta : undefined;
}

function parseNights(raw?: string): number | undefined {
  if (!raw) {
    return undefined;
  }

  const match = raw.match(/(\d+)/);
  if (!match?.[1]) {
    return undefined;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function inferHotelNights(booking: Booking, tripStartDate: Date | null): number | undefined {
  const rawNights = parseNights(booking.hotelStay?.nights);
  if (typeof rawNights === 'number') {
    return rawNights;
  }

  const checkIn = parseDateLabel(booking.hotelStay?.checkInDate ?? booking.activityDate, tripStartDate);
  const checkOut = parseDateLabel(booking.hotelStay?.checkOutDate, tripStartDate);
  if (!checkIn || !checkOut) {
    return undefined;
  }

  const nights = Math.floor((utcDayValue(checkOut) - utcDayValue(checkIn)) / (24 * 60 * 60 * 1000));
  return nights > 0 ? nights : undefined;
}

function isActivityLikeBooking(booking: Booking): boolean {
  const haystack = [booking.label, booking.activityLocation, booking.notes].filter(Boolean).join(' ').toLowerCase();
  return /activit|adventure|class|tour|hike|workshop/.test(haystack);
}

function buildFlightCodeRoute(booking: Booking): string | undefined {
  if (booking.legs.length === 0) {
    return undefined;
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

  return chain.length > 0 ? chain.join(' → ') : undefined;
}

function buildFlightCityRoute(booking: Booking): string | undefined {
  if (booking.legs.length === 0) {
    return undefined;
  }

  const chain: string[] = [];
  const firstFrom = booking.legs[0]?.fromCity?.trim();
  if (firstFrom) {
    chain.push(canonicalCityLabel(firstFrom));
  }

  booking.legs.forEach((leg) => {
    const toCity = leg.toCity?.trim();
    if (!toCity) {
      return;
    }
    const canonical = canonicalCityLabel(toCity);
    if (chain[chain.length - 1] !== canonical) {
      chain.push(canonical);
    }
  });

  return chain.length > 0 ? chain.join(' → ') : undefined;
}

function buildFlightDurationSummary(booking: Booking): string | undefined {
  const durations = booking.legs.map((leg) => leg.duration).filter((duration): duration is string => Boolean(duration));
  if (durations.length === 0) {
    return undefined;
  }

  return durations.length === 1 ? durations[0] : durations.join(' + ');
}

function typeFromBooking(booking: Booking): ItineraryCardType {
  if (booking.type === 'flight') {
    return 'flight';
  }

  if (booking.type === 'hotel') {
    return 'hotel';
  }

  if (booking.type === 'food-tour') {
    return 'food';
  }

  if (booking.type === 'concert' || booking.type === 'festival') {
    return 'activities';
  }

  if (booking.type === 'event') {
    return isActivityLikeBooking(booking) ? 'activities' : 'sightseeing';
  }

  return 'activities';
}

function inferCityForBooking(booking: Booking, trip: Trip): string {
  const firstLeg = booking.legs[0];
  const lastLeg = booking.legs[booking.legs.length - 1];

  const cityCandidate =
    (booking.type === 'flight' ? lastLeg?.toCity ?? firstLeg?.toCity ?? firstLeg?.fromCity : undefined) ??
    booking.hotelStay?.city ??
    parseCityFromText(booking.activityLocation ?? booking.hotelStay?.address) ??
    lastLeg?.toCity ??
    firstLeg?.fromCity ??
    parseCityFromText(booking.label);

  if (cityCandidate) {
    return canonicalCityLabel(cityCandidate);
  }

  const titleMatch = parseCityFromText(trip.title);
  return titleMatch ? canonicalCityLabel(titleMatch) : 'Unassigned';
}

function mapBookingToItem(booking: Booking, bookingIndex: number, trip: Trip, tripStartDate: Date | null): ItineraryApiItem {
  const type = typeFromBooking(booking);
  const firstLeg = booking.legs[0];
  const lastLeg = booking.legs[booking.legs.length - 1];
  const city = inferCityForBooking(booking, trip);
  const routeCodes = type === 'flight' ? buildFlightCodeRoute(booking) : undefined;
  const routeCities = type === 'flight' ? buildFlightCityRoute(booking) : undefined;

  const dateLabel =
    (type === 'hotel' ? booking.hotelStay?.checkInDate : undefined) ??
    firstLeg?.departureDate ??
    booking.activityDate ??
    booking.hotelStay?.checkInDate ??
    lastLeg?.arrivalDate;

  const parsedDate = parseDateLabel(dateLabel, tripStartDate);
  const dayNumber = deriveDayNumber(parsedDate, tripStartDate);

  const checkIn = booking.hotelStay?.checkInDate ?? booking.activityDate;
  const checkOut = booking.hotelStay?.checkOutDate;
  const nights = type === 'hotel' ? inferHotelNights(booking, tripStartDate) : undefined;

  const fromCode = firstLeg?.fromCode?.trim().toUpperCase();
  const toCode = lastLeg?.toCode?.trim().toUpperCase();
  const duration = type === 'flight' ? buildFlightDurationSummary(booking) : undefined;

  return {
    id: booking.id || `booking-${bookingIndex}`,
    source: type === 'flight' || type === 'hotel' ? 'schedule' : 'ideas',
    type,
    city,
    title: type === 'flight' ? routeCities ?? booking.label : type === 'hotel' ? booking.hotelStay?.name ?? booking.label : booking.label,
    subtitle:
      type === 'flight'
        ? booking.airline ?? booking.label
        : booking.activityLocation ?? booking.hotelStay?.address ?? city,
    time: type === 'flight' ? firstLeg?.departureTime : booking.activityTime ?? booking.hotelStay?.checkInTime ?? firstLeg?.departureTime,
    timeSub: type === 'flight' ? (lastLeg?.arrivalTime ? `Arr ${lastLeg.arrivalTime}` : undefined) : undefined,
    confirmed: booking.status === 'booked',
    status: booking.status,
    dayNumber,
    dayLabel: dayNumber ? `Day ${dayNumber}` : undefined,
    location: booking.activityLocation ?? booking.hotelStay?.address,
    note: booking.notes,
    originIATA: fromCode,
    destIATA: toCode,
    routeCodes,
    routeCities,
    flightLegCount: type === 'flight' ? booking.legs.length : undefined,
    duration,
    arrivalTime: lastLeg?.arrivalTime,
    checkIn,
    nights,
    checkOut,
  };
}

function mapTripBookingsToItems(trip: Trip, tripStartDate: Date | null): ItineraryApiItem[] {
  return trip.bookings.map((booking, bookingIndex) => mapBookingToItem(booking, bookingIndex, trip, tripStartDate));
}

function buildTripSubtitle(trip?: Trip, items?: UiItem[]): string {
  const tripRange = trip?.dateRange?.replace(/,\s*\d{4}$/, '').trim();
  const dayCountFromRange = parseTripDayCountFromDateRange(trip?.dateRange);

  const scheduleDayNumbers = Array.from(
    new Set((items ?? []).filter((item) => typeof item.dayNumber === 'number').map((item) => item.dayNumber as number))
  ).sort((a, b) => a - b);

  const dayCount = scheduleDayNumbers.length;

  if (tripRange && typeof dayCountFromRange === 'number') {
    return `${tripRange} · ${dayCountFromRange} days`;
  }

  if (tripRange && dayCount > 0) {
    return `${tripRange} · ${dayCount} days`;
  }

  if (tripRange) {
    return tripRange;
  }

  return 'Live itinerary';
}

function colorForCityDivider(cityKey: string): { bg: string; text: string } {
  if (cityKey === 'singapore') {
    return { bg: '#EEEDFE', text: '#3C3489' };
  }
  if (cityKey === 'bangkok') {
    return { bg: '#E1F5EE', text: '#085041' };
  }
  if (cityKey === 'chiang-mai') {
    return { bg: '#FAEEDA', text: '#633806' };
  }
  if (cityKey === 'food') {
    return { bg: '#FAECE7', text: '#4A1B0C' };
  }

  return { bg: '#EEF3F6', text: '#1F3F52' };
}

function cardPalette(type: ItineraryCardType): { iconBg: string; tagBg: string; tagText: string } {
  if (type === 'flight') {
    return { iconBg: '#EEEDFE', tagBg: '#EEEDFE', tagText: '#3C3489' };
  }
  if (type === 'hotel') {
    return { iconBg: '#E1F5EE', tagBg: '#E1F5EE', tagText: '#085041' };
  }
  if (type === 'sightseeing') {
    return { iconBg: '#FAEEDA', tagBg: '#FAEEDA', tagText: '#633806' };
  }
  if (type === 'activities') {
    return { iconBg: '#FAEEDA', tagBg: '#FAEEDA', tagText: '#633806' };
  }
  return { iconBg: '#FAECE7', tagBg: '#FAECE7', tagText: '#4A1B0C' };
}

function typeTagLabel(type: ItineraryCardType): string {
  if (type === 'flight') {
    return 'Flight';
  }
  if (type === 'hotel') {
    return 'Hotel';
  }
  if (type === 'sightseeing') {
    return 'Sightseeing';
  }
  if (type === 'food') {
    return 'Food';
  }
  return 'Activity';
}

function typeFilterMatch(item: UiItem, filter: TypeFilterKey): boolean {
  if (filter === 'all-types') {
    return true;
  }
  if (filter === 'flights') {
    return item.type === 'flight';
  }
  if (filter === 'hotels') {
    return item.type === 'hotel';
  }
  if (filter === 'sightseeing') {
    return item.type === 'sightseeing';
  }
  if (filter === 'activities') {
    return item.type === 'activities';
  }
  return item.type === 'food';
}

function cityFilterMatch(item: UiItem, filter: CityFilterKey): boolean {
  if (filter === 'all-cities') {
    return true;
  }

  return item.cityKey === filter;
}

function buildTags(item: ItineraryApiItem): Tag[] {
  const tags: Tag[] = [
    {
      id: `${item.id}-type`,
      label: typeTagLabel(item.type),
      tone: item.type,
    },
  ];

  if (item.type !== 'food' && item.confirmed) {
    tags.push({
      id: `${item.id}-confirmed`,
      label: item.type === 'sightseeing' || item.type === 'activities' ? 'Booked' : 'Confirmed',
      tone: 'confirmed',
      showDot: true,
    });
  }

  return tags;
}

function normalizeUiItems(items: ItineraryApiItem[]): UiItem[] {
  return items.map((item) => {
    const cityLabel = canonicalCityLabel(item.city);
    const cityKey = cityKeyFromLabel(cityLabel);
    return {
      ...item,
      cityLabel,
      cityKey,
      tags: buildTags(item),
    };
  });
}

function parseCityFromText(text?: string): string | undefined {
  if (!text) {
    return undefined;
  }

  const normalized = text.replace(/\s+/g, ' ').trim();
  const dotSegments = normalized.split('·').map((segment) => segment.trim()).filter(Boolean);
  const commaSegments = normalized.split(',').map((segment) => segment.trim()).filter(Boolean);
  const arrowSegments = normalized.split('→').map((segment) => segment.trim()).filter(Boolean);

  const candidates = [
    dotSegments[0],
    commaSegments[0],
    commaSegments[1],
    arrowSegments[arrowSegments.length - 1],
    normalized,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const label = canonicalCityLabel(candidate);
    if (label) {
      return label;
    }
  }

  return undefined;
}

function collectTripCityHints(trip?: Trip): Set<string> {
  const hints = new Set<string>();

  const title = trip?.title ? normalizeLoose(trip.title) : '';
  if (title.includes('montreal')) {
    hints.add(cityKeyFromLabel('Montreal'));
  }
  if (title.includes('ottawa')) {
    hints.add(cityKeyFromLabel('Ottawa'));
  }
  if (title.includes('asia') || title.includes('south east')) {
    BASE_CITY_ORDER.forEach((city) => hints.add(city.key));
  }

  trip?.bookings.forEach((booking) => {
    booking.legs.forEach((leg) => {
      const from = canonicalCityLabel(leg.fromCity);
      const to = canonicalCityLabel(leg.toCity);
      if (from) {
        hints.add(cityKeyFromLabel(from));
      }
      if (to) {
        hints.add(cityKeyFromLabel(to));
      }
    });

    if (booking.hotelStay?.city) {
      hints.add(cityKeyFromLabel(canonicalCityLabel(booking.hotelStay.city)));
    }

    const locationCity = parseCityFromText(booking.activityLocation);
    if (locationCity) {
      hints.add(cityKeyFromLabel(locationCity));
    }
  });

  return hints;
}

function scopeItemsToTrip(items: UiItem[], trip?: Trip): UiItem[] {
  const hints = collectTripCityHints(trip);
  if (hints.size === 0) {
    return items;
  }

  const scoped = items.filter((item) => hints.has(item.cityKey));
  return scoped.length > 0 ? scoped : items;
}

function compareItems(a: UiItem, b: UiItem): number {
  const aDay = a.dayNumber ?? Number.POSITIVE_INFINITY;
  const bDay = b.dayNumber ?? Number.POSITIVE_INFINITY;

  if (aDay !== bDay) {
    return aDay - bDay;
  }

  const aTime = a.time ?? '99:99';
  const bTime = b.time ?? '99:99';
  if (aTime !== bTime) {
    return aTime.localeCompare(bTime);
  }

  return a.title.localeCompare(b.title);
}

function orderedCityKeys(items: UiItem[]): string[] {
  const available = new Set(items.map((item) => item.cityKey));
  const ordered: string[] = [];

  BASE_CITY_ORDER.forEach((city) => {
    if (available.has(city.key)) {
      ordered.push(city.key);
      available.delete(city.key);
    }
  });

  Array.from(available)
    .sort((a, b) => a.localeCompare(b))
    .forEach((cityKey) => ordered.push(cityKey));

  return ordered;
}

function dateLabelForDay(dayNumber: number, tripStartDate: Date | null): string {
  if (!tripStartDate) {
    return `Day ${dayNumber}`;
  }

  const targetDate = new Date(tripStartDate.getTime());
  targetDate.setUTCDate(targetDate.getUTCDate() + dayNumber - 1);

  return `${WEEKDAYS[targetDate.getUTCDay()]}, ${MONTHS[targetDate.getUTCMonth()]} ${targetDate.getUTCDate()}`;
}

function deriveDayLabel(day: DaySection, dayIndex: number, tripStartDate: Date | null): string {
  if (typeof day.dayNumber !== 'number') {
    return 'Ideas';
  }

  const base = dateLabelForDay(day.dayNumber, tripStartDate);
  const hasFlight = day.items.some((item) => item.type === 'flight');

  if (hasFlight) {
    return `${base} · ${dayIndex === 0 ? 'Arrival day' : 'Travel day'}`;
  }

  return base;
}

function buildSegments(items: UiItem[], tripStartDate: Date | null): CitySegment[] {
  const groupedByCity = new Map<string, UiItem[]>();

  items
    .slice()
    .sort(compareItems)
    .forEach((item) => {
      const existing = groupedByCity.get(item.cityKey) ?? [];
      existing.push(item);
      groupedByCity.set(item.cityKey, existing);
    });

  const cityOrder = orderedCityKeys(items);

  return cityOrder
    .map((cityKey) => {
      const cityItems = groupedByCity.get(cityKey) ?? [];
      if (cityItems.length === 0) {
        return null;
      }

      const dayMap = new Map<string, UiItem[]>();
      cityItems.forEach((item) => {
        const dayKey = typeof item.dayNumber === 'number' ? `day-${item.dayNumber}` : 'ideas';
        const existing = dayMap.get(dayKey) ?? [];
        existing.push(item);
        dayMap.set(dayKey, existing);
      });

      const dayKeys = Array.from(dayMap.keys()).sort((a, b) => {
        if (a === 'ideas') {
          return 1;
        }
        if (b === 'ideas') {
          return -1;
        }

        const aDay = Number(a.replace(/^day-/, ''));
        const bDay = Number(b.replace(/^day-/, ''));
        return aDay - bDay;
      });

      const days: DaySection[] = dayKeys.map((dayKey, index) => {
        const dayItems = (dayMap.get(dayKey) ?? []).slice().sort(compareItems);
        const dayNumber = dayKey === 'ideas' ? undefined : Number(dayKey.replace(/^day-/, ''));

        return {
          key: `${cityKey}-${dayKey}`,
          dayNumber,
          label: deriveDayLabel(
            {
              key: `${cityKey}-${dayKey}`,
              dayNumber,
              label: '',
              items: dayItems,
            },
            index,
            tripStartDate
          ),
          items: dayItems,
        };
      });

      const scheduleDayCount = new Set(
        cityItems
          .filter((item) => item.source === 'schedule' && typeof item.dayNumber === 'number')
          .map((item) => item.dayNumber as number)
      ).size;
      const nights = scheduleDayCount > 0 ? scheduleDayCount : 1;
      const cityLabel = cityItems[0]?.cityLabel ?? toTitleCase(cityKey.replace(/-/g, ' '));

      return {
        cityKey,
        cityLabel,
        nights,
        days,
      };
    })
    .filter((segment): segment is CitySegment => Boolean(segment));
}

function flattenRows(segments: CitySegment[], error: string | null, includeHeader = true): RowItem[] {
  const rows: RowItem[] = includeHeader ? [{ kind: 'header', key: 'header' }] : [];

  if (error) {
    rows.push({ kind: 'error', key: 'error', message: error });
  }

  if (segments.length === 0 && !error) {
    rows.push({ kind: 'empty', key: 'empty' });
    return rows;
  }

  segments.forEach((segment) => {
    rows.push({ kind: 'divider', key: `divider-${segment.cityKey}`, segment });

    segment.days.forEach((day) => {
      rows.push({
        kind: 'day',
        key: `day-${day.key}`,
        cityKey: segment.cityKey,
        day,
      });
    });
  });

  return rows;
}

function filterRows(
  segments: CitySegment[],
  cityFilter: CityFilterKey,
  typeFilter: TypeFilterKey
): CitySegment[] {
  const scoped = segments
    .map((segment) => {
      if (cityFilter !== 'all-cities' && segment.cityKey !== cityFilter) {
        return null;
      }

      const filteredDays = segment.days
        .map((day) => ({
          ...day,
          items: day.items.filter((item) => cityFilterMatch(item, cityFilter) && typeFilterMatch(item, typeFilter)),
        }))
        .filter((day) => day.items.length > 0);

      if (filteredDays.length === 0) {
        return null;
      }

      return {
        ...segment,
        days: filteredDays,
      };
    })
    .filter((segment): segment is CitySegment => Boolean(segment));

  return scoped;
}

function cityFilterOptions(items: UiItem[]): Array<{ key: CityFilterKey; label: string }> {
  const options: Array<{ key: CityFilterKey; label: string }> = [{ key: 'all-cities', label: 'All cities' }];

  const seen = new Set<string>();

  BASE_CITY_ORDER.forEach((city) => {
    options.push({ key: city.key, label: city.label });
    seen.add(city.key);
  });

  items.forEach((item) => {
    if (seen.has(item.cityKey)) {
      return;
    }

    seen.add(item.cityKey);
    options.push({ key: item.cityKey, label: item.cityLabel });
  });

  return options;
}

function emojiForType(item: UiItem): string {
  if (item.type === 'flight') {
    return '✈';
  }
  if (item.type === 'hotel') {
    return '🏨';
  }
  if (item.type === 'food') {
    return '🍜';
  }

  const combined = normalizeLoose(`${item.title} ${item.subtitle ?? ''} ${item.note ?? ''}`);
  if (/(temple|shrine|landmark|historic|museum|old town|cathedral)/.test(combined)) {
    return '🏛️';
  }
  if (/(hike|trek|zipline|rafting|adventure|climb)/.test(combined)) {
    return '🧗';
  }

  return item.type === 'sightseeing' ? '📍' : '🎟️';
}

function formatCheckOut(checkOut?: string): string {
  const parsed = parseIsoDate(checkOut);
  if (!parsed) {
    return checkOut ?? 'Checkout';
  }

  return formatMonthDay(parsed);
}

function Header(props: {
  tripTitle: string;
  tripSubtitle: string;
  cityOptions: Array<{ key: CityFilterKey; label: string }>;
  cityFilter: CityFilterKey;
  typeFilter: TypeFilterKey;
  onCityFilterPress: (filter: CityFilterKey) => void;
  onTypeFilterPress: (filter: TypeFilterKey) => void;
  onBackPress: () => void;
}) {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <Pressable style={styles.backButton} onPress={props.onBackPress}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View style={styles.titleWrap}>
            <Text style={styles.tripTitle} numberOfLines={1}>
              {props.tripTitle}
            </Text>
            <Text style={styles.tripSubtitle} numberOfLines={1}>
              {props.tripSubtitle}
            </Text>
          </View>

          <View style={styles.backButtonPlaceholder} />
        </View>

        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {props.cityOptions.map((option) => {
            const active = props.cityFilter === option.key;
            return (
              <Pressable
                key={`city-${option.key}`}
                style={[
                  styles.filterPill,
                  active
                    ? { backgroundColor: colors.activePillBg, borderColor: colors.activePillBg }
                    : { backgroundColor: colors.inactivePillBg, borderColor: colors.inactivePillBorder },
                ]}
                onPress={() => props.onCityFilterPress(option.key)}
              >
                <Text style={[styles.filterPillText, active ? { color: colors.activePillText } : { color: colors.inactivePillText }]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {TYPE_FILTER_OPTIONS.map((option) => {
            const active = props.typeFilter === option.key;
            return (
              <Pressable
                key={`type-${option.key}`}
                style={[
                  styles.filterPill,
                  active
                    ? { backgroundColor: colors.activePillBg, borderColor: colors.activePillBg }
                    : { backgroundColor: colors.inactivePillBg, borderColor: colors.inactivePillBorder },
                ]}
                onPress={() => props.onTypeFilterPress(option.key)}
              >
                <Text style={[styles.filterPillText, active ? { color: colors.activePillText } : { color: colors.inactivePillText }]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

function CountryDivider({ segment }: { segment: CitySegment }) {
  const palette = colorForCityDivider(segment.cityKey);
  return (
    <View style={styles.dividerWrap}>
      <View style={styles.dividerLine} />
      <View style={[styles.dividerCityPill, { backgroundColor: palette.bg }]}> 
        <Text style={[styles.dividerCityText, { color: palette.text }]}>{segment.cityLabel}</Text>
      </View>
    </View>
  );
}

function ItineraryCard({ item }: { item: UiItem }) {
  const palette = cardPalette(item.type);

  const confirmedTag = item.tags.find((tag) => tag.tone === 'confirmed');
  const primaryTag = item.tags.find((tag) => tag.tone !== 'confirmed');

  return (
    <Pressable style={styles.card} onPress={() => {}}>
      <View style={[styles.iconWrap, { backgroundColor: palette.iconBg }]}> 
        <Text style={styles.iconText}>{emojiForType(item)}</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {item.subtitle || item.location || item.cityLabel}
        </Text>

        <View style={styles.tagRow}>
          {primaryTag ? (
            <View style={[styles.tagPill, { backgroundColor: palette.tagBg }]}> 
              <Text style={[styles.tagText, { color: palette.tagText }]}>{primaryTag.label}</Text>
            </View>
          ) : null}

          {confirmedTag ? (
            <View style={[styles.tagPill, { backgroundColor: '#EAF3DE' }]}> 
              <View style={styles.confirmedDot} />
              <Text style={[styles.tagText, { color: '#27500A' }]}>{confirmedTag.label}</Text>
            </View>
          ) : null}
        </View>

        {item.type === 'flight' ? (
          <View style={styles.flightFooter}>
            <Text style={styles.flightRouteText}>{item.routeCodes ?? `${item.originIATA ?? '---'} → ${item.destIATA ?? '---'}`}</Text>
            <Text style={styles.flightSubText}>
              {[
                item.flightLegCount && item.flightLegCount > 1 ? `${item.flightLegCount} legs` : undefined,
                item.duration,
                item.arrivalTime ? `Arrive ${item.arrivalTime}` : undefined,
              ]
                .filter(Boolean)
                .join(' · ') || item.note || 'Flight details'}
            </Text>
          </View>
        ) : null}

        {item.type === 'hotel' ? (
          <Text style={styles.hotelMetaText}>{`Check-in ${item.checkIn ?? 'TBD'} · ${item.nights ?? 0} nights`}</Text>
        ) : null}
      </View>

      <View style={styles.timeColumn}>
        <Text style={styles.timePrimary}>{
          item.type === 'hotel' ? `${item.nights ?? 0} nts` : item.time || '--:--'
        }</Text>
        <Text style={styles.timeSecondary}>{
          item.type === 'hotel' ? formatCheckOut(item.checkOut) : item.timeSub || ' '
        }</Text>
      </View>
    </Pressable>
  );
}

function LoadingSkeleton({ pulseOpacity }: { pulseOpacity: Animated.Value }) {
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View style={[styles.headerWrap, { opacity: pulseOpacity }]}> 
          <View style={styles.headerCard}>
            <View style={styles.headerTopRow}>
              <View style={[styles.backButton, styles.skeletonBlock]} />
              <View style={styles.titleWrap}>
                <View style={[styles.skeletonLine, { width: 180, height: 17 }]} />
                <View style={[styles.skeletonLine, { width: 150, height: 12, marginTop: 8 }]} />
              </View>
              <View style={styles.backButtonPlaceholder} />
            </View>

            <View style={styles.filterRow}>
              <View style={[styles.skeletonPill, { width: 84 }]} />
              <View style={[styles.skeletonPill, { width: 78 }]} />
              <View style={[styles.skeletonPill, { width: 66 }]} />
            </View>
            <View style={styles.filterRow}>
              <View style={[styles.skeletonPill, { width: 80 }]} />
              <View style={[styles.skeletonPill, { width: 70 }]} />
              <View style={[styles.skeletonPill, { width: 88 }]} />
            </View>
          </View>
        </Animated.View>

        <View style={styles.listContent}>
          <Animated.View style={[styles.card, { opacity: pulseOpacity }]}>
            <View style={[styles.iconWrap, styles.skeletonBlock]} />
            <View style={styles.cardBody}>
              <View style={[styles.skeletonLine, { width: '75%', height: 14 }]} />
              <View style={[styles.skeletonLine, { width: '58%', height: 11, marginTop: 8 }]} />
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                <View style={[styles.skeletonPill, { width: 62 }]} />
                <View style={[styles.skeletonPill, { width: 78 }]} />
              </View>
            </View>
            <View style={styles.timeColumn}>
              <View style={[styles.skeletonLine, { width: 40, height: 12 }]} />
              <View style={[styles.skeletonLine, { width: 34, height: 11, marginTop: 6 }]} />
            </View>
          </Animated.View>
          <Animated.View style={[styles.card, { opacity: pulseOpacity }]}>
            <View style={[styles.iconWrap, styles.skeletonBlock]} />
            <View style={styles.cardBody}>
              <View style={[styles.skeletonLine, { width: '68%', height: 14 }]} />
              <View style={[styles.skeletonLine, { width: '48%', height: 11, marginTop: 8 }]} />
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                <View style={[styles.skeletonPill, { width: 58 }]} />
              </View>
            </View>
            <View style={styles.timeColumn}>
              <View style={[styles.skeletonLine, { width: 44, height: 12 }]} />
              <View style={[styles.skeletonLine, { width: 30, height: 11, marginTop: 6 }]} />
            </View>
          </Animated.View>
          <Animated.View style={[styles.card, { opacity: pulseOpacity }]}>
            <View style={[styles.iconWrap, styles.skeletonBlock]} />
            <View style={styles.cardBody}>
              <View style={[styles.skeletonLine, { width: '72%', height: 14 }]} />
              <View style={[styles.skeletonLine, { width: '56%', height: 11, marginTop: 8 }]} />
            </View>
            <View style={styles.timeColumn}>
              <View style={[styles.skeletonLine, { width: 36, height: 12 }]} />
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

export function ItineraryScreen({ navigation, route, embedded = false, initialTypeFilter = 'all-types' }: Props & EmbeddedProps) {
  const { trips, isLoading: tripsLoading, error: tripsError, refresh: refreshTrips } = useTripsData();
  const trip = trips.find((candidate) => candidate.id === route.params.tripId);

  const [cityFilter, setCityFilter] = useState<CityFilterKey>('all-cities');
  const [typeFilter, setTypeFilter] = useState<TypeFilterKey>(initialTypeFilter);
  const [expandedIdeaDayKeys, setExpandedIdeaDayKeys] = useState<Record<string, boolean>>({});
  const pulseOpacity = useRef(new Animated.Value(1)).current;
  const tripStartDate = useMemo(() => parseTripStartDate(trip?.dateRange), [trip?.dateRange]);
  const rawItems = useMemo(() => (trip ? mapTripBookingsToItems(trip, tripStartDate) : []), [trip, tripStartDate]);
  const shouldShowSkeleton = tripsLoading && rawItems.length === 0;

  useEffect(() => {
    setTypeFilter(initialTypeFilter);
  }, [initialTypeFilter]);

  useEffect(() => {
    if (!shouldShowSkeleton) {
      pulseOpacity.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, { toValue: 0.42, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [pulseOpacity, shouldShowSkeleton]);

  const normalizedItems = useMemo(() => normalizeUiItems(rawItems), [rawItems]);
  const tripScopedItems = useMemo(() => scopeItemsToTrip(normalizedItems, trip), [normalizedItems, trip]);
  const syncError = tripScopedItems.length === 0 ? tripsError : null;

  useEffect(() => {
    if (cityFilter === 'all-cities') {
      return;
    }

    const cityKeys = new Set(tripScopedItems.map((item) => item.cityKey));
    if (!cityKeys.has(cityFilter)) {
      setCityFilter('all-cities');
    }
  }, [cityFilter, tripScopedItems]);

  const baseSegments = useMemo(() => buildSegments(tripScopedItems, tripStartDate), [tripScopedItems, tripStartDate]);

  const filteredSegments = useMemo(
    () => filterRows(baseSegments, cityFilter, typeFilter),
    [baseSegments, cityFilter, typeFilter]
  );

  const rows = useMemo(() => flattenRows(filteredSegments, syncError, !embedded), [embedded, filteredSegments, syncError]);

  const cityOptions = useMemo(() => cityFilterOptions(tripScopedItems), [tripScopedItems]);

  const tripTitle = trip?.title ?? 'Itinerary';
  const tripSubtitle = buildTripSubtitle(trip, tripScopedItems);

  useEffect(() => {
    const availableIdeaKeys = new Set(
      filteredSegments
        .flatMap((segment) => segment.days)
        .filter((day) => typeof day.dayNumber !== 'number')
        .map((day) => day.key)
    );

    setExpandedIdeaDayKeys((previous) => {
      const retained = Object.entries(previous).filter(([dayKey]) => availableIdeaKeys.has(dayKey));
      if (retained.length === Object.keys(previous).length) {
        return previous;
      }

      return Object.fromEntries(retained);
    });
  }, [filteredSegments]);

  const toggleIdeasDay = useCallback((dayKey: string) => {
    setExpandedIdeaDayKeys((previous) => ({
      ...previous,
      [dayKey]: !previous[dayKey],
    }));
  }, []);

  const renderRow = useCallback(
    ({ item }: ListRenderItemInfo<RowItem>) => {
      if (item.kind === 'header') {
        return (
          <Header
            tripTitle={tripTitle}
            tripSubtitle={tripSubtitle}
            cityOptions={cityOptions}
            cityFilter={cityFilter}
            typeFilter={typeFilter}
            onCityFilterPress={setCityFilter}
            onTypeFilterPress={setTypeFilter}
            onBackPress={() => navigation.goBack()}
          />
        );
      }

      if (item.kind === 'error') {
        return (
          <Pressable style={styles.errorBanner} onPress={() => void refreshTrips()}>
            <Text style={styles.errorBannerText}>
              {item.message ? `${item.message} Tap to retry.` : "Couldn't load itinerary — tap to retry"}
            </Text>
          </Pressable>
        );
      }

      if (item.kind === 'empty') {
        return (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No items</Text>
            <Text style={styles.emptySubTitle}>No itinerary entries matched the selected filters.</Text>
          </View>
        );
      }

      if (item.kind === 'divider') {
        return <CountryDivider segment={item.segment} />;
      }

      const isIdeasDay = typeof item.day.dayNumber !== 'number';
      const isIdeasExpanded = !isIdeasDay || Boolean(expandedIdeaDayKeys[item.day.key]);

      return (
        <View style={styles.dayWrap}>
          {isIdeasDay ? (
            <Pressable
              style={styles.ideasHeaderRow}
              onPress={() => toggleIdeasDay(item.day.key)}
              accessibilityRole="button"
              accessibilityLabel={`${item.day.label} section`}
              accessibilityHint={isIdeasExpanded ? 'Collapse ideas' : 'Expand ideas'}
            >
              <Text style={styles.dayLabel}>{`${item.day.label} (${item.day.items.length})`}</Text>
              <Text style={styles.ideasChevron}>{isIdeasExpanded ? '▾' : '▸'}</Text>
            </Pressable>
          ) : (
            <Text style={styles.dayLabel}>{item.day.label}</Text>
          )}

          {isIdeasExpanded
            ? item.day.items.map((dayItem) => (
                <ItineraryCard key={dayItem.id} item={dayItem} />
              ))
            : null}
        </View>
      );
    },
    [cityFilter, cityOptions, expandedIdeaDayKeys, navigation, refreshTrips, toggleIdeasDay, tripSubtitle, tripTitle, typeFilter]
  );

  if (shouldShowSkeleton) {
    if (embedded) {
      return (
        <View style={styles.embeddedScreen}>
          <Animated.View style={[styles.card, { opacity: pulseOpacity, marginHorizontal: 12, marginTop: 8 }]}>
            <View style={[styles.iconWrap, styles.skeletonBlock]} />
            <View style={styles.cardBody}>
              <View style={[styles.skeletonLine, { width: '72%', height: 14 }]} />
              <View style={[styles.skeletonLine, { width: '56%', height: 11, marginTop: 8 }]} />
            </View>
            <View style={styles.timeColumn}>
              <View style={[styles.skeletonLine, { width: 42, height: 12 }]} />
            </View>
          </Animated.View>
        </View>
      );
    }

    return <LoadingSkeleton pulseOpacity={pulseOpacity} />;
  }

  if (embedded) {
    return (
      <View style={styles.embeddedScreen}>
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          renderItem={renderRow}
          contentContainerStyle={styles.embeddedListContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          renderItem={renderRow}
          stickyHeaderIndices={[0]}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  embeddedScreen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
  },
  headerWrap: {
    backgroundColor: colors.screenBg,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },
  headerCard: {
    backgroundColor: colors.headerCardBg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.headerCardBorder,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  tripTitle: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: '500',
  },
  tripSubtitle: {
    color: colors.secondaryText,
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backButtonBg,
    borderWidth: 1,
    borderColor: colors.tertiaryBorder,
  },
  backText: {
    color: colors.accent,
    fontSize: 24,
    lineHeight: 24,
    marginTop: -1,
  },
  backButtonPlaceholder: {
    width: 32,
    height: 32,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 2,
  },
  filterPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    gap: 8,
  },
  embeddedListContent: {
    paddingHorizontal: 8,
    paddingBottom: 20,
    gap: 8,
  },
  dividerWrap: {
    marginTop: 8,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dividerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0.5,
    backgroundColor: colors.tertiaryBorder,
  },
  dividerCityPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(12,24,44,0.08)',
    zIndex: 1,
  },
  dividerCityText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dayWrap: {
    marginBottom: 2,
  },
  dayLabel: {
    color: colors.tertiaryText,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.66,
    marginTop: 6,
    marginBottom: 8,
  },
  ideasHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ideasChevron: {
    color: colors.tertiaryText,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.tertiaryBorder,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  iconText: {
    fontSize: 17,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: colors.primaryText,
    fontSize: 15,
    fontWeight: '500',
  },
  cardSubtitle: {
    marginTop: 2,
    color: colors.secondaryText,
    fontSize: 12,
    fontWeight: '400',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  confirmedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#639922',
  },
  flightFooter: {
    marginTop: 8,
  },
  flightRouteText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: '500',
  },
  flightSubText: {
    marginTop: 2,
    color: colors.secondaryText,
    fontSize: 11,
    fontWeight: '400',
  },
  hotelMetaText: {
    marginTop: 8,
    color: colors.secondaryText,
    fontSize: 11,
    fontWeight: '400',
  },
  timeColumn: {
    minWidth: 56,
    alignItems: 'flex-end',
    paddingTop: 1,
  },
  timePrimary: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: '500',
  },
  timeSecondary: {
    marginTop: 2,
    color: colors.secondaryText,
    fontSize: 11,
    fontWeight: '400',
  },
  errorBanner: {
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(180,35,24,0.35)',
    backgroundColor: 'rgba(253,236,236,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorBannerText: {
    color: '#7A271A',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyWrap: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.tertiaryBorder,
    backgroundColor: colors.cardBg,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  emptyTitle: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: '500',
  },
  emptySubTitle: {
    marginTop: 4,
    color: colors.secondaryText,
    fontSize: 12,
    fontWeight: '400',
  },
  skeletonBlock: {
    backgroundColor: colors.skeleton,
    borderColor: 'transparent',
  },
  skeletonLine: {
    borderRadius: 8,
    backgroundColor: colors.skeleton,
  },
  skeletonPill: {
    height: 26,
    borderRadius: 999,
    backgroundColor: colors.skeleton,
  },
});
