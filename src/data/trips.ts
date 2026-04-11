// ── data/trips.ts ──
export type Flight = {
  id: string;
  route: string;
  date: string;
  time: string;
  airline: string;
  bookingRef: string;
  terminal: string;
  duration: string;
};

export type Trip = {
  id: string;
  title: string;
  emoji: string;
  dateRange: string;
  flights: Flight[];
};

export const trips: Trip[] = [
  {
    id: '1',
    title: 'Southeast Asia',
    emoji: '🇹🇭🇻🇳',
    dateRange: 'Jul – Aug 2025',
    flights: [
      {
        id: 'f1',
        route: 'Singapore → Bangkok',
        date: 'July 18, 2025',
        time: '6:00 PM',
        airline: 'Scoot',
        bookingRef: 'SC-88421',
        terminal: 'Terminal 1, Gate B12',
        duration: '2h 20m',
      },
      {
        id: 'f2',
        route: 'Bangkok → Hanoi',
        date: 'July 25, 2025',
        time: '9:30 AM',
        airline: 'VietJet Air',
        bookingRef: 'VJ-33901',
        terminal: 'Suvarnabhumi, Gate D5',
        duration: '1h 55m',
      },
    ],
  },
  {
    id: '2',
    title: 'Montreal / Ottawa',
    emoji: '🇨🇦',
    dateRange: 'Sep 2025',
    flights: [
      {
        id: 'f3',
        route: 'Vancouver → Montreal',
        date: 'September 12, 2025',
        time: '7:15 AM',
        airline: 'Air Canada',
        bookingRef: 'AC-55902',
        terminal: 'YVR International, Gate C44',
        duration: '4h 45m',
      },
    ],
  },
];
