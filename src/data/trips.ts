type BookingStatus = 'booked' | 'not_booked';
type BookingType =
  | 'flight'
  | 'hotel'
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

type HotelStay = {
  name: string;
  city?: string;
  address?: string;
  checkInDate?: string;
  checkInTime?: string;
  checkOutDate?: string;
  checkOutTime?: string;
  confirmationNumber?: string;
  roomType?: string;
  provider?: string;
  nights?: string;
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
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  hotelStay?: HotelStay;
};

type Trip = {
  id: string;
  title: string;
  emoji: string;
  dateRange: string;
  bookings: Booking[];
};

export type { Booking, BookingStatus, BookingType, FlightLeg, HotelStay, Trip };

export const trips: Trip[] = [
  {
    id: 'canada',
    title: 'Montreal + Ottawa',
    emoji: '🇨🇦',
    dateRange: 'Jun 22 – 29, 2026',
    bookings: [
      {
        id: 'escapade-festival-ottawa',
        type: 'festival',
        status: 'not_booked',
        label: 'Escapade Festival',
        legs: [],
        activityDate: 'Jun 27',
        activityTime: '16:00',
        activityLocation: 'Lansdowne Park, Ottawa, Canada',
        notes: 'Weekend pass idea',
      },
    ],
  },
  {
    id: 'sea-japan',
    title: 'Asia Backpacking',
    emoji: '🎒🌏',
    dateRange: 'Jul 15 – Aug 24, 2026',
    bookings: [
      {
        id: 'chiang-mai-elephant-sanctuary',
        type: 'event',
        status: 'not_booked',
        label: 'Elephant Sanctuary Visit',
        legs: [],
        activityDate: 'Jul 26',
        activityTime: '09:00',
        activityLocation: 'Elephant Nature Park, Chiang Mai, Thailand',
        notes: 'Day trip idea',
      },
    ],
  },
];
