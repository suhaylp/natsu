import type { BookingStatus, BookingType } from '../../data/trips';

export type TripViewMode = 'overview' | 'drilldown';

export type StopActivity = {
  id: string;
  bookingId: string;
  bookingType: BookingType;
  status: BookingStatus;
  icon: string;
  name: string;
  city: string;
  country?: string;
  cityKey: string;
  dateLabel: string;
  timeLabel?: string;
  priceLabel?: string;
  refLabel?: string;
  addressLabel?: string;
  iataCode?: string;
  notionUrl?: string;
  fromLatitude?: number;
  fromLongitude?: number;
  toLatitude?: number;
  toLongitude?: number;
  order: number;
};

export type MapPinVariant = 'confirmed' | 'idea' | 'cluster';

export type MapPin = {
  id: string;
  cityKey: string;
  title: string;
  label: string;
  latitude: number;
  longitude: number;
  variant: MapPinVariant;
  icon: string;
  count?: number;
  status: BookingStatus;
  iataCode?: string;
  activities: StopActivity[];
};

export type RouteSegment = {
  id: string;
  fromLatitude: number;
  fromLongitude: number;
  toLatitude: number;
  toLongitude: number;
};
