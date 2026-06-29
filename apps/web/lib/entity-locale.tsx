"use client";

// Entity-locale context — controls which game locale is used for hero/rune/item
// names. The app UI/chrome stays PT-BR; only game-entity names change.
// Default: 'en-US'. Persisted to localStorage (key: tbh:entityLocale).
// SSR-safe: state initializes to 'en-US' on server AND first client render,
// then a useEffect reads localStorage and updates — no hydration mismatch.

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// ── Locale catalogue ─────────────────────────────────────────────────────────

export const GAME_LOCALES = [
  { code: "en-US",   label: "English"       },
  { code: "pt-BR",   label: "Português"     },
  { code: "es-ES",   label: "Español"       },
  { code: "fr-FR",   label: "Français"      },
  { code: "de-DE",   label: "Deutsch"       },
  { code: "ja-JP",   label: "日本語"         },
  { code: "ko-KR",   label: "한국어"         },
  { code: "zh-Hans", label: "简体中文"       },
  { code: "zh-Hant", label: "繁體中文"       },
  { code: "ru-RU",   label: "Русский"       },
  { code: "pl-PL",   label: "Polski"        },
  { code: "tr-TR",   label: "Türkçe"        },
  { code: "uk-UA",   label: "Українська"    },
  { code: "id-ID",   label: "Indonesia"     },
  { code: "th-TH",   label: "ไทย"           },
  { code: "vi-VN",   label: "Tiếng Việt"   },
] as const;

export type GameLocaleCode = (typeof GAME_LOCALES)[number]["code"];

const STORAGE_KEY = "tbh:entityLocale";
const DEFAULT_LOCALE: GameLocaleCode = "en-US";

function isValidLocale(v: string): v is GameLocaleCode {
  return GAME_LOCALES.some((l) => l.code === v);
}

// ── Context ──────────────────────────────────────────────────────────────────

export interface EntityLocaleState {
  locale: string;
  setLocale: (locale: string) => void;
}

// Default value allows useEntityLocale() to work without a provider (returns
// en-US, noop setter). This keeps smoke tests free of wrapper boilerplate.
const EntityLocaleContext = createContext<EntityLocaleState>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
});

// ── Provider ─────────────────────────────────────────────────────────────────

export function EntityLocaleProvider({ children }: { children: ReactNode }) {
  // Start with the stable default so server render and first client render match.
  const [locale, setLocaleState] = useState<string>(DEFAULT_LOCALE);

  // After mount, read the user's stored preference (if any).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isValidLocale(stored)) {
        setLocaleState(stored);
      }
    } catch {
      // localStorage unavailable (SSR, private browsing, etc.) — keep default.
    }
  }, []);

  const setLocale = (next: string) => {
    if (!isValidLocale(next)) return;
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore write failures
    }
  };

  return (
    <EntityLocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </EntityLocaleContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useEntityLocale(): EntityLocaleState {
  return useContext(EntityLocaleContext);
}
