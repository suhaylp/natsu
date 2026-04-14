import { describe, expect, it } from 'vitest';
import { mapNotionHotelPagesToTrips } from '../src/lib/flightsSync/notionHotelsMapper';
import { NotionMappingError } from '../src/lib/flightsSync/notionMapper';

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

function relationValue(id: string): NotionProperty {
  return {
    type: 'relation',
    relation: [{ id }],
  };
}

function dateValue(value: string): NotionProperty {
  return {
    type: 'date',
    date: { start: value },
  };
}

describe('mapNotionHotelPagesToTrips', () => {
  it('maps a hotel row into a hotel booking', () => {
    const pages = [
      {
        id: 'hotel-row-1',
        properties: {
          Trip: relationValue('sea-japan'),
          'Trip Title': richText('Asia Backpacking'),
          Name: titleText('Hotel Nikko'),
          Status: richText('booked'),
          'Check In': dateValue('2026-07-19T15:00:00+09:00'),
          'Check Out': dateValue('2026-07-22T11:00:00+09:00'),
          Confirmation: richText('CONF123'),
          City: richText('Tokyo'),
          Address: richText('1 Chome-1-1 Shimbashi'),
          'Room Type': richText('Deluxe Twin'),
          Provider: richText('Booking.com'),
          Nights: richText('3'),
        },
      },
    ];

    const trips = mapNotionHotelPagesToTrips(pages as never);
    expect(trips).toHaveLength(1);
    expect(trips[0].id).toBe('sea-japan');
    expect(trips[0].bookings).toHaveLength(1);
    expect(trips[0].bookings[0].type).toBe('hotel');
    expect(trips[0].bookings[0].hotelStay?.name).toBe('Hotel Nikko');
    expect(trips[0].bookings[0].hotelStay?.checkOutDate).toBe('Jul 22');
  });

  it('infers trip by title when trip relation is empty', () => {
    const pages = [
      {
        id: 'hotel-row-2',
        properties: {
          Trip: relationValue(''),
          'Trip Title': richText('Asia Backpacking'),
          Name: titleText('Hotel Test'),
          Status: richText('booked'),
          'Check In': dateValue('2026-07-20T15:00:00+09:00'),
        },
      },
    ];

    const trips = mapNotionHotelPagesToTrips(pages as never);
    expect(trips[0].id).toBe('sea-japan');
    expect(trips[0].title).toBe('Asia Backpacking');
  });

  it('throws when no trip can be resolved', () => {
    const pages = [
      {
        id: 'hotel-row-3',
        properties: {
          Name: titleText('Unknown Hotel'),
          Status: richText('booked'),
        },
      },
    ];

    expect(() => mapNotionHotelPagesToTrips(pages as never)).toThrow(NotionMappingError);
  });
});
