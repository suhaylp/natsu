import { describe, expect, it } from 'vitest';
import type { Trip } from '../src/data/trips';
import { mergeTripsWithRemoteFlights } from '../src/lib/flightsSync/mergeTrips';

describe('mergeTripsWithRemoteFlights', () => {
  it('replaces only flight bookings and keeps local non-flight bookings', () => {
    const localTrips: Trip[] = [
      {
        id: 'trip-1',
        title: 'Local Trip',
        emoji: '🌍',
        dateRange: 'Sep 1 – 3, 2026',
        bookings: [
          {
            id: 'old-flight',
            type: 'flight',
            status: 'booked',
            label: 'Old flight',
            legs: [
              {
                flightNumber: 'AC100',
                fromCity: 'Vancouver',
                fromCode: 'YVR',
                toCity: 'Seattle',
                toCode: 'SEA',
                departureTime: '08:00',
                departureDate: 'Sep 1',
                arrivalTime: '09:00',
                arrivalDate: 'Sep 1',
              },
            ],
          },
          {
            id: 'concert-1',
            type: 'concert',
            status: 'booked',
            label: 'Live show',
            legs: [],
            activityDate: 'Sep 2',
            activityTime: '20:00',
          },
        ],
      },
    ];

    const remoteTrips: Trip[] = [
      {
        id: 'trip-1',
        title: 'Remote Trip',
        emoji: '✈️',
        dateRange: 'Sep 1 – 3, 2026',
        bookings: [
          {
            id: 'new-flight',
            type: 'flight',
            status: 'booked',
            label: 'New flight',
            legs: [
              {
                flightNumber: 'AC200',
                fromCity: 'Vancouver',
                fromCode: 'YVR',
                toCity: 'Seattle',
                toCode: 'SEA',
                departureTime: '10:00',
                departureDate: 'Sep 1',
                arrivalTime: '11:00',
                arrivalDate: 'Sep 1',
              },
            ],
          },
        ],
      },
    ];

    const merged = mergeTripsWithRemoteFlights(localTrips, remoteTrips);

    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('Local Trip');
    expect(merged[0].bookings.map((booking) => booking.id)).toEqual(['new-flight', 'concert-1']);
  });

  it('adds remote-only trips with flight bookings', () => {
    const localTrips: Trip[] = [];
    const remoteTrips: Trip[] = [
      {
        id: 'remote-only',
        title: 'Remote Only',
        emoji: '🧭',
        dateRange: 'Oct 4 – 8, 2026',
        bookings: [
          {
            id: 'flight-a',
            type: 'flight',
            status: 'booked',
            label: 'A',
            legs: [
              {
                flightNumber: 'LX12',
                fromCity: 'Zurich',
                fromCode: 'ZRH',
                toCity: 'Paris',
                toCode: 'CDG',
                departureTime: '07:00',
                departureDate: 'Oct 4',
                arrivalTime: '08:20',
                arrivalDate: 'Oct 4',
              },
            ],
          },
        ],
      },
    ];

    const merged = mergeTripsWithRemoteFlights(localTrips, remoteTrips);

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('remote-only');
    expect(merged[0].bookings).toHaveLength(1);
    expect(merged[0].bookings[0].type).toBe('flight');
  });

  it('matches remote trip by title when trip id differs', () => {
    const localTrips: Trip[] = [
      {
        id: 'sea-japan',
        title: 'Asia Backpacking',
        emoji: '🎒🌏',
        dateRange: 'Jul 15 – Aug 24, 2026',
        bookings: [
          {
            id: 'old-flight',
            type: 'flight',
            status: 'booked',
            label: 'Old',
            legs: [
              {
                flightNumber: 'OLD1',
                fromCity: 'Vancouver',
                fromCode: 'YVR',
                toCity: 'Tokyo',
                toCode: 'HND',
                departureTime: '10:00',
                departureDate: 'Jul 15',
                arrivalTime: '12:00',
                arrivalDate: 'Jul 16',
              },
            ],
          },
        ],
      },
    ];

    const remoteTrips: Trip[] = [
      {
        id: 'notion-page-id-123',
        title: 'Asia Backpacking',
        emoji: '✈️',
        dateRange: 'Jul 15 – Aug 24, 2026',
        bookings: [
          {
            id: 'new-flight',
            type: 'flight',
            status: 'booked',
            label: 'New',
            legs: [
              {
                flightNumber: 'NH115',
                fromCity: 'Vancouver',
                fromCode: 'YVR',
                toCity: 'Tokyo',
                toCode: 'HND',
                departureTime: '16:45',
                departureDate: 'Jul 15',
                arrivalTime: '19:00',
                arrivalDate: 'Jul 16',
              },
            ],
          },
        ],
      },
    ];

    const merged = mergeTripsWithRemoteFlights(localTrips, remoteTrips);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('sea-japan');
    expect(merged[0].bookings.map((booking) => booking.id)).toEqual(['new-flight']);
  });
});
