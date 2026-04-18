import { trips as localTrips } from '../../data/trips';
import type { Booking, BookingStatus, BookingType, Trip } from '../../data/trips';
import { normalizeLocationText } from '../locationText';
import type { MappingDiagnostics } from './notionMapper';
import { fetchNotionFlightPages, NotionMappingError } from './notionMapper';

type NotionRichText = { plain_text?: string };

type NotionFile = {
  type?: 'file' | 'external';
  file?: { url?: string | null } | null;
  external?: { url?: string | null } | null;
};

type NotionProperty = {
  id?: string;
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
  files?: NotionFile[];
};

type NotionPage = {
  id?: string;
  properties?: Record<string, NotionProperty>;
};

type IsoParts = {
  iso: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  hasTime: boolean;
  dateLabel: string;
  timeLabel: string;
  epochMs: number;
};

type FlatIdeaRow = {
  tripId: string;
  tripTitle: string;
  tripEmoji?: string;
  tripDateRange?: string;
  bookingId: string;
  bookingLabel: string;
  bookingType: BookingType;
  status: BookingStatus;
  city?: string;
  country?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  price?: number;
  photoUrls: string[];
  scheduledAt: IsoParts;
};

const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const propertyAliases: Record<string, string[]> = {
  trip_id: ['trip', 'tripid'],
  trip_title: ['trip_name', 'tripname'],
  booking_id: ['idea_id', 'ideaid'],
  booking_label: ['name', 'title', 'idea', 'activity', 'idea_name'],
  status: ['confirmed', 'is_confirmed', 'booked'],
  type: ['category'],
  date_iso: ['date', 'datetime', 'when', 'event_date', 'start_date', 'start'],
  city: ['location_city'],
  country: ['location_country'],
  address: ['location', 'street_address'],
  latitude: ['lat', 'lattitude', 'location_latitude', 'coords_latitude', 'map_latitude', 'geo_latitude'],
  longitude: ['lng', 'lon', 'long', 'location_longitude', 'coords_longitude', 'map_longitude', 'geo_longitude'],
  description: ['details', 'notes'],
  price: ['cost', 'budget'],
  photos: ['images', 'photo'],
};

type TripDateRangeWindow = {
  tripId: string;
  tripTitle: string;
  startEpochMs: number;
  endEpochMs: number;
};

function normalizeTripTitle(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeIdeaKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function looksLikeNotionPageId(value: string): boolean {
  const compact = value.replace(/-/g, '');
  return /^[0-9a-f]{32}$/i.test(compact);
}

const monthToNumber = new Map<string, number>(
  monthShortNames.map((monthLabel, index) => [monthLabel.toLowerCase(), index + 1])
);

const localTripByTitle = new Map<string, { tripId: string; tripTitle: string }>(
  localTrips.map((trip) => [normalizeTripTitle(trip.title), { tripId: trip.id, tripTitle: trip.title }])
);

function parseTripDateRangeWindow(trip: Trip): TripDateRangeWindow | undefined {
  const rangeText = trip.dateRange.trim();

  const sameMonthMatch = rangeText.match(/^([A-Za-z]{3})\s+(\d{1,2})\s*[–-]\s*(\d{1,2}),\s*(\d{4})$/);
  if (sameMonthMatch) {
    const [, monthToken, startDayToken, endDayToken, yearToken] = sameMonthMatch;
    const month = monthToNumber.get(monthToken.toLowerCase());
    const startDay = Number(startDayToken);
    const endDay = Number(endDayToken);
    const year = Number(yearToken);

    if (!month || Number.isNaN(startDay) || Number.isNaN(endDay) || Number.isNaN(year)) {
      return undefined;
    }

    return {
      tripId: trip.id,
      tripTitle: trip.title,
      startEpochMs: Date.UTC(year, month - 1, startDay, 0, 0, 0, 0),
      endEpochMs: Date.UTC(year, month - 1, endDay, 23, 59, 59, 999),
    };
  }

  const crossMonthMatch = rangeText.match(/^([A-Za-z]{3})\s+(\d{1,2})\s*[–-]\s*([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/);
  if (!crossMonthMatch) {
    return undefined;
  }

  const [, startMonthToken, startDayToken, endMonthToken, endDayToken, yearToken] = crossMonthMatch;
  const startMonth = monthToNumber.get(startMonthToken.toLowerCase());
  const endMonth = monthToNumber.get(endMonthToken.toLowerCase());
  const startDay = Number(startDayToken);
  const endDay = Number(endDayToken);
  const year = Number(yearToken);

  if (!startMonth || !endMonth || Number.isNaN(startDay) || Number.isNaN(endDay) || Number.isNaN(year)) {
    return undefined;
  }

  return {
    tripId: trip.id,
    tripTitle: trip.title,
    startEpochMs: Date.UTC(year, startMonth - 1, startDay, 0, 0, 0, 0),
    endEpochMs: Date.UTC(year, endMonth - 1, endDay, 23, 59, 59, 999),
  };
}

const localTripDateWindows = localTrips
  .map((trip) => parseTripDateRangeWindow(trip))
  .filter((range): range is TripDateRangeWindow => Boolean(range));

function normalizeNotionPropertyKey(propertyKey: string): string {
  return propertyKey.toLowerCase().replace(/[^a-z0-9]/g, '');
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

function getOptionalText(properties: Record<string, NotionProperty>, key: string): string | undefined {
  return readPropertyText(getPropertyByKey(properties, key));
}

function getOptionalNumber(properties: Record<string, NotionProperty>, key: string): number | undefined {
  const value = getOptionalText(properties, key);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeCoordinatePair(
  latitude: number | undefined,
  longitude: number | undefined
): { latitude: number; longitude: number } | undefined {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return undefined;
  }

  const lat = latitude as number;
  const lon = longitude as number;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return undefined;
  }

  return { latitude: lat, longitude: lon };
}

function getOptionalCheckbox(properties: Record<string, NotionProperty>, key: string): boolean | undefined {
  const property = getPropertyByKey(properties, key);
  if (!property) {
    return undefined;
  }

  if (property.type === 'checkbox') {
    if (property.checkbox === true) {
      return true;
    }
    if (property.checkbox === false) {
      return false;
    }
  }

  const text = readPropertyText(property)?.trim().toLowerCase();
  if (text === 'true' || text === 'yes' || text === '1') {
    return true;
  }
  if (text === 'false' || text === 'no' || text === '0') {
    return false;
  }

  return undefined;
}

function getOptionalFileUrls(properties: Record<string, NotionProperty>, key: string): string[] {
  const property = getPropertyByKey(properties, key);
  if (!property || property.type !== 'files') {
    return [];
  }

  return (property.files ?? [])
    .map((entry) => {
      if (entry.type === 'file') {
        return entry.file?.url ?? undefined;
      }
      if (entry.type === 'external') {
        return entry.external?.url ?? undefined;
      }
      return entry.file?.url ?? entry.external?.url ?? undefined;
    })
    .filter((value): value is string => Boolean(value));
}

function normalizeBookingStatus(rawStatus: string | undefined, rawCheckbox: boolean | undefined): BookingStatus {
  if (rawCheckbox === true) {
    return 'booked';
  }
  if (rawCheckbox === false) {
    return 'not_booked';
  }

  const normalized = (rawStatus ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (
    normalized === 'booked' ||
    normalized === 'confirmed' ||
    normalized === 'ticketed' ||
    normalized === 'upcoming' ||
    normalized === 'scheduled' ||
    normalized === 'active' ||
    normalized.includes('booked') ||
    normalized.includes('confirm') ||
    normalized.includes('upcoming') ||
    normalized.includes('schedul')
  ) {
    return 'booked';
  }

  if (
    normalized === 'not_booked' ||
    normalized === 'planned' ||
    normalized === 'to_book' ||
    normalized === 'pending' ||
    normalized === 'draft' ||
    normalized === 'unbooked' ||
    normalized.includes('not_booked') ||
    normalized.includes('to_book') ||
    normalized.includes('planned') ||
    normalized.includes('pending') ||
    normalized.includes('draft')
  ) {
    return 'not_booked';
  }

  return 'not_booked';
}

function mapIdeaType(rawType: string | undefined): BookingType {
  const normalized = normalizeIdeaKey(rawType ?? 'event');

  if (normalized.includes('activit')) {
    return 'concert';
  }
  if (normalized.includes('concert')) {
    return 'concert';
  }
  if (normalized.includes('festival')) {
    return 'festival';
  }
  if (normalized.includes('food_tour') || normalized.includes('foodtour') || normalized === 'food') {
    return 'food-tour';
  }
  if (normalized.includes('ferry')) {
    return 'ferry';
  }
  if (normalized.includes('train')) {
    return 'train';
  }
  if (normalized.includes('bus')) {
    return 'bus';
  }

  return 'event';
}

function createPlaceholderIso(fieldName: string): IsoParts {
  return {
    iso: `placeholder-${fieldName}`,
    year: 9999,
    month: 12,
    day: 31,
    hour: 0,
    minute: 0,
    hasTime: false,
    dateLabel: 'TBD',
    timeLabel: '00:00',
    epochMs: Number.POSITIVE_INFINITY,
  };
}

function parseIsoOrPlaceholder(iso: string | undefined, fieldName: string): IsoParts {
  if (!iso) {
    return createPlaceholderIso(fieldName);
  }

  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  const epochMs = Date.parse(iso);

  if (!match || Number.isNaN(epochMs)) {
    return createPlaceholderIso(fieldName);
  }

  const [, yearToken, monthToken, dayToken, hourToken, minuteToken] = match;
  const year = Number(yearToken);
  const month = Number(monthToken);
  const day = Number(dayToken);
  const hour = hourToken ? Number(hourToken) : 0;
  const minute = minuteToken ? Number(minuteToken) : 0;

  if ([year, month, day, hour, minute].some((value) => Number.isNaN(value))) {
    return createPlaceholderIso(fieldName);
  }

  const monthLabel = monthShortNames[month - 1];
  if (!monthLabel) {
    return createPlaceholderIso(fieldName);
  }

  return {
    iso,
    year,
    month,
    day,
    hour,
    minute,
    hasTime: Boolean(hourToken),
    dateLabel: `${monthLabel} ${day}`,
    timeLabel: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    epochMs,
  };
}

function inferTripFromTitle(tripTitle?: string): { tripId: string; tripTitle: string } | undefined {
  if (!tripTitle) {
    return undefined;
  }

  return localTripByTitle.get(normalizeTripTitle(tripTitle));
}

function inferTripFromDate(scheduledAt: IsoParts): { tripId: string; tripTitle: string } | undefined {
  if (!Number.isFinite(scheduledAt.epochMs)) {
    return undefined;
  }

  const utcTime = Date.UTC(scheduledAt.year, scheduledAt.month - 1, scheduledAt.day, 12, 0, 0, 0);
  const matchedTrip = localTripDateWindows.find((range) => utcTime >= range.startEpochMs && utcTime <= range.endEpochMs);

  if (!matchedTrip) {
    return undefined;
  }

  return {
    tripId: matchedTrip.tripId,
    tripTitle: matchedTrip.tripTitle,
  };
}

function parseFlatIdeaRow(page: NotionPage): FlatIdeaRow {
  const properties = page.properties;
  if (!properties) {
    throw new NotionMappingError('Missing Notion page properties');
  }

  const scheduledAt = parseIsoOrPlaceholder(getOptionalText(properties, 'date_iso'), 'date_iso');
  const tripTitleFromRow = getOptionalText(properties, 'trip_title');
  const inferredTripByTitle = inferTripFromTitle(tripTitleFromRow);
  const inferredTripByDate = inferTripFromDate(scheduledAt);
  const tripIdFromRow = getOptionalText(properties, 'trip_id');
  const relationTripLooksLikeNotionId = tripIdFromRow ? looksLikeNotionPageId(tripIdFromRow) : false;
  const tripId =
    relationTripLooksLikeNotionId
      ? inferredTripByTitle?.tripId ?? inferredTripByDate?.tripId ?? tripIdFromRow
      : tripIdFromRow ?? inferredTripByTitle?.tripId ?? inferredTripByDate?.tripId;

  if (!tripId) {
    const availableProperties = Object.keys(properties).join(', ');
    throw new NotionMappingError(
      'Missing required Notion property: trip_id',
      [
        availableProperties ? `Available properties: ${availableProperties}` : null,
        'Trip relation appears empty. Ensure Trip is selected on each row and the integration has access to the related Trip database.',
      ]
        .filter(Boolean)
        .join(' | ')
    );
  }

  const bookingLabel = getOptionalText(properties, 'booking_label');
  if (!bookingLabel) {
    throw new NotionMappingError('Missing required Notion property: booking_label');
  }

  const city = normalizeLocationText(getOptionalText(properties, 'city'));
  const country = normalizeLocationText(getOptionalText(properties, 'country'));
  const address = normalizeLocationText(getOptionalText(properties, 'address'));
  const coordinatePair = normalizeCoordinatePair(
    getOptionalNumber(properties, 'latitude'),
    getOptionalNumber(properties, 'longitude')
  );
  const description = getOptionalText(properties, 'description');
  const price = getOptionalNumber(properties, 'price');
  const photoUrls = getOptionalFileUrls(properties, 'photos');
  const bookingType = mapIdeaType(getOptionalText(properties, 'type'));
  const status = normalizeBookingStatus(getOptionalText(properties, 'status'), getOptionalCheckbox(properties, 'status'));

  const bookingId =
    getOptionalText(properties, 'booking_id') ??
    page.id ??
    `${tripId}-${normalizeIdeaKey(bookingLabel)}-${scheduledAt.dateLabel}`;

  return {
    tripId,
    tripTitle: tripTitleFromRow ?? inferredTripByTitle?.tripTitle ?? inferredTripByDate?.tripTitle ?? tripId,
    tripEmoji: getOptionalText(properties, 'trip_emoji'),
    tripDateRange: getOptionalText(properties, 'trip_date_range'),
    bookingId,
    bookingLabel,
    bookingType,
    status,
    city,
    country,
    address,
    latitude: coordinatePair?.latitude,
    longitude: coordinatePair?.longitude,
    description,
    price,
    photoUrls,
    scheduledAt,
  };
}

function formatTripDateRange(rows: FlatIdeaRow[]): string {
  const datedRows = rows
    .filter((row) => Number.isFinite(row.scheduledAt.epochMs))
    .sort((a, b) => a.scheduledAt.epochMs - b.scheduledAt.epochMs);

  if (datedRows.length === 0) {
    return 'TBD';
  }

  const first = datedRows[0].scheduledAt;
  const last = datedRows[datedRows.length - 1].scheduledAt;

  if (first.year !== last.year) {
    return `${monthShortNames[first.month - 1]} ${first.day}, ${first.year} – ${monthShortNames[last.month - 1]} ${last.day}, ${last.year}`;
  }

  if (first.month === last.month) {
    return `${monthShortNames[first.month - 1]} ${first.day} – ${last.day}, ${first.year}`;
  }

  return `${monthShortNames[first.month - 1]} ${first.day} – ${monthShortNames[last.month - 1]} ${last.day}, ${first.year}`;
}

function buildTripsFromRows(rows: FlatIdeaRow[]): Trip[] {
  const tripMap = new Map<string, { title: string; emoji?: string; dateRange?: string; rows: FlatIdeaRow[] }>();

  for (const row of rows) {
    const entry = tripMap.get(row.tripId) ?? {
      title: row.tripTitle,
      emoji: row.tripEmoji,
      dateRange: row.tripDateRange,
      rows: [],
    };
    entry.rows.push(row);
    tripMap.set(row.tripId, entry);
  }

  const trips: Trip[] = [];

  for (const [tripId, tripEntry] of tripMap.entries()) {
    const bookings: Booking[] = tripEntry.rows
      .map((row) => {
        const locationParts = [row.address, row.city, row.country].filter(Boolean);
        const formattedPrice =
          row.price !== undefined ? `USD $${Number(row.price).toFixed(2).replace(/\.00$/, '')}` : undefined;
        const notes = [
          row.description,
          formattedPrice ? `Price: ${formattedPrice}` : undefined,
          row.photoUrls.length > 1 ? `Photos: ${row.photoUrls.slice(1).join(', ')}` : undefined,
        ]
          .filter(Boolean)
          .join(' | ');

        return {
          id: row.bookingId,
          type: row.bookingType,
          status: row.status,
          label: row.bookingLabel,
          legs: [],
          ...(row.scheduledAt.dateLabel !== 'TBD' ? { activityDate: row.scheduledAt.dateLabel } : {}),
          ...(row.scheduledAt.hasTime ? { activityTime: row.scheduledAt.timeLabel } : {}),
          ...(locationParts.length > 0 ? { activityLocation: locationParts.join(', ') } : {}),
          ...(row.latitude !== undefined && row.longitude !== undefined
            ? { latitude: row.latitude, longitude: row.longitude }
            : {}),
          ...(notes ? { notes } : {}),
          ...(row.photoUrls[0] ? { imageUrl: row.photoUrls[0] } : {}),
        } as Booking;
      })
      .sort((a, b) => {
        const aEpoch = tripEntry.rows.find((row) => row.bookingId === a.id)?.scheduledAt.epochMs ?? Number.POSITIVE_INFINITY;
        const bEpoch = tripEntry.rows.find((row) => row.bookingId === b.id)?.scheduledAt.epochMs ?? Number.POSITIVE_INFINITY;
        return aEpoch - bEpoch;
      });

    trips.push({
      id: tripId,
      title: tripEntry.title,
      emoji: tripEntry.emoji || '✨',
      dateRange: tripEntry.dateRange || formatTripDateRange(tripEntry.rows),
      bookings,
    });
  }

  return trips.sort((a, b) => a.title.localeCompare(b.title));
}

export async function fetchNotionIdeaPages(params: {
  notionToken: string;
  databaseId: string;
  fetchImpl?: typeof fetch;
}): Promise<NotionPage[]> {
  const pages = await fetchNotionFlightPages(params);
  return pages as NotionPage[];
}

export function mapNotionIdeaPagesToTripsWithDiagnostics(pages: NotionPage[]): {
  trips: Trip[];
  diagnostics: MappingDiagnostics;
} {
  const rows: FlatIdeaRow[] = [];
  const rowErrors: string[] = [];

  pages.forEach((page, index) => {
    try {
      rows.push(parseFlatIdeaRow(page));
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
      'No valid idea rows found in Notion',
      rowErrors.length > 0 ? rowErrors.slice(0, 3).join(' | ') : undefined
    );
  }

  if (rowErrors.length > 0 && process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.warn(`Skipped ${rowErrors.length} invalid Notion idea row(s).`, rowErrors.slice(0, 5));
  }

  return {
    trips: buildTripsFromRows(rows),
    diagnostics: {
      totalRows: pages.length,
      mappedRows: rows.length,
      skippedRows: rowErrors.length,
      rowErrors,
    },
  };
}

export function mapNotionIdeaPagesToTrips(pages: NotionPage[]): Trip[] {
  return mapNotionIdeaPagesToTripsWithDiagnostics(pages).trips;
}
