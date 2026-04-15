import { describe, expect, it } from 'vitest';
import { mapNotionIdeaPagesToTrips } from '../src/lib/flightsSync/notionIdeasMapper';
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
    relation: id ? [{ id }] : [],
  };
}

function dateValue(value: string): NotionProperty {
  return {
    type: 'date',
    date: { start: value },
  };
}

function selectValue(value: string): NotionProperty {
  return {
    type: 'select',
    select: { name: value },
  };
}

function checkboxValue(value: boolean): NotionProperty {
  return {
    type: 'checkbox',
    checkbox: value,
  };
}

function numberValue(value: number): NotionProperty {
  return {
    type: 'number',
    number: value,
  };
}

function filesValue(url: string): NotionProperty {
  return {
    type: 'files',
    files: [
      {
        type: 'external',
        external: { url },
      },
    ],
  };
}

describe('mapNotionIdeaPagesToTrips', () => {
  it('maps an ideas row into an event booking', () => {
    const pages = [
      {
        id: 'idea-row-1',
        properties: {
          Trip: relationValue('sea-japan'),
          'Trip Title': richText('Asia Backpacking'),
          Name: titleText('Elephant Sanctuary Visit'),
          Type: selectValue('Event'),
          Status: checkboxValue(true),
          Address: richText('Elephant Nature Park'),
          City: selectValue('Chiang Mai'),
          Country: selectValue('Thailand'),
          Description: richText('Day trip idea'),
          Price: numberValue(80),
          Photos: filesValue('https://example.com/elephant.jpg'),
          Date: dateValue('2026-07-26T09:00:00+07:00'),
        },
      },
    ];

    const trips = mapNotionIdeaPagesToTrips(pages as never);

    expect(trips).toHaveLength(1);
    expect(trips[0].id).toBe('sea-japan');
    expect(trips[0].bookings).toHaveLength(1);
    expect(trips[0].bookings[0].type).toBe('event');
    expect(trips[0].bookings[0].status).toBe('booked');
    expect(trips[0].bookings[0].activityLocation).toContain('Elephant Nature Park');
    expect(trips[0].bookings[0].notes).toContain('Price: $80');
    expect(trips[0].bookings[0].imageUrl).toBe('https://example.com/elephant.jpg');
  });

  it('infers trip by title when trip relation is empty', () => {
    const pages = [
      {
        id: 'idea-row-2',
        properties: {
          Trip: relationValue(''),
          'Trip Title': richText('Asia Backpacking'),
          Name: titleText('Night Market Walk'),
          Type: selectValue('Food Tour'),
          Status: checkboxValue(false),
        },
      },
    ];

    const trips = mapNotionIdeaPagesToTrips(pages as never);
    expect(trips[0].id).toBe('sea-japan');
    expect(trips[0].bookings[0].type).toBe('food-tour');
    expect(trips[0].bookings[0].status).toBe('not_booked');
  });

  it('prefers local trip inference when relation contains a Notion page id', () => {
    const pages = [
      {
        id: 'idea-row-2b',
        properties: {
          Trip: relationValue('343e0e6f-b118-8000-bb6e-e72c91cd9c54'),
          Name: titleText('Sunday Walking Street'),
          Type: selectValue('Event'),
          Status: checkboxValue(false),
          Date: dateValue('2026-07-20T18:30:00+07:00'),
        },
      },
    ];

    const trips = mapNotionIdeaPagesToTrips(pages as never);
    expect(trips[0].id).toBe('sea-japan');
    expect(trips[0].title).toBe('Asia Backpacking');
  });

  it('throws when no trip can be resolved', () => {
    const pages = [
      {
        id: 'idea-row-3',
        properties: {
          Name: titleText('Unknown Idea'),
          Status: checkboxValue(false),
        },
      },
    ];

    expect(() => mapNotionIdeaPagesToTrips(pages as never)).toThrow(NotionMappingError);
  });
});
