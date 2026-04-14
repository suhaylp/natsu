import type { Booking, BookingStatus, FlightLeg, Trip } from '../../data/trips';

type Baggage = {
  carryOn: string;
  checkIn: string;
};

type NotionRichText = { plain_text?: string };

type NotionProperty = {
  type?: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  select?: { name?: string } | null;
  status?: { name?: string } | null;
  number?: number | null;
  date?: { start?: string | null } | null;
  relation?: Array<{ id?: string }>;
  formula?:
    | {
        type?: 'string' | 'number' | 'boolean' | 'date';
        string?: string | null;
        number?: number | null;
        boolean?: boolean | null;
        date?: { start?: string | null } | null;
      }
    | null;
  url?: string | null;
  email?: string | null;
  phone_number?: string | null;
  checkbox?: boolean | null;
};

type NotionPage = {
  id?: string;
  properties?: Record<string, NotionProperty>;
};

type NotionQueryResponse = {
  results?: NotionPage[];
  has_more?: boolean;
  next_cursor?: string | null;
};

type NotionPageResponse = {
  properties?: Record<string, NotionProperty>;
};

type IsoParts = {
  iso: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dateLabel: string;
  timeLabel: string;
  epochMs: number;
};

type FlatFlightRow = {
  tripId: string;
  tripTitle: string;
  tripEmoji?: string;
  tripDateRange?: string;
  bookingId: string;
  bookingLabel: string;
  status: BookingStatus;
  airline?: string;
  bookingRef?: string;
  carryOn?: string;
  checkIn?: string;
  seats?: FlightLeg['seats'];
  notes?: string;
  legIndex: number;
  flightNumber: string;
  fromCity: string;
  fromCode: string;
  toCity: string;
  toCode: string;
  departure: IsoParts;
  arrival: IsoParts;
  duration?: string;
};

const notionVersion = '2022-06-28';
const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const propertyAliases: Record<string, string[]> = {
  trip_id: ['trip', 'tripid'],
  trip_title: ['trip_name', 'tripname'],
  booking_id: ['booking', 'bookingid', 'pnr', 'reservation_id', 'booking_number', 'bookingnumber'],
  booking_label: ['booking_name', 'route_label', 'label', 'name'],
  status: ['booking_status'],
  flight_number: ['flight', 'flight_no', 'flightno'],
  from_city: ['origin_city', 'departure_city', 'from'],
  from_code: ['origin_code', 'origin_iata', 'from_iata', 'from_airport'],
  to_city: ['destination_city', 'arrival_city', 'to'],
  to_code: ['destination_code', 'destination_iata', 'to_iata', 'to_airport'],
  departure_iso: ['departure', 'departure_datetime', 'departure_time', 'departs_at', 'depart_at'],
  arrival_iso: ['arrival', 'arrival_datetime', 'arrival_time', 'arrives_at', 'arrive_at'],
  leg_index: ['leg', 'leg_order', 'segment', 'segment_index'],
  booking_ref: ['booking_number', 'bookingnumber', 'pnr', 'reservation_id'],
  duration: ['duration_minutes'],
  seats: ['seat', 'seat_number'],
  timezone_from: ['timezonefrom'],
  timezone_to: ['timezoneto'],
};

function normalizeNotionPropertyKey(propertyKey: string): string {
  return propertyKey.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export class NotionFetchError extends Error {
  statusCode: number;
  details?: string;

  constructor(message: string, statusCode: number, details?: string) {
    super(message);
    this.name = 'NotionFetchError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class NotionMappingError extends Error {
  details?: string;

  constructor(message: string, details?: string) {
    super(message);
    this.name = 'NotionMappingError';
    this.details = details;
  }
}

function parseIso(iso: string, fieldName: string): IsoParts {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  const epochMs = Date.parse(iso);

  if (!match || Number.isNaN(epochMs)) {
    throw new NotionMappingError(`Invalid ISO datetime in ${fieldName}`, `Value received: ${iso}`);
  }

  const [, yearToken, monthToken, dayToken, hourToken, minuteToken] = match;
  const year = Number(yearToken);
  const month = Number(monthToken);
  const day = Number(dayToken);
  const hour = hourToken ? Number(hourToken) : 0;
  const minute = minuteToken ? Number(minuteToken) : 0;

  if ([year, month, day, hour, minute].some((value) => Number.isNaN(value))) {
    throw new NotionMappingError(`Invalid ISO datetime in ${fieldName}`, `Value received: ${iso}`);
  }

  const monthLabel = monthShortNames[month - 1];
  if (!monthLabel) {
    throw new NotionMappingError(`Invalid month in ${fieldName}`, `Value received: ${iso}`);
  }

  return {
    iso,
    year,
    month,
    day,
    hour,
    minute,
    dateLabel: `${monthLabel} ${day}`,
    timeLabel: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    epochMs,
  };
}

function formatDuration(milliseconds: number): string | undefined {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return undefined;
  }

  const totalMinutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return undefined;
}

function readPropertyText(property?: NotionProperty): string | undefined {
  if (!property) {
    return undefined;
  }

  switch (property.type) {
    case 'title': {
      const value = property.title?.map((item) => item.plain_text ?? '').join('').trim();
      return value || undefined;
    }
    case 'rich_text': {
      const value = property.rich_text?.map((item) => item.plain_text ?? '').join('').trim();
      return value || undefined;
    }
    case 'select':
      return property.select?.name?.trim() || undefined;
    case 'status':
      return property.status?.name?.trim() || undefined;
    case 'number':
      return property.number !== null && property.number !== undefined ? String(property.number) : undefined;
    case 'date':
      return property.date?.start?.trim() || undefined;
    case 'relation': {
      const relationId = property.relation?.[0]?.id?.trim();
      return relationId || undefined;
    }
    case 'formula': {
      const formulaType = property.formula?.type;
      if (formulaType === 'string') {
        return property.formula?.string?.trim() || undefined;
      }
      if (formulaType === 'number') {
        return property.formula?.number !== null && property.formula?.number !== undefined
          ? String(property.formula.number)
          : undefined;
      }
      if (formulaType === 'boolean') {
        return property.formula?.boolean === true ? 'true' : property.formula?.boolean === false ? 'false' : undefined;
      }
      if (formulaType === 'date') {
        return property.formula?.date?.start?.trim() || undefined;
      }
      return undefined;
    }
    case 'url':
      return property.url?.trim() || undefined;
    case 'email':
      return property.email?.trim() || undefined;
    case 'phone_number':
      return property.phone_number?.trim() || undefined;
    case 'checkbox':
      return property.checkbox === true ? 'true' : property.checkbox === false ? 'false' : undefined;
    default:
      return undefined;
  }
}

function getPropertyByKey(properties: Record<string, NotionProperty>, key: string): NotionProperty | undefined {
  const candidates = [key, ...(propertyAliases[key] ?? [])];
  const normalizedEntries = Object.entries(properties).map(([name, property]) => ({
    normalizedName: normalizeNotionPropertyKey(name),
    property,
  }));

  for (const candidate of candidates) {
    if (properties[candidate]) {
      return properties[candidate];
    }

    const normalizedCandidate = normalizeNotionPropertyKey(candidate);
    const matched = normalizedEntries.find((entry) => entry.normalizedName === normalizedCandidate);
    if (matched) {
      return matched.property;
    }
  }

  return undefined;
}

function getRequiredText(properties: Record<string, NotionProperty>, key: string): string {
  const value = readPropertyText(getPropertyByKey(properties, key));

  if (!value) {
    const availableProperties = Object.keys(properties).join(', ');
    const aliasList = propertyAliases[key]?.join(', ');
    const details = [
      availableProperties ? `Available properties: ${availableProperties}` : null,
      aliasList ? `Accepted aliases for ${key}: ${aliasList}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    throw new NotionMappingError(`Missing required Notion property: ${key}`, details || undefined);
  }

  return value;
}

function getOptionalText(properties: Record<string, NotionProperty>, key: string): string | undefined {
  return readPropertyText(getPropertyByKey(properties, key));
}

function getOptionalNumber(properties: Record<string, NotionProperty>, key: string): number | undefined {
  const value = getOptionalText(properties, key);
  if (!value) {
    return undefined;
  }

  const parsedNumber = Number(value);
  return Number.isNaN(parsedNumber) ? undefined : parsedNumber;
}

function normalizeBookingStatus(rawStatus: string): BookingStatus {
  const normalized = rawStatus.trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (normalized === 'booked' || normalized === 'confirmed' || normalized === 'ticketed') {
    return 'booked';
  }

  if (normalized === 'not_booked' || normalized === 'planned' || normalized === 'to_book') {
    return 'not_booked';
  }

  throw new NotionMappingError(
    'Invalid booking status value. Expected booked or not_booked',
    `Status received: ${rawStatus}`
  );
}

function parseSeats(properties: Record<string, NotionProperty>): FlightLeg['seats'] | undefined {
  const seatsUnassigned = getOptionalText(properties, 'seats_unassigned')?.toLowerCase();
  if (seatsUnassigned === 'true' || seatsUnassigned === 'yes' || seatsUnassigned === '1') {
    return 'not_assigned';
  }

  const suhaylSeat = getOptionalText(properties, 'seat_suhayl');
  const nataliaSeat = getOptionalText(properties, 'seat_natalia');

  if (!suhaylSeat && !nataliaSeat) {
    const genericSeats = getOptionalText(properties, 'seats');
    if (!genericSeats) {
      return undefined;
    }

    return { suhayl: genericSeats };
  }

  return {
    ...(suhaylSeat ? { suhayl: suhaylSeat } : {}),
    ...(nataliaSeat ? { natalia: nataliaSeat } : {}),
  };
}

function parseBaggage(properties: Record<string, NotionProperty>): Baggage | undefined {
  const carryOn = getOptionalText(properties, 'carry_on');
  const checkIn = getOptionalText(properties, 'check_in');

  if (!carryOn && !checkIn) {
    return undefined;
  }

  return {
    carryOn: carryOn ?? 'Not specified',
    checkIn: checkIn ?? 'Not specified',
  };
}

function parseFlatFlightRow(page: NotionPage): FlatFlightRow {
  const properties = page.properties;

  if (!properties) {
    throw new NotionMappingError('Missing Notion page properties');
  }

  const departureIso = getRequiredText(properties, 'departure_iso');
  const arrivalIso = getRequiredText(properties, 'arrival_iso');

  const departure = parseIso(departureIso, 'departure_iso');
  const arrival = parseIso(arrivalIso, 'arrival_iso');

  const tripIdFromRow = getOptionalText(properties, 'trip_id');
  const fallbackTripId = process.env.NOTION_DEFAULT_TRIP_ID?.trim();
  const tripId = tripIdFromRow ?? fallbackTripId;
  if (!tripId) {
    const availableProperties = Object.keys(properties).join(', ');
    throw new NotionMappingError(
      'Missing required Notion property: trip_id',
      [
        availableProperties ? `Available properties: ${availableProperties}` : null,
        'Trip relation appears empty. Set Trip on each row, or set NOTION_DEFAULT_TRIP_ID.',
      ]
        .filter(Boolean)
        .join(' | ')
    );
  }

  const fallbackTripTitle = process.env.NOTION_DEFAULT_TRIP_TITLE?.trim();
  const tripTitle = getOptionalText(properties, 'trip_title') ?? fallbackTripTitle ?? tripId;
  const bookingId =
    getOptionalText(properties, 'booking_id') ??
    getOptionalText(properties, 'booking_ref') ??
    `${tripId}-${getRequiredText(properties, 'flight_number')}-${departure.iso}`;
  const bookingLabel =
    getOptionalText(properties, 'booking_label') ??
    `${getRequiredText(properties, 'from_city')} → ${getRequiredText(properties, 'to_city')}`;
  const legIndex = getOptionalNumber(properties, 'leg_index') ?? 1;
  const statusText = getOptionalText(properties, 'status') ?? 'booked';
  const durationText = getOptionalText(properties, 'duration');
  const durationNumber = getOptionalNumber(properties, 'duration');
  const normalizedDuration =
    durationText && durationText.includes('h')
      ? durationText
      : durationNumber !== undefined
        ? formatDuration(durationNumber * 60000)
        : durationText;
  const timezoneFrom = getOptionalText(properties, 'timezone_from');
  const timezoneTo = getOptionalText(properties, 'timezone_to');
  const notes = [
    getOptionalText(properties, 'notes'),
    timezoneFrom ? `Timezone from: ${timezoneFrom}` : null,
    timezoneTo ? `Timezone to: ${timezoneTo}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  return {
    tripId,
    tripTitle,
    tripEmoji: getOptionalText(properties, 'trip_emoji'),
    tripDateRange: getOptionalText(properties, 'trip_date_range'),
    bookingId,
    bookingLabel,
    status: normalizeBookingStatus(statusText),
    airline: getOptionalText(properties, 'airline'),
    bookingRef: getOptionalText(properties, 'booking_ref') ?? getOptionalText(properties, 'booking_id'),
    carryOn: getOptionalText(properties, 'carry_on'),
    checkIn: getOptionalText(properties, 'check_in'),
    seats: parseSeats(properties),
    notes: notes || undefined,
    legIndex,
    flightNumber: getRequiredText(properties, 'flight_number'),
    fromCity: getRequiredText(properties, 'from_city'),
    fromCode: getRequiredText(properties, 'from_code'),
    toCity: getRequiredText(properties, 'to_city'),
    toCode: getRequiredText(properties, 'to_code'),
    departure,
    arrival,
    duration: normalizedDuration,
  };
}

function formatTripDateRange(rows: FlatFlightRow[]): string {
  if (rows.length === 0) {
    return 'TBD';
  }

  const sortedRows = [...rows].sort((a, b) => a.departure.epochMs - b.departure.epochMs);
  const first = sortedRows[0].departure;
  const last = sortedRows[sortedRows.length - 1].departure;

  if (first.year !== last.year) {
    return `${monthShortNames[first.month - 1]} ${first.day}, ${first.year} – ${monthShortNames[last.month - 1]} ${last.day}, ${last.year}`;
  }

  if (first.month === last.month) {
    return `${monthShortNames[first.month - 1]} ${first.day} – ${last.day}, ${first.year}`;
  }

  return `${monthShortNames[first.month - 1]} ${first.day} – ${monthShortNames[last.month - 1]} ${last.day}, ${first.year}`;
}

function buildTripsFromRows(rows: FlatFlightRow[]): Trip[] {
  const tripMap = new Map<
    string,
    {
      tripTitle: string;
      tripEmoji?: string;
      tripDateRange?: string;
      bookingMap: Map<
        string,
        {
          bookingLabel: string;
          status: BookingStatus;
          airline?: string;
          bookingRef?: string;
          notes?: string;
          baggage?: Baggage;
          legs: Array<{ legIndex: number; leg: FlightLeg; departureEpoch: number }>;
        }
      >;
      allRows: FlatFlightRow[];
    }
  >();

  for (const row of rows) {
    const tripEntry = tripMap.get(row.tripId) ?? {
      tripTitle: row.tripTitle,
      tripEmoji: row.tripEmoji,
      tripDateRange: row.tripDateRange,
      bookingMap: new Map(),
      allRows: [],
    };

    tripEntry.allRows.push(row);

    const bookingEntry = tripEntry.bookingMap.get(row.bookingId) ?? {
      bookingLabel: row.bookingLabel,
      status: row.status,
      airline: row.airline,
      bookingRef: row.bookingRef,
      notes: row.notes,
      baggage: parseBaggage({
        carry_on: { type: 'rich_text', rich_text: row.carryOn ? [{ plain_text: row.carryOn }] : [] },
        check_in: { type: 'rich_text', rich_text: row.checkIn ? [{ plain_text: row.checkIn }] : [] },
      }),
      legs: [],
    };

    const normalizedDuration = row.duration ?? formatDuration(row.arrival.epochMs - row.departure.epochMs);

    const leg: FlightLeg = {
      flightNumber: row.flightNumber,
      fromCity: row.fromCity,
      fromCode: row.fromCode,
      toCity: row.toCity,
      toCode: row.toCode,
      departureTime: row.departure.timeLabel,
      departureDate: row.departure.dateLabel,
      arrivalTime: row.arrival.timeLabel,
      arrivalDate: row.arrival.dateLabel,
      ...(normalizedDuration ? { duration: normalizedDuration } : {}),
      ...(row.seats ? { seats: row.seats } : {}),
    };

    bookingEntry.legs.push({
      legIndex: row.legIndex,
      leg,
      departureEpoch: row.departure.epochMs,
    });

    if (!bookingEntry.airline && row.airline) {
      bookingEntry.airline = row.airline;
    }

    if (!bookingEntry.bookingRef && row.bookingRef) {
      bookingEntry.bookingRef = row.bookingRef;
    }

    if (!bookingEntry.notes && row.notes) {
      bookingEntry.notes = row.notes;
    }

    if (!bookingEntry.baggage) {
      const baggage = parseBaggage({
        carry_on: { type: 'rich_text', rich_text: row.carryOn ? [{ plain_text: row.carryOn }] : [] },
        check_in: { type: 'rich_text', rich_text: row.checkIn ? [{ plain_text: row.checkIn }] : [] },
      });
      if (baggage) {
        bookingEntry.baggage = baggage;
      }
    }

    tripEntry.bookingMap.set(row.bookingId, bookingEntry);
    tripMap.set(row.tripId, tripEntry);
  }

  const trips: Trip[] = [];

  for (const [tripId, tripEntry] of tripMap.entries()) {
    const bookings: Booking[] = Array.from(tripEntry.bookingMap.entries())
      .map(([bookingId, booking]) => {
        const sortedLegs = [...booking.legs].sort((a, b) => {
          if (a.legIndex !== b.legIndex) {
            return a.legIndex - b.legIndex;
          }
          return a.departureEpoch - b.departureEpoch;
        });
        return {
          id: bookingId,
          type: 'flight',
          status: booking.status,
          label: booking.bookingLabel,
          legs: sortedLegs.map((item) => item.leg),
          ...(booking.airline ? { airline: booking.airline } : {}),
          ...(booking.bookingRef ? { bookingRef: booking.bookingRef } : {}),
          ...(booking.baggage ? { baggage: booking.baggage } : {}),
          ...(booking.notes ? { notes: booking.notes } : {}),
        } as Booking;
      })
      .sort((a, b) => {
        const aEpoch = tripEntry.bookingMap.get(a.id)?.legs[0]?.departureEpoch ?? Number.POSITIVE_INFINITY;
        const bEpoch = tripEntry.bookingMap.get(b.id)?.legs[0]?.departureEpoch ?? Number.POSITIVE_INFINITY;
        return aEpoch - bEpoch;
      });

    trips.push({
      id: tripId,
      title: tripEntry.tripTitle,
      emoji: tripEntry.tripEmoji || '✈️',
      dateRange: tripEntry.tripDateRange || formatTripDateRange(tripEntry.allRows),
      bookings,
    });
  }

  return trips.sort((a, b) => a.title.localeCompare(b.title));
}

function getTripRelationId(properties: Record<string, NotionProperty>): string | undefined {
  const tripProperty = getPropertyByKey(properties, 'trip_id');
  if (!tripProperty) {
    return undefined;
  }

  if (tripProperty.type === 'relation') {
    return tripProperty.relation?.[0]?.id;
  }

  return undefined;
}

function readFirstTitleProperty(properties: Record<string, NotionProperty>): string | undefined {
  for (const property of Object.values(properties)) {
    if (property.type !== 'title') {
      continue;
    }

    const title = property.title?.map((item) => item.plain_text ?? '').join('').trim();
    if (title) {
      return title;
    }
  }

  return undefined;
}

async function fetchRelatedTripTitles(params: {
  notionToken: string;
  pages: NotionPage[];
  fetchImpl: typeof fetch;
}): Promise<Map<string, string>> {
  const { notionToken, pages, fetchImpl } = params;
  const relationIds = new Set<string>();

  for (const page of pages) {
    if (!page.properties) {
      continue;
    }

    const relationId = getTripRelationId(page.properties);
    if (relationId) {
      relationIds.add(relationId);
    }
  }

  const titlesById = new Map<string, string>();
  const ids = Array.from(relationIds);

  for (const relationId of ids) {
    const response = await fetchImpl(`https://api.notion.com/v1/pages/${relationId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${notionToken}`,
        'Notion-Version': notionVersion,
      },
    });

    if (!response.ok) {
      continue;
    }

    const payload = (await response.json()) as NotionPageResponse;
    if (!payload.properties) {
      continue;
    }

    const title = readFirstTitleProperty(payload.properties);
    if (title) {
      titlesById.set(relationId, title);
    }
  }

  return titlesById;
}

function hydrateTripsFromRelations(pages: NotionPage[], titlesByRelationId: Map<string, string>) {
  for (const page of pages) {
    if (!page.properties) {
      continue;
    }

    const relationId = getTripRelationId(page.properties);
    if (!relationId) {
      continue;
    }

    const hasTripId = Boolean(getOptionalText(page.properties, 'trip_id'));
    if (!hasTripId) {
      page.properties.trip_id = {
        type: 'rich_text',
        rich_text: [{ plain_text: relationId }],
      };
    }

    const hasTripTitle = Boolean(getOptionalText(page.properties, 'trip_title'));
    const relationTitle = titlesByRelationId.get(relationId);
    if (!hasTripTitle && relationTitle) {
      page.properties.trip_title = {
        type: 'rich_text',
        rich_text: [{ plain_text: relationTitle }],
      };
    }
  }
}

export function mapNotionFlightPagesToTrips(pages: NotionPage[]): Trip[] {
  const rows: FlatFlightRow[] = [];
  const rowErrors: string[] = [];

  pages.forEach((page, index) => {
    try {
      rows.push(parseFlatFlightRow(page));
    } catch (error) {
      if (error instanceof NotionMappingError) {
        const details = error.details ? ` (${error.details})` : '';
        rowErrors.push(`Row ${index + 1}: ${error.message}${details}`);
        return;
      }

      rowErrors.push(
        `Row ${index + 1}: Unexpected mapping error${
          error instanceof Error && error.message ? ` (${error.message})` : ''
        }`
      );
    }
  });

  if (rows.length === 0) {
    throw new NotionMappingError(
      'No valid flight rows found in Notion',
      rowErrors.length > 0 ? rowErrors.slice(0, 3).join(' | ') : undefined
    );
  }

  if (rowErrors.length > 0 && process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.warn(`Skipped ${rowErrors.length} invalid Notion flight row(s).`, rowErrors.slice(0, 5));
  }

  return buildTripsFromRows(rows);
}

export async function fetchNotionFlightPages(params: {
  notionToken: string;
  databaseId: string;
  fetchImpl?: typeof fetch;
}): Promise<NotionPage[]> {
  const { notionToken, databaseId, fetchImpl = fetch } = params;
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const response = await fetchImpl(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${notionToken}`,
        'Notion-Version': notionVersion,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new NotionFetchError('Failed to fetch flights from Notion', response.status, details);
    }

    const payload = (await response.json()) as NotionQueryResponse;

    if (!Array.isArray(payload.results)) {
      throw new NotionFetchError('Invalid Notion response shape', 502, 'Missing results array');
    }

    pages.push(...payload.results);
    cursor = payload.has_more ? payload.next_cursor || undefined : undefined;
  } while (cursor);

  const titlesByRelationId = await fetchRelatedTripTitles({
    notionToken,
    pages,
    fetchImpl,
  });
  hydrateTripsFromRelations(pages, titlesByRelationId);

  return pages;
}
