import type { FlightsApiErrorCode, FlightsApiErrorResponse, FlightsApiResponse } from '../src/lib/flightsSync/contracts';
import {
  fetchNotionFlightPages,
  mapNotionFlightPagesToTripsWithDiagnostics,
  NotionFetchError,
  NotionMappingError,
} from '../src/lib/flightsSync/notionMapper';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
};

type FlightsApiDebugResponse = FlightsApiResponse & {
  debug: {
    pagesFetched: number;
    mappedRows: number;
    skippedRows: number;
    skippedRowErrors: string[];
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
  if (Array.isArray(rawValue)) {
    return rawValue[0];
  }

  return rawValue;
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
    const pages = await fetchNotionFlightPages({
      notionToken,
      databaseId: notionFlightsDbId,
    });

    const { trips, diagnostics } = mapNotionFlightPagesToTripsWithDiagnostics(pages);

    const basePayload: FlightsApiResponse = {
      generatedAt: new Date().toISOString(),
      trips,
    };

    if (includeDebug) {
      const debugPayload: FlightsApiDebugResponse = {
        ...basePayload,
        debug: {
          pagesFetched: pages.length,
          mappedRows: diagnostics.mappedRows,
          skippedRows: diagnostics.skippedRows,
          skippedRowErrors: diagnostics.rowErrors.slice(0, 50),
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
