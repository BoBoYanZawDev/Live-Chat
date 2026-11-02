import Constants from 'expo-constants';

const API_PORT = 4000;

/**
 * 1. EXPO_PUBLIC_API_URL (inlined at bundle time) wins.
 * 2. In dev, the Metro host (e.g. "192.168.1.5:8081") is the machine running the backend too.
 * 3. Fallback: localhost (iOS simulator).
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${API_PORT}`;

  return `http://localhost:${API_PORT}`;
}

export const API_URL = resolveApiUrl();

/** API media paths are relative (/uploads/...); make them absolute. */
export function mediaUrl(path: string): string {
  return /^https?:\/\//i.test(path) ? path : `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export const LIMITS = {
  maxFiles: 10,
  maxImageBytes: 15 * 1024 * 1024,
  maxVideoBytes: 100 * 1024 * 1024,
  imageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
  videoTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
} as const;
