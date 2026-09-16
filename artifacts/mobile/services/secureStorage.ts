import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';
const RIDER_STATUS_KEY = 'rider_status';

let webToken: string | null = null;

async function secureStore() {
  return import('expo-secure-store');
}

export async function storeToken(token: string) {
  if (Platform.OS === 'web') {
    webToken = token;
    return;
  }
  const store = await secureStore();
  await store.setItemAsync(TOKEN_KEY, token);
}

export async function getStoredToken() {
  if (Platform.OS === 'web') return webToken;
  const store = await secureStore();
  return store.getItemAsync(TOKEN_KEY);
}

export async function removeStoredToken() {
  if (Platform.OS === 'web') {
    webToken = null;
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
