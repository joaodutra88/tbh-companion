"use client";

// Compact language selector for game-entity names (heroes, runes, items).
// Reads/writes the EntityLocale context; persists to localStorage automatically.
// War-table styled: muted border, subtle text, gold accent on focus.
// Uses shadcn Select (Base UI) instead of native <select> to fix the
// native light dropdown on Windows and improve keyboard accessibility.

import React from "react";
import { GAME_LOCALES, useEntityLocale } from "@/lib/entity-locale";
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectPositioner,
  SelectPopup,
  SelectList,
  SelectItem,
  SelectItemText,
} from "@/components/ui/select";

export function LanguageSelect() {
  const { locale, setLocale } = useEntityLocale();

  return (
    <SelectRoot<string>
      value={locale}
      onValueChange={(v) => { if (v !== null) setLocale(v); }}
    >
      <SelectTrigger
        aria-label="Idioma dos nomes do jogo"
        className="border-line/70 bg-surface hover:border-dim/50 hover:text-text text-dim"
      >
        <SelectValue>
          {(value: string | null) => {
            const found = GAME_LOCALES.find((l) => l.code === value);
            return found?.label ?? value ?? "";
          }}
        </SelectValue>
        <SelectIcon />
      </SelectTrigger>
      <SelectPortal>
        <SelectPositioner>
          <SelectPopup>
            <SelectList>
              {GAME_LOCALES.map(({ code, label }) => (
                <SelectItem key={code} value={code}>
                  <SelectItemText>{label}</SelectItemText>
                </SelectItem>
              ))}
            </SelectList>
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  );
}
