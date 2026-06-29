"use client";

// Compact language selector for game-entity names (heroes, runes, items).
// Reads/writes the EntityLocale context; persists to localStorage automatically.
// War-table styled: muted border, subtle text, gold accent on focus.

import React from "react";
import { GAME_LOCALES, useEntityLocale } from "@/lib/entity-locale";

export function LanguageSelect() {
  const { locale, setLocale } = useEntityLocale();

  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">Idioma dos nomes do jogo</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        aria-label="Idioma dos nomes do jogo"
        className={
          "cursor-pointer rounded border border-line bg-surface px-1.5 py-0.5 " +
          "text-[11px] font-body text-dim transition-colors " +
          "hover:border-dim/50 hover:text-text " +
          "focus:border-gold/60 focus:text-text focus:outline-none"
        }
      >
        {GAME_LOCALES.map(({ code, label }) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
