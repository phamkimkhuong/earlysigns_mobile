import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const memory = new Map<string, string>();
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

export async function hydrateStorage(): Promise<void> {
  if (hydrated) return;
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      if (keys.length) {
        const pairs = await AsyncStorage.multiGet(keys);
        pairs.forEach(([key, value]) => {
          if (value != null) memory.set(key, value);
        });
      }
    } catch {
      /* ignore */
    } finally {
      hydrated = true;
    }
  })();
  return hydratePromise;
}

export function getItem(key: string): string | null {
  const value = memory.get(key);
  return value == null ? null : value;
}

export function setItem(key: string, value: any): void {
  if (value == null) {
    memory.delete(key);
    AsyncStorage.removeItem(key).catch(() => {});
    return;
  }
  const text = String(value);
  memory.set(key, text);
  AsyncStorage.setItem(key, text).catch(() => {});
}

export function removeItem(key: string): void {
  memory.delete(key);
  AsyncStorage.removeItem(key).catch(() => {});
}

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    const val = await SecureStore.getItemAsync(key);
    return val ?? getItem(key);
  } catch {
    return getItem(key);
  }
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  setItem(key, value);
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // fallback to memory/AsyncStorage
  }
}

export async function removeSecureItem(key: string): Promise<void> {
  removeItem(key);
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}

export const ONBOARDING_COMPLETED_KEY = "earlysigns_onboarding_completed";

export function hasCompletedOnboarding(): boolean {
  return getItem(ONBOARDING_COMPLETED_KEY) === "true";
}

export function setCompletedOnboarding(completed: boolean): void {
  setItem(ONBOARDING_COMPLETED_KEY, completed ? "true" : "false");
}

