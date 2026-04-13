import type { FlightsApiErrorCode, FlightsApiErrorResponse, FlightsApiResponse } from '../src/lib/flightsSync/contracts';
import {
  fetchNotionFlightPages,
  mapNotionFlightPagesToTrips,
  NotionFetchError,
  NotionMappingError,
} from '../src/lib/flightsSync/notionMapper';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (statusCode: number) => ApiResponse;
  json: (payload: FlightsApiResponse | FlightsApiErrorResponse) => void;
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
    const pages = await fetchNotionFlightPages({
      notionToken,
      databaseId: notionFlightsDbId,
    });

    const trips = mapNotionFlightPagesToTrips(pages);

    res.status(200).json({
      generatedAt: new Date().toISOString(),
      trips,
    });
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
