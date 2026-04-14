type BookingStatus = 'booked' | 'not_booked';
type BookingType =
  | 'flight'
  | 'train'
  | 'bus'
  | 'event'
  | 'concert'
  | 'festival'
  | 'ferry'
  | 'food-tour';

type FlightLeg = {
  flightNumber: string;
  fromCity: string;
  fromCode: string;
  toCity: string;
  toCode: string;
  departureTime: string;
  departureDate: string;
  arrivalTime: string;
  arrivalDate: string;
  duration?: string;
  seats?: { suhayl?: string; natalia?: string } | 'not_assigned';
};

type Baggage = {
  carryOn: string;
  checkIn: string;
};

type Booking = {
  id: string;
  type: BookingType;
  status: BookingStatus;
  label: string;
  airline?: string;
  bookingRef?: string;
  legs: FlightLeg[];
  baggage?: Baggage;
  notes?: string;
  activityDate?: string;
  activityTime?: string;
  activityLocation?: string;
};

type Trip = {
  id: string;
  title: string;
  emoji: string;
  dateRange: string;
  bookings: Booking[];
};

export type { Booking, BookingStatus, BookingType, FlightLeg, Trip };

export const trips: Trip[] = [
  {
    id: 'canada',
    title: 'Montreal + Ottawa',
    emoji: '🇨🇦',
    dateRange: 'Jun 22 – 29, 2026',
    bookings: [],
  },
  {
    id: 'sea-japan',
    title: 'Asia Backpacking',
    emoji: '🎒🌏',
    dateRange: 'Jul 15 – Aug 24, 2026',
    bookings: [],
  },
];
