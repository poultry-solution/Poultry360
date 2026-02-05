"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANGUAGE, STORAGE_KEY, translations, UiLanguage } from "./index";

type TranslationParams = Record<string, string | number>;

interface I18nContextValue {
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
  t: (key: string, params?: TranslationParams) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function getNestedValue(obj: Record<string, any>, path: string): string | undefined {
  const parts = path.split(".");
  let current: any = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return undefined;
    }
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value === undefined || value === null ? match : String(value);
  });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<UiLanguage>(DEFAULT_LANGUAGE);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as UiLanguage | null;
      if (saved === "en" || saved === "ne") {
        setLanguageState(saved);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((next: UiLanguage) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const t = useCallback(
    (key: string, params?: TranslationParams) => {
      const current = getNestedValue(translations[language], key);
      const fallback = getNestedValue(translations[DEFAULT_LANGUAGE], key);
      const value = current || fallback || key;
      return interpolate(value, params);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18nContext(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18nContext must be used within I18nProvider");
  }
  return context;
}
