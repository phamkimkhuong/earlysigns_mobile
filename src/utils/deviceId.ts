import { getItem, setItem } from "@/services/storage";
import { DEVICE_ID_KEY } from "@/store/useAuthStore";

/**
 * Generate a random UUID v4 string (compliant with RFC 4122)
 */
function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Obtain existing installation device ID or generate a new persistent UUID.
 *
 * NOTE: As specified in Section 3.2 of the technical spec, this identifier
 * is purely an installation-scoped random UUID stored in SecureStore/AsyncStorage.
 * It NEVER uses hardware identifiers (IMEI, MAC address, Serial number)
 * to comply with Apple App Store & Google Play privacy policies.
 */
export function getOrCreateDeviceId(): string {
  const existing = getItem(DEVICE_ID_KEY);
  if (existing && existing.length >= 8) {
    return existing;
  }
  const generated = generateUuid();
  setItem(DEVICE_ID_KEY, generated);
  return generated;
}

/**
 * Retrieve the current device ID without generating a new one if not present.
 */
export function getDeviceId(): string {
  return getItem(DEVICE_ID_KEY) || "";
}
