import type { Trip } from './trips';
import { tripPhotos } from './tripPhotos';

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const titleAliasToPhotoKey: Record<string, string> = {
  'montreal ottawa': 'canada',
  montreal: 'canada',
  ottawa: 'canada',
  canada: 'canada',
  'asia backpacking': 'sea-japan',
  'south east asia': 'sea-japan',
  'southeast asia': 'sea-japan',
  'sea japan': 'sea-japan',
  'south east asia japan': 'sea-japan',
};

export function getTripPhotoKey(trip: Pick<Trip, 'id' | 'title'>): string | null {
  if (tripPhotos[trip.id]) {
    return trip.id;
  }

  const normalizedTitle = normalizeTitle(trip.title);
  const aliasMatch = titleAliasToPhotoKey[normalizedTitle];
  if (aliasMatch && tripPhotos[aliasMatch]) {
    return aliasMatch;
  }

  return null;
}

export function getTripPhotos(trip: Pick<Trip, 'id' | 'title'>): number[] {
  const key = getTripPhotoKey(trip);
  return key ? tripPhotos[key] : [];
}
