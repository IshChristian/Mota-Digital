export type AppRole = 'driver' | 'client' | 'agent' | 'admin' | 'manager' | 'moderator';

export function normalizeRole(role?: string): AppRole {
  const normalized = role?.trim().toLowerCase();
  if (normalized === 'passenger' || normalized === 'user') return 'client';
  if (normalized === 'client' || normalized === 'agent' || normalized === 'admin' ||
      normalized === 'manager' || normalized === 'moderator') return normalized;
  return 'driver';
}

export const isPassengerRole = (role?: string) => normalizeRole(role) === 'client';
