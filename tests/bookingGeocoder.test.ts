import { describe, expect, it, vi } from 'vitest';
import type { Trip } from '../src/data/trips';
import { enrichTripsWithBookingCoordinates, extractCoordinatesFromText } from '../src/lib/flightsSync/bookingGeocoder';

describe('extractCoordinatesFromText', () => {
  it('parses coordinates from Google maps @lat,lon format', () => {
    const coordinates = extractCoordinatesFromText(
      'https://www.google.com/maps/place/Example/@18.785742,98.987152,17z/data=!3m1!4b1'
    );

    expect(coordinates).toEqual({
      latitude: 18.785742,
      longitude: 98.987152,
    });
  });

  it('does not mistake street numbers for coordinates', () => {
    const coordinates = extractCoordinatesFromText(
      '872, 8 Soi Thoet Thai 26, Talat Phlu, Thon Buri, Bangkok 10600, Thailand'
    );

    expect(coordinates).toBeNull();
  });
});

describe('enrichTripsWithBookingCoordinates', () => {
  it('uses direct coordinates from booking location text without geocoding request', async () => {
    const fetchMock = vi.fn<typeof fetch>();

    const trips: Trip[] = [
      {
        id: 'sea-japan',
        title: 'Asia Backpacking',
        emoji: '🎒🌏',
        dateRange: 'Jul 15 – Aug 24, 2026',
        bookings: [
          {
            id: 'idea-1',
            type: 'event',
            status: 'not_booked',
            label: 'Elephant Sanctuary Visit',
            legs: [],
            activityLocation: '18.785742, 98.987152 | Elephant Nature Park, Chiang Mai, Thailand',
          },
        ],
      },
    ];

    const enriched = await enrichTripsWithBookingCoordinates(trips, {
      enabled: true,
      fetchImpl: fetchMock,
    });

    expect(enriched[0].bookings[0].latitude).toBe(18.785742);
    expect(enriched[0].bookings[0].longitude).toBe(98.987152);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('geocodes hotel/event locations from text when coordinates are missing', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '18.787188', lon: '98.998337' }],
    } as Response);

    const trips: Trip[] = [
      {
        id: 'sea-japan',
        title: 'Asia Backpacking',
        emoji: '🎒🌏',
        dateRange: 'Jul 15 – Aug 24, 2026',
        bookings: [
          {
            id: 'hotel-1',
            type: 'hotel',
            status: 'booked',
            label: 'Pingviman Hotel',
            legs: [],
            activityLocation: 'Chiang Mai Gate, Chiang Mai, Thailand',
            hotelStay: {
              name: 'Pingviman Hotel',
              city: 'Chiang Mai',
              address: 'Chiang Mai Gate, Chiang Mai, Thailand',
            },
          },
        ],
      },
    ];

    const enriched = await enrichTripsWithBookingCoordinates(trips, {
      enabled: true,
      fetchImpl: fetchMock,
    });

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(enriched[0].bookings[0].latitude).toBeCloseTo(18.787188, 6);
    expect(enriched[0].bookings[0].longitude).toBeCloseTo(98.998337, 6);
  });
});
