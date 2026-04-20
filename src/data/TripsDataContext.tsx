import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { trips as seedTrips, type Trip } from './trips';
import type { FlightsApiErrorResponse, FlightsApiResponse } from '../lib/flightsSync/contracts';

type FlightsFetchView = 'full' | 'summary' | 'trip';
type EnsureTripOptions = {
  force?: boolean;
};

type TripsDataContextValue = {
  trips: Trip[];
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  refresh: () => Promise<void>;
  ensureTripLoaded: (tripId: string, options?: EnsureTripOptions) => Promise<void>;
  isTripLoaded: (tripId: string) => boolean;
  isTripLoading: (tripId: string) => boolean;
};

const TripsDataContext = createContext<TripsDataContextValue | undefined>(undefined);

const flightsApiUrl = process.env.EXPO_PUBLIC_FLIGHTS_API_URL;
const flightsApiKey = process.env.EXPO_PUBLIC_FLIGHTS_API_KEY;

function isFlightsApiResponse(payload: unknown): payload is FlightsApiResponse {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const typedPayload = payload as { generatedAt?: unknown; trips?: unknown };
  return typeof typedPayload.generatedAt === 'string' && Array.isArray(typedPayload.trips);
}

function parseApiErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const typedPayload = payload as FlightsApiErrorResponse;
  if (typedPayload.error?.message) {
    return typedPayload.error.message;
  }

  return null;
}

function buildFlightsRequestUrl(params?: { view?: FlightsFetchView; tripId?: string }): string {
  if (!flightsApiUrl) {
    return '';
  }

  const hasQueryParams = Boolean(params?.view && params.view !== 'full') || Boolean(params?.tripId);
  if (!hasQueryParams) {
    return flightsApiUrl;
  }

  try {
    const endpoint = new URL(flightsApiUrl);
    if (params?.view && params.view !== 'full') {
      endpoint.searchParams.set('view', params.view);
    }
    if (params?.tripId) {
      endpoint.searchParams.set('tripId', params.tripId);
    }
    return endpoint.toString();
  } catch {
    const query = new URLSearchParams();
    if (params?.view && params.view !== 'full') {
      query.set('view', params.view);
    }
    if (params?.tripId) {
      query.set('tripId', params.tripId);
    }
    const separator = flightsApiUrl.includes('?') ? '&' : '?';
    return `${flightsApiUrl}${separator}${query.toString()}`;
  }
}

async function fetchRemoteFlights(params?: { view?: FlightsFetchView; tripId?: string }): Promise<FlightsApiResponse> {
  if (!flightsApiUrl) {
    throw new Error('Trip sync is not configured. Set EXPO_PUBLIC_FLIGHTS_API_URL.');
  }

  const response = await fetch(buildFlightsRequestUrl(params), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(flightsApiKey ? { 'x-api-key': flightsApiKey } : {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const apiError = parseApiErrorMessage(payload);
    throw new Error(apiError ?? `Trip sync failed (${response.status}).`);
  }

  if (!isFlightsApiResponse(payload)) {
    throw new Error('Trip sync returned an unexpected response shape.');
  }

  return payload;
}

export function TripsDataProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>(() => seedTrips.map((trip) => ({ ...trip, bookings: [...trip.bookings] })));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loadedTripIds, setLoadedTripIds] = useState<Set<string>>(new Set());
  const [loadingTripIds, setLoadingTripIds] = useState<Set<string>>(new Set());
  const refreshInFlightRef = useRef(false);
  const tripLoadInFlightRef = useRef(new Map<string, Promise<void>>());

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    setIsLoading(true);

    try {
      const payload = await fetchRemoteFlights({ view: 'summary' });
      setTrips(payload.trips);
      setLastSyncedAt(payload.generatedAt);
      setLoadedTripIds(new Set());
      setLoadingTripIds(new Set());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sync flights right now.';
      setError(message);
    } finally {
      setIsLoading(false);
      refreshInFlightRef.current = false;
    }
  }, []);

  const ensureTripLoaded = useCallback(
    async (tripId: string, options?: EnsureTripOptions) => {
      const normalizedTripId = tripId.trim();
      if (!normalizedTripId) {
        return;
      }

      const force = options?.force === true;

      if (!force && loadedTripIds.has(normalizedTripId)) {
        return;
      }

      const currentInFlight = tripLoadInFlightRef.current.get(normalizedTripId);
      if (currentInFlight) {
        await currentInFlight;
        return;
      }

      const loadPromise = (async () => {
        setLoadingTripIds((previous) => {
          const next = new Set(previous);
          next.add(normalizedTripId);
          return next;
        });

        try {
          const payload = await fetchRemoteFlights({ view: 'trip', tripId: normalizedTripId });
          const loadedTrip = payload.trips.find((candidate) => candidate.id === normalizedTripId) ?? payload.trips[0];

          if (loadedTrip) {
            setTrips((previous) => {
              const matchIndex = previous.findIndex((candidate) => candidate.id === loadedTrip.id);
              if (matchIndex < 0) {
                return [...previous, loadedTrip];
              }

              const next = previous.slice();
              next[matchIndex] = loadedTrip;
              return next;
            });

            setLoadedTripIds((previous) => {
              const next = new Set(previous);
              next.add(loadedTrip.id);
              return next;
            });
          }

          setLastSyncedAt(payload.generatedAt);
          setError(null);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unable to load trip details right now.';
          setError(message);
        } finally {
          setLoadingTripIds((previous) => {
            const next = new Set(previous);
            next.delete(normalizedTripId);
            return next;
          });
          tripLoadInFlightRef.current.delete(normalizedTripId);
        }
      })();

      tripLoadInFlightRef.current.set(normalizedTripId, loadPromise);
      await loadPromise;
    },
    [loadedTripIds]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isTripLoaded = useCallback((tripId: string) => loadedTripIds.has(tripId.trim()), [loadedTripIds]);
  const isTripLoading = useCallback((tripId: string) => loadingTripIds.has(tripId.trim()), [loadingTripIds]);

  const value = useMemo<TripsDataContextValue>(
    () => ({
      trips,
      isLoading,
      error,
      lastSyncedAt,
      refresh,
      ensureTripLoaded,
      isTripLoaded,
      isTripLoading,
    }),
    [trips, isLoading, error, lastSyncedAt, refresh, ensureTripLoaded, isTripLoaded, isTripLoading]
  );

  return <TripsDataContext.Provider value={value}>{children}</TripsDataContext.Provider>;
}

export function useTripsData(): TripsDataContextValue {
  const context = useContext(TripsDataContext);

  if (!context) {
    throw new Error('useTripsData must be used within a TripsDataProvider');
  }

  return context;
}
