import { describe, expect, it, vi } from 'vitest';
import { fetchNotionFlightPages, mapNotionFlightPagesToTrips, NotionMappingError } from '../src/lib/flightsSync/notionMapper';

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

function selectValue(value: string): NotionProperty {
  return {
    type: 'select',
    select: { name: value },
  };
}

function dateValue(value: string): NotionProperty {
  return {
    type: 'date',
    date: { start: value },
  };
}

function formulaStringValue(value: string): NotionProperty {
  return {
    type: 'formula',
    formula: { type: 'string', string: value },
  };
}

function relationValue(id: string): NotionProperty {
  return {
    type: 'relation',
    relation: [{ id }],
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
        from_city: richText(''),
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

  it('supports common aliases for departure/arrival fields', () => {
    const page = createPage() as { properties: Record<string, NotionProperty> };
    const originalProperties = page.properties;

    page.properties = {
      trip_id: originalProperties.trip_id,
      trip_title: originalProperties.trip_title,
      booking_id: originalProperties.booking_id,
      booking_label: originalProperties.booking_label,
      status: originalProperties.status,
      flight_number: originalProperties.flight_number,
      from_city: originalProperties.from_city,
      from_code: originalProperties.from_code,
      to_city: originalProperties.to_city,
      to_code: originalProperties.to_code,
      departure: originalProperties.departure_iso,
      arrival: originalProperties.arrival_iso,
      leg_index: originalProperties.leg_index,
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

  it('maps flights using the provided Notion schema field names', () => {
    const pages = [
      {
        properties: {
          Name: titleText('YVR → BKK'),
          Airline: selectValue('ANA'),
          'Flight Number': richText('NH115'),
          'Booking Number': richText('EQO9VF'),
          'From Airport': richText('YVR'),
          'From City': richText('Vancouver'),
          'To Airport': richText('HND'),
          'To City': richText('Tokyo'),
          'Departure Time': dateValue('2026-07-15T16:45:00-07:00'),
          'Arrival Time': dateValue('2026-07-16T19:00:00+09:00'),
          Seats: richText('38D/38F'),
          Status: formulaStringValue('booked'),
          Trip: relationValue('sea-japan'),
        },
      },
    ];

    const trips = mapNotionFlightPagesToTrips(pages);

    expect(trips).toHaveLength(1);
    expect(trips[0].id).toBe('sea-japan');
    expect(trips[0].bookings[0].id).toBe('EQO9VF');
    expect(trips[0].bookings[0].label).toBe('YVR → BKK');
    expect(trips[0].bookings[0].legs[0].fromCode).toBe('YVR');
    expect(trips[0].bookings[0].legs[0].toCode).toBe('HND');
  });

  it('uses default trip env fallback when Trip relation is empty', () => {
    const originalTripId = process.env.NOTION_DEFAULT_TRIP_ID;
    const originalTripTitle = process.env.NOTION_DEFAULT_TRIP_TITLE;
    process.env.NOTION_DEFAULT_TRIP_ID = 'sea-japan';
    process.env.NOTION_DEFAULT_TRIP_TITLE = 'Asia Backpacking';

    try {
      const pages = [
        {
          properties: {
            Name: titleText('YVR → HND'),
            Airline: selectValue('ANA'),
            'Flight Number': richText('NH115'),
            'Booking Number': richText('EQO9VF'),
            'From Airport': richText('YVR'),
            'From City': richText('Vancouver'),
            'To Airport': richText('HND'),
            'To City': richText('Tokyo'),
            'Departure Time': dateValue('2026-07-15T16:45:00-07:00'),
            'Arrival Time': dateValue('2026-07-16T19:00:00+09:00'),
            Seats: richText('38D/38F'),
            Status: formulaStringValue('booked'),
            Trip: relationValue(''),
          },
        },
      ];

      const trips = mapNotionFlightPagesToTrips(pages);
      expect(trips[0].id).toBe('sea-japan');
      expect(trips[0].title).toBe('Asia Backpacking');
    } finally {
      if (originalTripId === undefined) {
        delete process.env.NOTION_DEFAULT_TRIP_ID;
      } else {
        process.env.NOTION_DEFAULT_TRIP_ID = originalTripId;
      }
      if (originalTripTitle === undefined) {
        delete process.env.NOTION_DEFAULT_TRIP_TITLE;
      } else {
        process.env.NOTION_DEFAULT_TRIP_TITLE = originalTripTitle;
      }
    }
  });

  it('hydrates trip title from Trip relation pages during fetch', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/databases/')) {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                properties: {
                  Trip: relationValue('trip-page-1'),
                  Name: titleText('YVR → HND'),
                  'Flight Number': richText('NH115'),
                  'Booking Number': richText('EQO9VF'),
                  Status: formulaStringValue('booked'),
                  'From Airport': richText('YVR'),
                  'From City': richText('Vancouver'),
                  'To Airport': richText('HND'),
                  'To City': richText('Tokyo'),
                  'Departure Time': dateValue('2026-07-15T16:45:00-07:00'),
                  'Arrival Time': dateValue('2026-07-16T19:00:00+09:00'),
                },
              },
            ],
            has_more: false,
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          properties: {
            Name: titleText('Asia Backpacking'),
          },
        }),
      };
    });

    const pages = await fetchNotionFlightPages({
      notionToken: 'token',
      databaseId: 'db-id',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const trips = mapNotionFlightPagesToTrips(pages);
    expect(trips[0].title).toBe('Asia Backpacking');
  });

  it('hydrates empty Trip relation via page property endpoint', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/databases/')) {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                id: 'flight-page-1',
                properties: {
                  Trip: { id: 'tripProp1', type: 'relation', relation: [] },
                  Name: titleText('YVR → HND'),
                  'Flight Number': richText('NH115'),
                  'Booking Number': richText('EQO9VF'),
                  Status: formulaStringValue('booked'),
                  'From Airport': richText('YVR'),
                  'From City': richText('Vancouver'),
                  'To Airport': richText('HND'),
                  'To City': richText('Tokyo'),
                  'Departure Time': dateValue('2026-07-15T16:45:00-07:00'),
                  'Arrival Time': dateValue('2026-07-16T19:00:00+09:00'),
                },
              },
            ],
            has_more: false,
          }),
        };
      }

      if (url.includes('/pages/flight-page-1/properties/tripProp1')) {
        return {
          ok: true,
          json: async () => ({
            results: [{ type: 'relation', relation: { id: 'sea-japan' } }],
            has_more: false,
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          properties: {
            Name: titleText('Asia Backpacking'),
          },
        }),
      };
    });

    const pages = await fetchNotionFlightPages({
      notionToken: 'token',
      databaseId: 'db-id',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const trips = mapNotionFlightPagesToTrips(pages);
    expect(trips[0].id).toBe('sea-japan');
    expect(trips[0].title).toBe('Asia Backpacking');
  });

  it('throws when Trip relation is empty and booking number cannot be inferred', () => {
    const pages = [
      {
        properties: {
          Name: titleText('YVR → HND'),
          Airline: selectValue('ANA'),
          'Flight Number': richText('NH115'),
          'Booking Number': richText('EQO9VF'),
          'From Airport': richText('YVR'),
          'From City': richText('Vancouver'),
          'To Airport': richText('HND'),
          'To City': richText('Tokyo'),
          'Departure Time': dateValue('2026-07-15T16:45:00-07:00'),
          'Arrival Time': dateValue('2026-07-16T19:00:00+09:00'),
          Status: formulaStringValue('booked'),
          Trip: relationValue(''),
        },
      },
    ];

    expect(() => mapNotionFlightPagesToTrips(pages)).toThrow('No valid flight rows found in Notion');
  });

  it('maps Upcoming status as booked', () => {
    const pages = [
      {
        properties: {
          Name: titleText('YVR → HND'),
          Airline: selectValue('ANA'),
          'Flight Number': richText('NH115'),
          'Booking Number': richText('EQO9VF'),
          'From Airport': richText('YVR'),
          'From City': richText('Vancouver'),
          'To Airport': richText('HND'),
          'To City': richText('Tokyo'),
          'Departure Time': dateValue('2026-07-15T16:45:00-07:00'),
          'Arrival Time': dateValue('2026-07-16T19:00:00+09:00'),
          Status: formulaStringValue('Upcoming'),
          Trip: relationValue('sea-japan'),
        },
      },
    ];

    const trips = mapNotionFlightPagesToTrips(pages);
    expect(trips[0].bookings[0].status).toBe('booked');
  });
});
