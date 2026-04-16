import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Trip } from './trips';
import type { FlightsApiErrorResponse, FlightsApiResponse } from '../lib/flightsSync/contracts';

type TripsDataContextValue = {
  trips: Trip[];
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  refresh: () => Promise<void>;
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

async function fetchRemoteFlights(): Promise<FlightsApiResponse> {
  if (!flightsApiUrl) {
    throw new Error('Trip sync is not configured. Set EXPO_PUBLIC_FLIGHTS_API_URL.');
  }

  const response = await fetch(flightsApiUrl, {
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
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const refreshInFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    setIsLoading(true);

    try {
      const payload = await fetchRemoteFlights();
      setTrips(payload.trips);
      setLastSyncedAt(payload.generatedAt);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sync flights right now.';
      setError(message);
    } finally {
      setIsLoading(false);
      refreshInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<TripsDataContextValue>(
    () => ({
      trips,
      isLoading,
      error,
      lastSyncedAt,
      refresh,
    }),
    [trips, isLoading, error, lastSyncedAt, refresh]
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
