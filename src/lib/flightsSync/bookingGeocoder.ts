import type { Booking, BookingType, Trip } from '../../data/trips';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type GeocodeResponseRow = {
  lat?: string;
  lon?: string;
};

const placeBookingTypes = new Set<BookingType>(['hotel', 'event', 'concert', 'festival', 'food-tour']);

function parseCoordinatePair(latitudeRaw: string, longitudeRaw: string): Coordinates | null {
  const latitude = Number(latitudeRaw);
  const longitude = Number(longitudeRaw);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }

  return { latitude, longitude };
}

export function extractCoordinatesFromText(value?: string): Coordinates | null {
  if (!value) {
    return null;
  }

  let normalized = value;
  try {
    normalized = decodeURIComponent(value);
  } catch {
    normalized = value;
  }
  normalized = normalized.replace(/\+/g, ' ');
  const patterns = [
    /@(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/, // Google maps @lat,lon
    /!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/, // Google maps !3dlat!4dlon
    /(?:[?&](?:q|ll|sll|center)=)\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/, // URL query params
    /(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/, // plain text "lat, lon"
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) {
      continue;
    }

    const coordinatePair = parseCoordinatePair(match[1], match[2]);
    if (coordinatePair) {
      return coordinatePair;
    }
  }

  return null;
}

function hasExactCoordinates(booking: Booking): boolean {
  return (
    Number.isFinite(booking.latitude) &&
    Number.isFinite(booking.longitude) &&
    Math.abs(booking.latitude as number) <= 90 &&
    Math.abs(booking.longitude as number) <= 180
  );
}

function shouldGeocodeBooking(booking: Booking): boolean {
  return placeBookingTypes.has(booking.type) && !hasExactCoordinates(booking);
}

function splitLocationSegments(value?: string): string[] {
  if (!value) {
    return [];
  }

  const raw = value.replace(/[|·]/g, ',');
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildGeocodeQueries(booking: Booking): string[] {
  const primaryName = (booking.type === 'hotel' ? booking.hotelStay?.name : booking.label) ?? booking.label;
  const city = booking.hotelStay?.city;
  const address = booking.hotelStay?.address;
  const activityLocation = booking.activityLocation;

  const candidates = [
    primaryName,
    primaryName && city ? `${primaryName}, ${city}` : undefined,
    primaryName && activityLocation ? `${primaryName}, ${activityLocation.replace(/[|·]/g, ',')}` : undefined,
    address,
    activityLocation?.replace(/[|·]/g, ','),
    ...splitLocationSegments(activityLocation),
    ...splitLocationSegments(address),
    city,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index);

  return candidates;
}

async function geocodeWithNominatim(
  query: string,
  cache: Map<string, Coordinates | null>,
  fetchImpl: typeof fetch
): Promise<Coordinates | null> {
  const cacheKey = query.trim().toLowerCase();
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) ?? null;
  }

  try {
    const endpoint = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetchImpl(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'natsu-trip-sync/1.0',
      },
    });

    if (!response.ok) {
      cache.set(cacheKey, null);
      return null;
    }

    const payload = (await response.json().catch(() => null)) as GeocodeResponseRow[] | null;
    const firstRow = Array.isArray(payload) ? payload[0] : null;
    if (!firstRow?.lat || !firstRow?.lon) {
      cache.set(cacheKey, null);
      return null;
    }

    const coordinates = parseCoordinatePair(firstRow.lat, firstRow.lon);
    cache.set(cacheKey, coordinates);
    return coordinates;
  } catch {
    cache.set(cacheKey, null);
    return null;
  }
}

export async function enrichTripsWithBookingCoordinates(
  trips: Trip[],
  options?: {
    fetchImpl?: typeof fetch;
    enabled?: boolean;
  }
): Promise<Trip[]> {
  const geocodingEnabled = options?.enabled ?? process.env.NODE_ENV !== 'test';
  if (!geocodingEnabled) {
    return trips;
  }

  const fetchImpl = options?.fetchImpl ?? fetch;
  const geocodeCache = new Map<string, Coordinates | null>();
  const enrichedTrips: Trip[] = [];

  for (const trip of trips) {
    const enrichedBookings: Booking[] = [];

    for (const booking of trip.bookings) {
      if (!shouldGeocodeBooking(booking)) {
        enrichedBookings.push(booking);
        continue;
      }

      const coordinatesFromText =
        extractCoordinatesFromText(booking.activityLocation) ??
        extractCoordinatesFromText(booking.hotelStay?.address) ??
        extractCoordinatesFromText(booking.notes);

      if (coordinatesFromText) {
        enrichedBookings.push({
          ...booking,
          latitude: coordinatesFromText.latitude,
          longitude: coordinatesFromText.longitude,
        });
        continue;
      }

      const geocodeQueries = buildGeocodeQueries(booking);
      if (geocodeQueries.length === 0) {
        enrichedBookings.push(booking);
        continue;
      }

      let geocoded: Coordinates | null = null;
      for (const query of geocodeQueries) {
        geocoded = await geocodeWithNominatim(query, geocodeCache, fetchImpl);
        if (geocoded) {
          break;
        }
      }

      if (!geocoded) {
        enrichedBookings.push(booking);
        continue;
      }

      enrichedBookings.push({
        ...booking,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
      });
    }

    enrichedTrips.push({
      ...trip,
      bookings: enrichedBookings,
    });
  }

  return enrichedTrips;
}
