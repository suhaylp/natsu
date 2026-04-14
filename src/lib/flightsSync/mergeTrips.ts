import type { Booking, Trip } from '../../data/trips';

const monthMap: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function getTripYear(dateRange: string): number {
  const yearMatches = dateRange.match(/\b(20\d{2})\b/g);
  if (yearMatches && yearMatches.length > 0) {
    return Number(yearMatches[yearMatches.length - 1]);
  }

  return new Date().getFullYear();
}

function parseBookingTimestamp(booking: Booking, year: number): number {
  const leg = booking.legs[0];
  const dateToken = leg?.departureDate ?? booking.activityDate;
  const timeToken = leg?.departureTime ?? booking.activityTime;

  if (!dateToken) {
    return Number.POSITIVE_INFINITY;
  }

  const [monthToken, dayToken] = dateToken.trim().split(' ');
  const month = monthMap[monthToken];
  const day = Number(dayToken);

  if (month === undefined || Number.isNaN(day)) {
    return Number.POSITIVE_INFINITY;
  }

  let hours = 0;
  let minutes = 0;

  if (timeToken) {
    const [hourToken, minuteToken] = timeToken.split(':');
    const parsedHours = Number(hourToken);
    const parsedMinutes = Number(minuteToken);

    if (!Number.isNaN(parsedHours) && !Number.isNaN(parsedMinutes)) {
      hours = parsedHours;
      minutes = parsedMinutes;
    }
  }

  return new Date(year, month, day, hours, minutes, 0, 0).getTime();
}

function sortTripBookings(bookings: Booking[], tripYear: number): Booking[] {
  return [...bookings].sort((a, b) => parseBookingTimestamp(a, tripYear) - parseBookingTimestamp(b, tripYear));
}

function isSyncedBookingType(booking: Booking): boolean {
  return booking.type === 'flight' || booking.type === 'hotel';
}

function getSyncedBookings(trip: Trip): Booking[] {
  return trip.bookings.filter((booking) => isSyncedBookingType(booking));
}

function normalizeTripTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function mergeTripsWithRemoteFlights(localTrips: Trip[], remoteTrips: Trip[]): Trip[] {
  const localByNormalizedTitle = new Map(localTrips.map((trip) => [normalizeTripTitle(trip.title), trip]));
  const remoteByLocalTripId = new Map<string, Trip>();
  const remoteOnlyTrips: Trip[] = [];

  for (const remoteTrip of remoteTrips) {
    const localMatchById = localTrips.find((trip) => trip.id === remoteTrip.id);
    if (localMatchById) {
      remoteByLocalTripId.set(localMatchById.id, remoteTrip);
      continue;
    }

    const localMatchByTitle = localByNormalizedTitle.get(normalizeTripTitle(remoteTrip.title));
    if (localMatchByTitle) {
      remoteByLocalTripId.set(localMatchByTitle.id, remoteTrip);
      continue;
    }

    remoteOnlyTrips.push(remoteTrip);
  }

  const mergedLocalTrips = localTrips.map((localTrip) => {
    const remoteTrip = remoteByLocalTripId.get(localTrip.id);

    if (!remoteTrip) {
      return localTrip;
    }

    const localNonFlightBookings = localTrip.bookings.filter((booking) => !isSyncedBookingType(booking));
    const remoteFlightBookings = getSyncedBookings(remoteTrip);
    const mergedBookings = sortTripBookings(
      [...remoteFlightBookings, ...localNonFlightBookings],
      getTripYear(localTrip.dateRange)
    );

    return {
      ...localTrip,
      bookings: mergedBookings,
    };
  });

  const normalizedLocalTitles = new Set(localTrips.map((trip) => normalizeTripTitle(trip.title)));
  const mergedRemoteOnlyTrips = remoteOnlyTrips
    .filter((trip) => !normalizedLocalTitles.has(normalizeTripTitle(trip.title)))
    .map((trip) => {
      const flightBookings = getSyncedBookings(trip);
      const dateRange = trip.dateRange || 'TBD';

      return {
        ...trip,
        bookings: sortTripBookings(flightBookings, getTripYear(dateRange)),
        title: trip.title || 'Untitled trip',
        emoji: trip.emoji || '✈️',
        dateRange,
      };
    })
    .filter((trip) => trip.bookings.length > 0);

  return [...mergedLocalTrips, ...mergedRemoteOnlyTrips];
}
