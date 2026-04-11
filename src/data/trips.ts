type BookingStatus = 'booked' | 'not_booked';

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

type Booking = {
  id: string;
  type: 'flight' | 'train';
  status: BookingStatus;
  label: string;
  airline?: string;
  bookingRef?: string;
  legs: FlightLeg[];
  baggage?: string;
  notes?: string;
};

type Trip = {
  id: string;
  title: string;
  emoji: string;
  dateRange: string;
  bookings: Booking[];
};

export type { BookingStatus, FlightLeg, Booking, Trip };

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
        baggage: 'Suhayl: 1 bag · Natalia: none',
      },
      {
        id: 'mtl-ott-train',
        type: 'train',
        status: 'not_booked',
        label: 'Montreal → Ottawa',
        legs: [],
        notes: 'Friday Jun 26 · ~2h via VIA Rail — not booked yet',
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
        baggage: '1st bag free',
      },
    ],
  },
  {
    id: 'sea-japan',
    title: 'Asia Backpacking',
    emoji: '🎒🌏',
    dateRange: 'Dates TBD',
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
            seats: { suhayl: '38D' },
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
            seats: { suhayl: '29B' },
          },
        ],
        baggage: '2 checked bags, 23kg each',
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
            duration: '1h 35m',
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
        baggage: 'Carry-on 7kg included · Checked: not included',
      },
    ],
  },
];
