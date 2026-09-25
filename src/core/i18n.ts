import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "@/locales/en.json";
import vi from "@/locales/vi.json";

export const LANG_STORAGE_KEY = "app_lang";

const resources = {
  en: { translation: en },
  vi: { translation: vi },
};

export async function initI18n(initialLng?: string | null): Promise<typeof i18n> {
  const lng = initialLng === "en" ? "en" : "vi";
  if (i18n.isInitialized) {
    await i18n.changeLanguage(lng);
    return i18n;
  }
  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: "vi",
    interpolation: { escapeValue: false },
    compatibilityJSON: "v4",
  });
  return i18n;
}

export async function getStoredLanguage(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LANG_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setStoredLanguage(lng: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
}

export default i18n;
