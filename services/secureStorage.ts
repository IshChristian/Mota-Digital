import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';
const RIDER_STATUS_KEY = 'rider_status';

// On web there is no secure keystore. Only the auth token is kept in localStorage so a page
// refresh keeps the user signed in; the profile is re-fetched from the API on load instead
// of being cached in script-readable storage.
let webToken: string | null = null;

function readWebToken(): string | null {
  try {
    return globalThis.localStorage?.getItem(TOKEN_KEY) ?? webToken;
  } catch {
    return webToken;
  }
}

function writeWebToken(token: string | null) {
  webToken = token;
  try {
    if (token) globalThis.localStorage?.setItem(TOKEN_KEY, token);
    else globalThis.localStorage?.removeItem(TOKEN_KEY);
  } catch {
    // Storage blocked (private mode, disabled site data): fall back to memory only.
  }
}

async function secureStore() {
  return import('expo-secure-store');
}

export async function storeToken(token: string) {
  if (Platform.OS === 'web') {
    writeWebToken(token);
    return;
  }
  const store = await secureStore();
  await store.setItemAsync(TOKEN_KEY, token);
}

export async function getStoredToken() {
  if (Platform.OS === 'web') return readWebToken();
  const store = await secureStore();
  return store.getItemAsync(TOKEN_KEY);
}

export async function removeStoredToken() {
  if (Platform.OS === 'web') {
    writeWebToken(null);
    return;
  }
  const store = await secureStore();
  await store.deleteItemAsync(TOKEN_KEY);
}

export async function storeSensitiveJson(key: 'user' | 'riderStatus', value: unknown) {
  // Do not persist sensitive session state in script-readable browser storage.
  if (Platform.OS === 'web') return;
  const store = await secureStore();
  await store.setItemAsync(key === 'user' ? USER_KEY : RIDER_STATUS_KEY, JSON.stringify(value));
}

export async function getSensitiveJson<T>(key: 'user' | 'riderStatus'): Promise<T | null> {
  if (Platform.OS === 'web') return null;
  const store = await secureStore();
  const value = await store.getItemAsync(key === 'user' ? USER_KEY : RIDER_STATUS_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn(`Discarding invalid secure ${key} cache`, error);
    await store.deleteItemAsync(key === 'user' ? USER_KEY : RIDER_STATUS_KEY);
    return null;
  }
}

export async function clearSensitiveSession() {
  await removeStoredToken();
  if (Platform.OS === 'web') return;
  const store = await secureStore();
  await Promise.all([store.deleteItemAsync(USER_KEY), store.deleteItemAsync(RIDER_STATUS_KEY)]);
}
