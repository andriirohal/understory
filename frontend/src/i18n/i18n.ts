import en from "./en.json";
import de from "./de.json";
import ua from "./ua.json";
import pl from "./pl.json";

const translations = {
  en,
  de,
  ua,
  pl,
} as const;

export type Language = keyof typeof translations;

const DEFAULT_LANGUAGE: Language = "en";
const LANGUAGE_STORAGE_KEY = "lang";

let currentLanguage: Language = DEFAULT_LANGUAGE;

let isChangingLanguage = false;

function isLanguage(value: string | null): value is Language {
  return (
    value !== null && Object.prototype.hasOwnProperty.call(translations, value)
  );
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function isLanguageChanging(): boolean {
  return isChangingLanguage;
}

function getTranslation(language: Language, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }

    return (current as Record<string, unknown>)[part];
  }, translations[language]);

  return typeof value === "string" ? value : undefined;
}

export function getTranslations(language: Language, key: string): string {
  const translation = getTranslation(language, key);

  if (translation !== undefined) {
    return translation;
  }

  const fallback = getTranslation(DEFAULT_LANGUAGE, key);

  return fallback ?? key;
}

export function t(key: string, variables?: Record<string, string>): string {
  let translation = getTranslations(currentLanguage, key);

  if (!variables) {
    return translation;
  }

  for (const [name, value] of Object.entries(variables)) {
    translation = translation.split(`{${name}}`).join(value);
  }

  return translation;
}

function applyLanguage(language: Language): void {
  document.documentElement.lang = language;

  document.title = getTranslations(language, "meta.title");
}

export function setLanguage(language: Language): void {
  if (language === currentLanguage) {
    return;
  }

  isChangingLanguage = true;

  currentLanguage = language;

  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);

  applyLanguage(language);

  window.dispatchEvent(new Event("languagechange"));

  requestAnimationFrame(() => {
    isChangingLanguage = false;
  });
}

export function initLanguage(): void {
  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);

  currentLanguage = isLanguage(storedLanguage)
    ? storedLanguage
    : DEFAULT_LANGUAGE;

  applyLanguage(currentLanguage);
}
