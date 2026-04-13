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
    bookings: [
      {
        id: 'yvr-yhu',
        type: 'flight',
        status: 'booked',
        label: 'Vancouver → Montreal',
        airline: 'Porter Airlines',
        bookingRef: 'D6Y22M',
        legs: [
          {
            flightNumber: 'PD182',
            fromCity: 'Vancouver',
            fromCode: 'YVR',
            toCity: 'Montreal',
            toCode: 'YHU',
            departureTime: '12:05',
            departureDate: 'Jun 22',
            arrivalTime: '20:00',
            arrivalDate: 'Jun 22',
            duration: '4h 55m',
            seats: 'not_assigned',
          },
        ],
        baggage: {
          carryOn: '1 carry-on each',
          checkIn: '1 check-in shared',
        },
      },
      {
        id: 'mtl-ott-train',
        type: 'train',
        status: 'not_booked',
        label: 'Montreal → Ottawa',
        legs: [],
        notes: 'Friday June 26th · ~2h via VIA Rail — not booked yet',
      },
      {
        id: 'yow-yvr',
        type: 'flight',
        status: 'booked',
        label: 'Ottawa → Vancouver',
        airline: 'Air Canada',
        bookingRef: 'AGBDDX',
        legs: [
          {
            flightNumber: 'AC357',
            fromCity: 'Ottawa',
            fromCode: 'YOW',
            toCity: 'Calgary',
            toCode: 'YYC',
            departureTime: '18:05',
            departureDate: 'Jun 29',
            arrivalTime: '20:31',
            arrivalDate: 'Jun 29',
            seats: 'not_assigned',
          },
          {
            flightNumber: 'AC229',
            fromCity: 'Calgary',
            fromCode: 'YYC',
            toCity: 'Vancouver',
            toCode: 'YVR',
            departureTime: '21:40',
            departureDate: 'Jun 29',
            arrivalTime: '22:17',
            arrivalDate: 'Jun 29',
            seats: 'not_assigned',
          },
        ],
        baggage: {
          carryOn: '1 carry-on each',
          checkIn: '1 check-in each',
        },
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
        id: 'yvr-hnd-sin',
        type: 'flight',
        status: 'booked',
        label: 'Vancouver → Tokyo → Singapore',
        airline: 'ANA',
        bookingRef: 'EQO9VF',
        legs: [
          {
            flightNumber: 'NH115',
            fromCity: 'Vancouver',
            fromCode: 'YVR',
            toCity: 'Tokyo Haneda',
            toCode: 'HND',
            departureTime: '16:45',
            departureDate: 'Jul 15',
            arrivalTime: '19:00',
            arrivalDate: 'Jul 16',
            seats: { suhayl: '38D', natalia: '38F' },
          },
          {
            flightNumber: 'NH843',
            fromCity: 'Tokyo Haneda',
            fromCode: 'HND',
            toCity: 'Singapore',
            toCode: 'SIN',
            departureTime: '00:40',
            departureDate: 'Jul 17',
            arrivalTime: '06:40',
            arrivalDate: 'Jul 17',
            seats: { suhayl: '29B', natalia: '29A' },
          },
        ],
        baggage: {
          carryOn: '1 carry-on each',
          checkIn: '2 check-in each',
        },
      },
      {
        id: 'sin-bkk',
        type: 'flight',
        status: 'booked',
        label: 'Singapore → Bangkok',
        airline: 'Scoot',
        bookingRef: 'ZHE8HH',
        legs: [
          {
            flightNumber: 'TR626',
            fromCity: 'Singapore',
            fromCode: 'SIN',
            toCity: 'Bangkok',
            toCode: 'BKK',
            departureTime: '18:00',
            departureDate: 'Jul 18',
            arrivalTime: '19:35',
            arrivalDate: 'Jul 18',
            duration: '2h 35m',
            seats: { suhayl: '32J', natalia: '32K' },
          },
        ],
      },
      {
        id: 'cnx-han',
        type: 'flight',
        status: 'not_booked',
        label: 'Chiang Mai → Hanoi',
        legs: [],
        notes: 'Not booked yet',
      },
      {
        id: 'sgn-japan',
        type: 'flight',
        status: 'not_booked',
        label: 'Ho Chi Minh → Japan',
        legs: [],
        notes: 'Not booked yet',
      },
      {
        id: 'nrt-yvr',
        type: 'flight',
        status: 'booked',
        label: 'Tokyo → Vancouver',
        airline: 'ZIPAIR',
        bookingRef: '5O3W91',
        legs: [
          {
            flightNumber: 'ZG022',
            fromCity: 'Tokyo Narita',
            fromCode: 'NRT',
            toCity: 'Vancouver',
            toCode: 'YVR',
            departureTime: '15:55',
            departureDate: 'Aug 24',
            arrivalTime: '08:45',
            arrivalDate: 'Aug 24',
            seats: { suhayl: '47K', natalia: '47J' },
          },
        ],
        baggage: {
          carryOn: '1 carry-on each',
          checkIn: '0 check-in each',
        },
      },
    ],
  },
  {
    id: 'euro-rails-fests',
    title: 'Europe Rail + Festivals',
    emoji: '🚆🎶',
    dateRange: 'Sep 3 – 19, 2026',
    bookings: [
      {
        id: 'yvr-lhr',
        type: 'flight',
        status: 'booked',
        label: 'Vancouver → London',
        airline: 'British Airways',
        bookingRef: 'R7X2QP',
        legs: [
          {
            flightNumber: 'BA084',
            fromCity: 'Vancouver',
            fromCode: 'YVR',
            toCity: 'London Heathrow',
            toCode: 'LHR',
            departureTime: '20:25',
            departureDate: 'Sep 3',
            arrivalTime: '13:05',
            arrivalDate: 'Sep 4',
            duration: '9h 40m',
            seats: 'not_assigned',
          },
        ],
        baggage: {
          carryOn: '1 carry-on each',
          checkIn: '1 check-in each',
        },
      },
      {
        id: 'lhr-par-train',
        type: 'train',
        status: 'booked',
        label: 'London → Paris (Eurostar)',
        bookingRef: 'ES92KT',
        legs: [
          {
            flightNumber: 'EUROSTAR 9032',
            fromCity: 'London St Pancras',
            fromCode: 'STP',
            toCity: 'Paris Gare du Nord',
            toCode: 'GDN',
            departureTime: '09:01',
            departureDate: 'Sep 6',
            arrivalTime: '12:20',
            arrivalDate: 'Sep 6',
            duration: '2h 19m',
          },
        ],
      },
      {
        id: 'par-bru-bus',
        type: 'bus',
        status: 'booked',
        label: 'Paris → Brussels (FlixBus)',
        bookingRef: 'FLXK3D',
        legs: [
          {
            flightNumber: 'FLX 1650',
            fromCity: 'Paris Bercy',
            fromCode: 'PBY',
            toCity: 'Brussels North',
            toCode: 'BRU-N',
            departureTime: '07:45',
            departureDate: 'Sep 9',
            arrivalTime: '11:35',
            arrivalDate: 'Sep 9',
            duration: '3h 50m',
          },
        ],
      },
      {
        id: 'bru-night-market',
        type: 'event',
        status: 'booked',
        label: 'Grand Place Night Market',
        legs: [],
        activityDate: 'Sep 9',
        activityTime: '19:00 - 22:00',
        activityLocation: 'Grand Place, Brussels',
        notes: 'Sep 9 · Street food + local craft stalls',
      },
      {
        id: 'ams-concert',
        type: 'concert',
        status: 'not_booked',
        label: 'Open-air indie concert in Amsterdam',
        legs: [],
        activityDate: 'Sep 12',
        activityTime: '20:30',
        activityLocation: 'NDSM Wharf, Amsterdam',
        notes: 'Sep 12 · Waiting for lineup announcements',
      },
      {
        id: 'rot-festival',
        type: 'festival',
        status: 'not_booked',
        label: 'Rotterdam Rooftop Festival',
        legs: [],
        activityDate: 'Sep 13',
        activityTime: '14:00 - 23:00',
        activityLocation: 'Rotterdam City Center',
        notes: 'Sep 13 · Tickets drop in June',
      },
      {
        id: 'bru-canal-ferry',
        type: 'ferry',
        status: 'not_booked',
        label: 'Canal ferry day pass',
        legs: [],
        notes: 'Sep 10 · Flexible transport across city center',
      },
      {
        id: 'paris-food-tour',
        type: 'food-tour',
        status: 'not_booked',
        label: 'Le Marais evening food tour',
        legs: [],
        notes: 'Sep 7 · Reserve if weather is clear',
      },
      {
        id: 'lhr-yvr',
        type: 'flight',
        status: 'booked',
        label: 'London → Vancouver',
        airline: 'Air Canada',
        bookingRef: 'XJZ4LH',
        legs: [
          {
            flightNumber: 'AC861',
            fromCity: 'London Heathrow',
            fromCode: 'LHR',
            toCity: 'Vancouver',
            toCode: 'YVR',
            departureTime: '14:10',
            departureDate: 'Sep 19',
            arrivalTime: '15:45',
            arrivalDate: 'Sep 19',
            duration: '9h 35m',
            seats: 'not_assigned',
          },
        ],
        baggage: {
          carryOn: '1 carry-on each',
          checkIn: '1 check-in each',
        },
      },
    ],
  },
];
