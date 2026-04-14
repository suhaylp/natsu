import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flightsHandler } from '../api/flights';
import * as notionMapper from '../src/lib/flightsSync/notionMapper';
import * as notionHotelsMapper from '../src/lib/flightsSync/notionHotelsMapper';

function createMockResponse() {
  let statusCode = 200;
  let payload: unknown;
  const headers = new Map<string, string>();

  const response = {
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(body: unknown) {
      payload = body;
    },
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
  };

  return {
    response,
    getStatusCode: () => statusCode,
    getPayload: () => payload,
    getHeader: (name: string) => headers.get(name),
  };
}

describe('GET /api/flights', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NOTION_TOKEN = 'notion-token';
    process.env.NOTION_FLIGHTS_DB_ID = 'db-id';
    process.env.FLIGHTS_SYNC_API_KEY = 'shared-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it('returns 401 for an invalid API key', async () => {
    const response = createMockResponse();
    const fetchSpy = vi.spyOn(notionMapper, 'fetchNotionFlightPages').mockResolvedValue([]);

    await flightsHandler(
      {
        method: 'GET',
        headers: {
          'x-api-key': 'wrong-key',
        },
      },
      response.response
    );

    expect(response.getStatusCode()).toBe(401);
    expect(response.getPayload()).toMatchObject({
      error: {
        code: 'unauthorized',
      },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns 502 when Notion fetch fails', async () => {
    const response = createMockResponse();
    vi.spyOn(notionMapper, 'fetchNotionFlightPages').mockRejectedValue(
      new notionMapper.NotionFetchError('Failed to fetch flights from Notion', 502, 'gateway timeout')
    );

    await flightsHandler(
      {
        method: 'GET',
        headers: {
          'x-api-key': 'shared-key',
        },
      },
      response.response
    );

    expect(response.getStatusCode()).toBe(502);
    expect(response.getPayload()).toMatchObject({
      error: {
        code: 'notion_error',
      },
    });
  });

  it('returns live flights payload on success', async () => {
    const response = createMockResponse();

    vi.spyOn(notionMapper, 'fetchNotionFlightPages').mockResolvedValue([{ properties: {} }]);
    vi.spyOn(notionMapper, 'mapNotionFlightPagesToTripsWithDiagnostics').mockReturnValue({
      trips: [
        {
          id: 'trip-1',
          title: 'Trip 1',
          emoji: '✈️',
          dateRange: 'Sep 1 – 2, 2026',
          bookings: [
            {
              id: 'booking-1',
              type: 'flight',
              status: 'booked',
              label: 'Leg 1',
              legs: [
                {
                  flightNumber: 'AC1',
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
      ],
      diagnostics: {
        totalRows: 1,
        mappedRows: 1,
        skippedRows: 0,
        rowErrors: [],
      },
    });
    vi.spyOn(notionHotelsMapper, 'fetchNotionHotelPages').mockResolvedValue([]);
    vi.spyOn(notionHotelsMapper, 'mapNotionHotelPagesToTripsWithDiagnostics').mockImplementation(() => {
      throw new notionMapper.NotionMappingError('No valid hotel rows found in Notion');
    });

    await flightsHandler(
      {
        method: 'GET',
        headers: {
          'x-api-key': 'shared-key',
        },
      },
      response.response
    );

    expect(response.getStatusCode()).toBe(200);
    expect(response.getPayload()).toMatchObject({
      trips: [
        {
          id: 'trip-1',
        },
      ],
    });
  });

  it('includes diagnostics when debug=1 is requested', async () => {
    const response = createMockResponse();

    vi.spyOn(notionMapper, 'fetchNotionFlightPages').mockResolvedValue([{ properties: {} }, { properties: {} }]);
    vi.spyOn(notionMapper, 'mapNotionFlightPagesToTripsWithDiagnostics').mockReturnValue({
      trips: [
        {
          id: 'trip-1',
          title: 'Trip 1',
          emoji: '✈️',
          dateRange: 'Sep 1 – 2, 2026',
          bookings: [],
        },
      ],
      diagnostics: {
        totalRows: 2,
        mappedRows: 1,
        skippedRows: 1,
        rowErrors: ['Row 2: Missing required Notion property: trip_id'],
      },
    });
    vi.spyOn(notionHotelsMapper, 'fetchNotionHotelPages').mockResolvedValue([{ properties: {} }]);
    vi.spyOn(notionHotelsMapper, 'mapNotionHotelPagesToTripsWithDiagnostics').mockReturnValue({
      trips: [
        {
          id: 'trip-1',
          title: 'Trip 1',
          emoji: '🏨',
          dateRange: 'Sep 1 – 2, 2026',
          bookings: [
            {
              id: 'hotel-1',
              type: 'hotel',
              status: 'booked',
              label: 'Hotel',
              legs: [],
              activityDate: 'Sep 1',
            },
          ],
        },
      ],
      diagnostics: {
        totalRows: 1,
        mappedRows: 1,
        skippedRows: 0,
        rowErrors: [],
      },
    });

    await flightsHandler(
      {
        method: 'GET',
        headers: {
          'x-api-key': 'shared-key',
        },
        query: {
          debug: '1',
        },
      },
      response.response
    );

    expect(response.getStatusCode()).toBe(200);
    expect(response.getPayload()).toMatchObject({
      trips: [
        {
          id: 'trip-1',
        },
      ],
      debug: {
        flights: {
          pagesFetched: 2,
          mappedRows: 1,
          skippedRows: 1,
          skippedRowErrors: ['Row 2: Missing required Notion property: trip_id'],
        },
        hotels: {
          pagesFetched: 1,
          mappedRows: 1,
          skippedRows: 0,
        },
      },
    });
  });
});
