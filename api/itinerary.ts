import type {
  ItineraryApiErrorCode,
  ItineraryApiErrorResponse,
  ItineraryApiItem,
  ItineraryApiResponse,
  ItineraryCardType,
} from '../src/lib/itinerarySync/contracts';
import { fetchNotionFlightPages, NotionFetchError, NotionMappingError } from '../src/lib/flightsSync/notionMapper';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (statusCode: number) => ApiResponse;
  json: (payload: ItineraryApiResponse | ItineraryApiErrorResponse) => void;
  setHeader?: (headerName: string, value: string) => void;
};

type NotionRichText = { plain_text?: string };

type NotionSelectValue = { name?: string } | null;
type NotionMultiSelectValue = Array<{ name?: string }>;

type NotionProperty = {
  id?: string;
  type?: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  select?: NotionSelectValue;
  status?: NotionSelectValue;
  multi_select?: NotionMultiSelectValue;
  checkbox?: boolean;
  number?: number | null;
  date?: {
    start?: string | null;
    end?: string | null;
  } | null;
};

type NotionPage = {
  id: string;
  properties?: Record<string, NotionProperty>;
};

type ScheduleRow = {
  id: string;
  title: string;
  type: ItineraryCardType;
  time?: string;
  subtitle?: string;
  location?: string;
  note?: string;
  explicitCity?: string;
  routeDestinationCity?: string;
  dayNumbers: number[];
  dayLabel?: string;
  originIATA?: string;
  destIATA?: string;
  duration?: string;
  arrivalTime?: string;
  checkIn?: string;
  nights?: number;
  checkOut?: string;
};

const DEFAULT_TRIP_IDEAS_COLLECTION_ID = 'collection://343e0e6f-b118-807a-9bdb-000b6e4ffe0b';
const DEFAULT_SCHEDULE_COLLECTION_ID = 'collection://a44e0e6f-b118-82f9-9560-87a96527e9e3';

const CITY_ALIASES: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: 'Singapore', aliases: ['singapore'] },
  { canonical: 'Bangkok', aliases: ['bangkok'] },
  { canonical: 'Ko Tao', aliases: ['ko tao', 'koh tao'] },
  { canonical: 'Chiang Mai', aliases: ['chiang mai'] },
  { canonical: 'Chiang Rai', aliases: ['chiang rai'] },
  { canonical: 'Hanoi', aliases: ['hanoi'] },
  { canonical: 'Ha Long Bay', aliases: ['ha long bay', 'halong bay'] },
  { canonical: 'Da Nang/Hoi An', aliases: ['da nang', 'hoi an', 'da nang hoi an'] },
  { canonical: 'Ho Chi Minh City', aliases: ['ho chi minh city', 'saigon'] },
  { canonical: 'Tokyo', aliases: ['tokyo'] },
  { canonical: 'Montreal', aliases: ['montreal'] },
  { canonical: 'Ottawa', aliases: ['ottawa'] },
];

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

function sendError(
  res: ApiResponse,
  statusCode: number,
  code: ItineraryApiErrorCode,
  message: string,
  details?: string
) {
  return res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

function normalizeNotionPropertyKey(propertyKey: string): string {
  return propertyKey.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function normalizeLoose(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function canonicalCityLabel(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedValue = normalizeLoose(value);
  if (!normalizedValue) {
    return undefined;
  }

  for (const candidate of CITY_ALIASES) {
    if (candidate.aliases.some((alias) => normalizedValue.includes(normalizeLoose(alias)))) {
      return candidate.canonical;
    }
  }

  return toTitleCase(value.replace(/\s+/g, ' ').trim());
}

function readRichTextValue(entries?: NotionRichText[]): string | undefined {
  if (!Array.isArray(entries) || entries.length === 0) {
    return undefined;
  }

  const value = entries
    .map((entry) => entry?.plain_text?.trim() ?? '')
    .filter(Boolean)
    .join('')
    .trim();

  return value || undefined;
}

function readPropertyText(property?: NotionProperty): string | undefined {
  if (!property) {
    return undefined;
  }

  return (
    readRichTextValue(property.title) ??
    readRichTextValue(property.rich_text) ??
    property.select?.name?.trim() ??
    property.status?.name?.trim() ??
    undefined
  );
}

function readPropertyNumber(property?: NotionProperty): number | undefined {
  if (!property || typeof property.number !== 'number' || !Number.isFinite(property.number)) {
    return undefined;
  }

  return property.number;
}

function getPropertyByKey(properties: Record<string, NotionProperty>, key: string): NotionProperty | undefined {
  const normalizedKey = normalizeNotionPropertyKey(key);

  for (const [name, property] of Object.entries(properties)) {
    if (normalizeNotionPropertyKey(name) === normalizedKey) {
      return property;
    }
  }

  return undefined;
}

function readPropertySelectValue(property?: NotionProperty): string | undefined {
  if (!property) {
    return undefined;
  }

  return property.select?.name?.trim() ?? property.status?.name?.trim() ?? readPropertyText(property);
}

function readPropertyMultiSelect(property?: NotionProperty): string[] {
  if (!property || !Array.isArray(property.multi_select)) {
    return [];
  }

  return property.multi_select
    .map((entry) => entry?.name?.trim())
    .filter((name): name is string => Boolean(name));
}

function parseCollectionId(value: string): string {
  return value.replace(/^collection:\/\//i, '').trim();
}

function parseIataCodes(...values: Array<string | undefined>): string[] {
  const joined = values.filter(Boolean).join(' ');
  if (!joined) {
    return [];
  }

  const matches = joined.match(/\b[A-Z]{3}\b/g);
  if (!matches) {
    return [];
  }

  const deduped: string[] = [];
  matches.forEach((code) => {
    if (!deduped.includes(code)) {
      deduped.push(code);
    }
  });

  return deduped;
}

function parseDuration(note?: string): string | undefined {
  if (!note) {
    return undefined;
  }

  const durationMatch = note.match(/(\d+\s*h(?:\s*\d+\s*m)?|\d+\s*m)/i);
  return durationMatch?.[1]?.replace(/\s+/g, ' ').trim() || undefined;
}

function parseArrivalTime(note?: string): string | undefined {
  if (!note) {
    return undefined;
  }

  const arrivalMatch = note.match(/(?:arrive|arrival|eta)[^0-9]*(\d{1,2}:\d{2})/i);
  return arrivalMatch?.[1];
}

function parseNights(note?: string): number | undefined {
  if (!note) {
    return undefined;
  }

  const match = note.match(/(\d+)\s*nights?/i);
  if (!match?.[1]) {
    return undefined;
  }

  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.round(parsed);
}

function parseCheckDate(label: 'in' | 'out', note?: string): string | undefined {
  if (!note) {
    return undefined;
  }

  const pattern = label === 'in'
    ? /check[-\s]?in[^A-Za-z0-9]*([A-Za-z]{3,9}\s+\d{1,2}(?:,\s*\d{4})?|\d{4}-\d{2}-\d{2})/i
    : /check[-\s]?out[^A-Za-z0-9]*([A-Za-z]{3,9}\s+\d{1,2}(?:,\s*\d{4})?|\d{4}-\d{2}-\d{2})/i;

  const match = note.match(pattern);
  return match?.[1]?.trim();
}

function parseDayNumbers(dayFieldValues: string[]): number[] {
  const numbers: number[] = [];

  dayFieldValues.forEach((value) => {
    const matches = value.match(/day\s*(\d+)/gi);
    if (!matches) {
      return;
    }

    matches.forEach((token) => {
      const parsed = Number(token.replace(/[^0-9]/g, ''));
      if (Number.isFinite(parsed) && parsed > 0 && !numbers.includes(parsed)) {
        numbers.push(parsed);
      }
    });
  });

  return numbers.sort((a, b) => a - b);
}

function detectCityFromText(...values: Array<string | undefined>): string | undefined {
  const merged = values.filter(Boolean).join(' ');
  if (!merged) {
    return undefined;
  }

  return canonicalCityLabel(merged);
}

function parseRouteDestinationCity(name?: string, location?: string, note?: string): string | undefined {
  const combined = [name, location, note].filter(Boolean).join(' ');
  if (!combined) {
    return undefined;
  }

  const routeParts = combined.split(/(?:→|->| to )/i).map((part) => part.trim()).filter(Boolean);
  if (routeParts.length < 2) {
    return undefined;
  }

  return canonicalCityLabel(routeParts[routeParts.length - 1]);
}

function inferIdeaType(value?: string): ItineraryCardType {
  const normalized = normalizeLoose(value ?? '');
  if (normalized.includes('food')) {
    return 'food';
  }
  if (normalized.includes('sight')) {
    return 'sightseeing';
  }
  return 'activities';
}

function inferScheduleType(params: { title?: string; location?: string; note?: string }): ItineraryCardType {
  const normalized = normalizeLoose([params.title, params.location, params.note].filter(Boolean).join(' '));

  if (
    /(hotel|hostel|resort|check in|check-in|check out|check-out|accommodation|room|stay)/.test(normalized)
  ) {
    return 'hotel';
  }

  if (/(restaurant|food|dinner|lunch|brunch|street food|cafe)/.test(normalized)) {
    return 'food';
  }

  if (
    /(flight|airport|airline|depart|arrival|arrive|transfer|ferry|train|bus|terminal|gate)/.test(normalized) ||
    /\b[A-Z]{3}\b\s*(?:→|->|to)\s*\b[A-Z]{3}\b/.test([params.title, params.location, params.note].filter(Boolean).join(' '))
  ) {
    return 'flight';
  }

  if (/(museum|temple|shrine|landmark|tour|walking|old town|historic|sightseeing)/.test(normalized)) {
    return 'sightseeing';
  }

  return 'activities';
}

function mapIdeaPagesToItems(pages: NotionPage[]): ItineraryApiItem[] {
  const items: ItineraryApiItem[] = [];

  pages.forEach((page) => {
    if (!page.properties) {
      return;
    }

    const title = readPropertyText(getPropertyByKey(page.properties, 'Name'));
    const typeValue = readPropertySelectValue(getPropertyByKey(page.properties, 'Type'));
    const cityValue = readPropertySelectValue(getPropertyByKey(page.properties, 'City'));
    const country = readPropertySelectValue(getPropertyByKey(page.properties, 'Country'));
    const status = readPropertySelectValue(getPropertyByKey(page.properties, 'Status'));
    const description = readPropertyText(getPropertyByKey(page.properties, 'Description'));
    const address = readPropertyText(getPropertyByKey(page.properties, 'Address'));
    const price = readPropertyNumber(getPropertyByKey(page.properties, 'Price'));

    if (!title || !cityValue || !status) {
      return;
    }

    const normalizedStatus = normalizeLoose(status);
    if (normalizedStatus !== 'yes' && normalizedStatus !== 'maybe') {
      return;
    }

    const canonicalCity = canonicalCityLabel(cityValue) ?? cityValue;
    const type = inferIdeaType(typeValue);

    items.push({
      id: `idea-${page.id}`,
      source: 'ideas',
      type,
      city: canonicalCity,
      country: country || undefined,
      title,
      subtitle: description || address || undefined,
      time: undefined,
      timeSub: typeof price === 'number' ? `Price: $${price}` : undefined,
      confirmed: normalizedStatus === 'yes',
      status,
      location: address || undefined,
      note: description || undefined,
    });
  });

  return items;
}

function mapSchedulePagesToRows(pages: NotionPage[]): ScheduleRow[] {
  const rows: ScheduleRow[] = [];

  pages.forEach((page) => {
    if (!page.properties) {
      return;
    }

    const title = readPropertyText(getPropertyByKey(page.properties, 'Name'));
    if (!title) {
      return;
    }

    const time = readPropertyText(getPropertyByKey(page.properties, 'Time'));
    const dayProperty = getPropertyByKey(page.properties, 'Day #');
    const dayValues = readPropertyMultiSelect(dayProperty);
    const dayNumbers = parseDayNumbers(dayValues);
    const location = readPropertyText(getPropertyByKey(page.properties, 'Location'));
    const note = readPropertyText(getPropertyByKey(page.properties, 'Note'));
    const type = inferScheduleType({ title, location, note });

    const iataCodes = parseIataCodes(title.toUpperCase(), location?.toUpperCase(), note?.toUpperCase());
    const originIATA = iataCodes[0];
    const destIATA = iataCodes[1];

    rows.push({
      id: `schedule-${page.id}`,
      title,
      type,
      time: time || undefined,
      subtitle: location || undefined,
      location: location || undefined,
      note: note || undefined,
      explicitCity: detectCityFromText(location, title, note),
      routeDestinationCity: parseRouteDestinationCity(title, location, note),
      dayNumbers,
      dayLabel: dayValues[0],
      originIATA,
      destIATA,
      duration: parseDuration(note),
      arrivalTime: parseArrivalTime(note),
      checkIn: parseCheckDate('in', note),
      nights: parseNights(note),
      checkOut: parseCheckDate('out', note),
    });
  });

  return rows;
}

function buildDayToCityMap(rows: ScheduleRow[]): Map<number, string> {
  const dayToRows = new Map<number, ScheduleRow[]>();

  rows.forEach((row) => {
    row.dayNumbers.forEach((dayNumber) => {
      const existing = dayToRows.get(dayNumber) ?? [];
      existing.push(row);
      dayToRows.set(dayNumber, existing);
    });
  });

  const dayNumbers = Array.from(dayToRows.keys()).sort((a, b) => a - b);
  const dayToCity = new Map<number, string>();
  let lastCity: string | undefined;

  dayNumbers.forEach((dayNumber) => {
    const dayRows = dayToRows.get(dayNumber) ?? [];

    const hotelCity = dayRows.find((row) => row.type === 'hotel' && row.explicitCity)?.explicitCity;
    const nonFlightCity = dayRows.find((row) => row.type !== 'flight' && row.explicitCity)?.explicitCity;
    const routeDestinationCity = dayRows.find((row) => row.routeDestinationCity)?.routeDestinationCity;
    const explicitCity = dayRows.find((row) => row.explicitCity)?.explicitCity;

    const resolvedCity = hotelCity ?? nonFlightCity ?? routeDestinationCity ?? explicitCity ?? lastCity;

    if (resolvedCity) {
      dayToCity.set(dayNumber, resolvedCity);
      lastCity = resolvedCity;
    }
  });

  return dayToCity;
}

function rowsToScheduleItems(rows: ScheduleRow[]): ItineraryApiItem[] {
  const dayToCity = buildDayToCityMap(rows);
  const fallbackCity = dayToCity.values().next().value;
  const items: ItineraryApiItem[] = [];

  rows.forEach((row) => {
    const dayNumbers = row.dayNumbers.length > 0 ? row.dayNumbers : [undefined];

    dayNumbers.forEach((dayNumber, index) => {
      const resolvedCity = row.explicitCity ?? (dayNumber ? dayToCity.get(dayNumber) : undefined) ?? fallbackCity;
      if (!resolvedCity) {
        return;
      }

      items.push({
        id: dayNumbers.length > 1 ? `${row.id}-day-${String(dayNumber ?? index)}` : row.id,
        source: 'schedule',
        type: row.type,
        city: resolvedCity,
        title: row.title,
        subtitle: row.subtitle,
        time: row.time,
        timeSub: row.duration,
        confirmed: true,
        status: 'Yes',
        dayNumber,
        dayLabel: row.dayLabel,
        location: row.location,
        note: row.note,
        originIATA: row.originIATA,
        destIATA: row.destIATA,
        duration: row.duration,
        arrivalTime: row.arrivalTime,
        checkIn: row.checkIn,
        nights: row.nights,
        checkOut: row.checkOut,
      });
    });
  });

  return items;
}

function compareItems(a: ItineraryApiItem, b: ItineraryApiItem): number {
  const aDay = a.dayNumber ?? Number.POSITIVE_INFINITY;
  const bDay = b.dayNumber ?? Number.POSITIVE_INFINITY;

  if (aDay !== bDay) {
    return aDay - bDay;
  }

  const aTime = a.time ?? '99:99';
  const bTime = b.time ?? '99:99';
  if (aTime !== bTime) {
    return aTime.localeCompare(bTime);
  }

  return a.title.localeCompare(b.title);
}

export async function itineraryHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    if (res.setHeader) {
      res.setHeader('Allow', 'GET');
    }

    sendError(res, 405, 'method_not_allowed', 'Use GET for this endpoint');
    return;
  }

  const notionToken = process.env.NOTION_TOKEN;
  const notionTripIdeasDbId = parseCollectionId(
    process.env.NOTION_TRIP_IDEAS_DB_ID?.trim() || DEFAULT_TRIP_IDEAS_COLLECTION_ID
  );
  const notionScheduleDbId = parseCollectionId(
    process.env.NOTION_ITINERARY_SCHEDULE_DB_ID?.trim() || DEFAULT_SCHEDULE_COLLECTION_ID
  );
  const flightsSyncApiKey = process.env.FLIGHTS_SYNC_API_KEY;

  if (!notionToken || !flightsSyncApiKey || !notionTripIdeasDbId || !notionScheduleDbId) {
    sendError(
      res,
      500,
      'misconfigured',
      'Missing required server env vars: NOTION_TOKEN, NOTION_TRIP_IDEAS_DB_ID, NOTION_ITINERARY_SCHEDULE_DB_ID, FLIGHTS_SYNC_API_KEY'
    );
    return;
  }

  const requestApiKey = getApiKeyFromRequest(req);
  if (!requestApiKey || requestApiKey !== flightsSyncApiKey) {
    sendError(res, 401, 'unauthorized', 'Invalid API key');
    return;
  }

  try {
    const [ideaPagesRaw, schedulePagesRaw] = await Promise.all([
      fetchNotionFlightPages({
        notionToken,
        databaseId: notionTripIdeasDbId,
        sorts: [{ property: 'Name', direction: 'ascending' }],
      }),
      fetchNotionFlightPages({
        notionToken,
        databaseId: notionScheduleDbId,
        sorts: [{ property: 'Name', direction: 'ascending' }],
      }),
    ]);

    const ideaPages = ideaPagesRaw as NotionPage[];
    const schedulePages = schedulePagesRaw as NotionPage[];

    const ideaItems = mapIdeaPagesToItems(ideaPages);
    const scheduleRows = mapSchedulePagesToRows(schedulePages);
    const scheduleItems = rowsToScheduleItems(scheduleRows);

    const allItems = [...scheduleItems, ...ideaItems].sort(compareItems);

    const payload: ItineraryApiResponse = {
      generatedAt: new Date().toISOString(),
      items: allItems,
    };

    res.status(200).json(payload);
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

export default itineraryHandler;
