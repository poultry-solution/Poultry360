import en from "./en.json";
import ne from "./ne.json";

export type UiLanguage = "en" | "ne";

export const translations: Record<UiLanguage, Record<string, any>> = {
  en,
  ne,
};

export const DEFAULT_LANGUAGE: UiLanguage = "en";
export const STORAGE_KEY = "p360.language";
