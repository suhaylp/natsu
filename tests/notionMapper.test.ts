import { describe, expect, it } from 'vitest';
import { mapNotionFlightPagesToTrips, NotionMappingError } from '../src/lib/flightsSync/notionMapper';

type NotionProperty = Record<string, unknown>;

function richText(value: string): NotionProperty {
  return {
    type: 'rich_text',
    rich_text: [{ plain_text: value }],
  };
}

function titleText(value: string): NotionProperty {
  return {
    type: 'title',
    title: [{ plain_text: value }],
  };
}

function numberValue(value: number): NotionProperty {
  return {
    type: 'number',
    number: value,
  };
}

function statusValue(value: string): NotionProperty {
  return {
    type: 'status',
    status: { name: value },
  };
}

function createPage(overrides: Record<string, NotionProperty> = {}) {
  return {
    properties: {
      trip_id: richText('euro-trip'),
      trip_title: titleText('Europe Loop'),
      booking_id: richText('booking-1'),
      booking_label: richText('Vancouver to London'),
      status: statusValue('booked'),
      flight_number: richText('BA84'),
      from_city: richText('Vancouver'),
      from_code: richText('YVR'),
      to_city: richText('London'),
      to_code: richText('LHR'),
      departure_iso: richText('2026-09-03T20:25:00-07:00'),
      arrival_iso: richText('2026-09-04T13:05:00+01:00'),
      leg_index: numberValue(1),
      ...overrides,
    },
  };
}

describe('mapNotionFlightPagesToTrips', () => {
  it('maps and groups flight legs by booking id with leg order', () => {
    const pages = [
      createPage({
        flight_number: richText('BA086'),
        from_city: richText('London'),
        from_code: richText('LHR'),
        to_city: richText('Paris'),
        to_code: richText('CDG'),
        departure_iso: richText('2026-09-05T08:30:00+01:00'),
        arrival_iso: richText('2026-09-05T10:20:00+02:00'),
        leg_index: numberValue(2),
      }),
      createPage({
        leg_index: numberValue(1),
      }),
    ];

    const trips = mapNotionFlightPagesToTrips(pages);

    expect(trips).toHaveLength(1);
    expect(trips[0].bookings).toHaveLength(1);
    expect(trips[0].bookings[0].legs).toHaveLength(2);
    expect(trips[0].bookings[0].legs[0].flightNumber).toBe('BA84');
    expect(trips[0].bookings[0].legs[1].flightNumber).toBe('BA086');
  });

  it('maps optional seat and baggage fields', () => {
    const pages = [
      createPage({
        seat_suhayl: richText('12A'),
        seat_natalia: richText('12B'),
        carry_on: richText('1 each'),
        check_in: richText('1 shared'),
      }),
    ];

    const trips = mapNotionFlightPagesToTrips(pages);
    const booking = trips[0].bookings[0];

    expect(booking.legs[0].seats).toEqual({ suhayl: '12A', natalia: '12B' });
    expect(booking.baggage).toEqual({ carryOn: '1 each', checkIn: '1 shared' });
  });

  it('throws mapping errors for missing required properties', () => {
    const pages = [
      createPage({
        booking_id: richText(''),
      }),
    ];

    expect(() => mapNotionFlightPagesToTrips(pages)).toThrow(NotionMappingError);
  });

  it('supports normalized Notion property names', () => {
    const page = createPage() as { properties: Record<string, NotionProperty> };
    const originalProperties = page.properties;

    page.properties = {
      'trip id': originalProperties.trip_id,
      'Trip Title': originalProperties.trip_title,
      booking_id: originalProperties.booking_id,
      booking_label: originalProperties.booking_label,
      status: originalProperties.status,
      flight_number: originalProperties.flight_number,
      from_city: originalProperties.from_city,
      from_code: originalProperties.from_code,
      to_city: originalProperties.to_city,
      to_code: originalProperties.to_code,
      'departure iso': originalProperties.departure_iso,
      'arrival-iso': originalProperties.arrival_iso,
      'leg index': originalProperties.leg_index,
    };

    const trips = mapNotionFlightPagesToTrips([page]);
    expect(trips).toHaveLength(1);
    expect(trips[0].bookings[0].legs[0].flightNumber).toBe('BA84');
  });

  it('skips invalid rows when at least one valid row exists', () => {
    const validPage = createPage();
    const invalidPage = createPage({
      departure_iso: richText(''),
    });

    const trips = mapNotionFlightPagesToTrips([validPage, invalidPage]);
    expect(trips).toHaveLength(1);
    expect(trips[0].bookings).toHaveLength(1);
    expect(trips[0].bookings[0].legs).toHaveLength(1);
  });
});
