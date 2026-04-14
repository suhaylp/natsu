import type { FlightsApiErrorCode, FlightsApiErrorResponse, FlightsApiResponse } from '../src/lib/flightsSync/contracts';
import type { Booking, Trip } from '../src/data/trips';
import {
  fetchNotionFlightPages,
  mapNotionFlightPagesToTripsWithDiagnostics,
  NotionFetchError,
  NotionMappingError,
} from '../src/lib/flightsSync/notionMapper';
import { fetchNotionHotelPages, mapNotionHotelPagesToTripsWithDiagnostics } from '../src/lib/flightsSync/notionHotelsMapper';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, unknown>;
};

type FlightsApiDebugResponse = FlightsApiResponse & {
  debug: {
    flights: {
      pagesFetched: number;
      mappedRows: number;
      skippedRows: number;
      skippedRowErrors: string[];
    };
    hotels: {
      databaseId: string | null;
      pagesFetched: number;
      mappedRows: number;
      skippedRows: number;
      skippedRowErrors: string[];
      error?: string;
    };
  };
};

type ApiResponse = {
  status: (statusCode: number) => ApiResponse;
  json: (payload: FlightsApiResponse | FlightsApiDebugResponse | FlightsApiErrorResponse) => void;
  setHeader?: (headerName: string, value: string) => void;
};

function getHeaderValue(headers: ApiRequest['headers'], key: string): string | undefined {
  if (!headers) {
    return undefined;
  }

  const rawValue = headers[key] ?? headers[key.toLowerCase()];

  if (Array.isArray(rawValue)) {
    return rawValue[0];
  }

  return rawValue;
}

function getApiKeyFromRequest(req: ApiRequest): string | undefined {
  const directKey = getHeaderValue(req.headers, 'x-api-key');
  if (directKey) {
    return directKey;
  }

  const authorizationHeader = getHeaderValue(req.headers, 'authorization');
  if (!authorizationHeader) {
    return undefined;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() === 'bearer' && token) {
    return token;
  }

  return undefined;
}

function getQueryValue(query: ApiRequest['query'], key: string): string | undefined {
  if (!query) {
    return undefined;
  }

  const rawValue = query[key] ?? query[key.toLowerCase()];
  if (typeof rawValue === 'string') {
    return rawValue;
  }
  if (Array.isArray(rawValue)) {
    const firstString = rawValue.find((value) => typeof value === 'string');
    return typeof firstString === 'string' ? firstString : undefined;
  }

  return undefined;
}

function isDebugRequested(req: ApiRequest): boolean {
  const debugValue = getQueryValue(req.query, 'debug');
  if (!debugValue) {
    return false;
  }

  const normalized = debugValue.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function sendError(res: ApiResponse, statusCode: number, code: FlightsApiErrorCode, message: string, details?: string) {
  return res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

function normalizeTripTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

function mergeRemoteTrips(...tripGroups: Trip[][]): Trip[] {
  const mergedTrips: Trip[] = [];

  for (const trip of tripGroups.flat()) {
    const match = mergedTrips.find(
      (candidate) => candidate.id === trip.id || normalizeTripTitle(candidate.title) === normalizeTripTitle(trip.title)
    );

    if (!match) {
      mergedTrips.push({
        ...trip,
        bookings: [...trip.bookings],
      });
      continue;
    }

    const bookingByIdentity = new Map<string, Booking>(
      match.bookings.map((booking) => [`${booking.type}:${booking.id}`, booking])
    );
    for (const booking of trip.bookings) {
      bookingByIdentity.set(`${booking.type}:${booking.id}`, booking);
    }

    match.bookings = Array.from(bookingByIdentity.values());

    if ((!match.emoji || match.emoji === '✈️') && trip.emoji) {
      match.emoji = trip.emoji;
    }
    if (!match.dateRange || match.dateRange === 'TBD') {
      match.dateRange = trip.dateRange;
    }
  }

  return mergedTrips;
}

const fallbackHotelsDbId = '341e0e6fb1188020b7d4ee19676951b2';

export async function flightsHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    if (res.setHeader) {
      res.setHeader('Allow', 'GET');
    }

    sendError(res, 405, 'method_not_allowed', 'Use GET for this endpoint');
    return;
  }

  const notionToken = process.env.NOTION_TOKEN;
  const notionFlightsDbId = process.env.NOTION_FLIGHTS_DB_ID;
  const notionHotelsDbId = process.env.NOTION_HOTELS_DB_ID?.trim() || fallbackHotelsDbId;
  const flightsSyncApiKey = process.env.FLIGHTS_SYNC_API_KEY;

  if (!notionToken || !notionFlightsDbId || !flightsSyncApiKey) {
    sendError(
      res,
      500,
      'misconfigured',
      'Missing required server env vars: NOTION_TOKEN, NOTION_FLIGHTS_DB_ID, FLIGHTS_SYNC_API_KEY'
    );
    return;
  }

  const requestApiKey = getApiKeyFromRequest(req);

  if (!requestApiKey || requestApiKey !== flightsSyncApiKey) {
    sendError(res, 401, 'unauthorized', 'Invalid API key');
    return;
  }

  try {
    const includeDebug = isDebugRequested(req);
    const flightPages = await fetchNotionFlightPages({
      notionToken,
      databaseId: notionFlightsDbId,
    });

    const { trips: flightTrips, diagnostics: flightDiagnostics } = mapNotionFlightPagesToTripsWithDiagnostics(flightPages);

    let hotelPagesCount = 0;
    let hotelTrips: Trip[] = [];
    let hotelDiagnostics = {
      mappedRows: 0,
      skippedRows: 0,
      rowErrors: [] as string[],
    };
    let hotelError: string | undefined;

    if (notionHotelsDbId) {
      try {
        const hotelPages = await fetchNotionHotelPages({
          notionToken,
          databaseId: notionHotelsDbId,
        });
        hotelPagesCount = hotelPages.length;
        const hotelMappingResult = mapNotionHotelPagesToTripsWithDiagnostics(hotelPages);
        hotelTrips = hotelMappingResult.trips;
        hotelDiagnostics = {
          mappedRows: hotelMappingResult.diagnostics.mappedRows,
          skippedRows: hotelMappingResult.diagnostics.skippedRows,
          rowErrors: hotelMappingResult.diagnostics.rowErrors,
        };
      } catch (error) {
        if (error instanceof NotionFetchError || error instanceof NotionMappingError) {
          hotelError = `${error.message}${error.details ? ` | ${error.details}` : ''}`;
        } else {
          throw error;
        }
      }
    }

    const trips = mergeRemoteTrips(flightTrips, hotelTrips);

    const basePayload: FlightsApiResponse = {
      generatedAt: new Date().toISOString(),
      trips,
    };

    if (includeDebug) {
      const debugPayload: FlightsApiDebugResponse = {
        ...basePayload,
        debug: {
          flights: {
            pagesFetched: flightPages.length,
            mappedRows: flightDiagnostics.mappedRows,
            skippedRows: flightDiagnostics.skippedRows,
            skippedRowErrors: flightDiagnostics.rowErrors.slice(0, 50),
          },
          hotels: {
            databaseId: notionHotelsDbId || null,
            pagesFetched: hotelPagesCount,
            mappedRows: hotelDiagnostics.mappedRows,
            skippedRows: hotelDiagnostics.skippedRows,
            skippedRowErrors: hotelDiagnostics.rowErrors.slice(0, 50),
            ...(hotelError ? { error: hotelError } : {}),
          },
        },
      };
      res.status(200).json(debugPayload);
      return;
    }

    res.status(200).json(basePayload);
  } catch (error) {
    if (error instanceof NotionFetchError) {
      sendError(res, 502, 'notion_error', error.message, error.details);
      return;
    }

    if (error instanceof NotionMappingError) {
      sendError(res, 422, 'mapping_error', error.message, error.details);
      return;
    }

    sendError(
      res,
      500,
      'unknown_error',
      'Unexpected backend error',
      error instanceof Error ? error.message : undefined
    );
  }
}

export default flightsHandler;
