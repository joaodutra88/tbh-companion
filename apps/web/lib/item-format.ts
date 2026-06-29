// Pure helpers for gear/item display — icons, names, and grade badges.
// Mirrors the pattern of heroIcon / heroName in format.ts.
// No DOM, no side-effects, fully unit-testable.
import type { GameDB } from "@tbh/engine";
import { gearNames as gearNamesRaw } from "@tbh/game-data";

// JSON import is typed as the literal shape of the file; cast to a plain map
// to avoid `any` while keeping the helper signature generic.
const gearNames = gearNamesRaw as Record<string, string>;

// ── itemIcon ─────────────────────────────────────────────────────────────────

/**
 * Public URL for a gear or material item icon, or "" when missing.
 * The `icon` field in `db.items[k]` is already a web-root-relative path
 * (e.g. `/game/gear/sword/SWORD_300001.png`) — no transformation needed.
 * Caller should hide `<img>` when the returned value is "".
 */
export function itemIcon(k: number | string, db: GameDB): string {
  const icon = db.items?.[String(k)]?.icon;
  return typeof icon === "string" ? icon : "";
}

// ── gearName ─────────────────────────────────────────────────────────────────

/**
 * English display name for a gear item.
 * `db.items[k].name` is never populated — names come from `gearNames` (EN-only).
 * Falls back to "Item #K" for unknown keys (materials use `itemNames`, not this).
 */
export function gearName(k: number | string): string {
  return gearNames[String(k)] ?? `Item #${k}`;
}

// ── gradeStyle ────────────────────────────────────────────────────────────────

export interface GradeStyle {
  /** PT-BR display label shown in the badge (e.g. "Lendário"). */
  label: string;
  /**
   * Tailwind utility classes for the badge element.
   * All tokens are on-palette (war-table theme): dim/text/teal/gold/coral.
   *
   * Grade ramp (10 tiers, ascending power):
   *   Tier 1-2  (COMMON/UNCOMMON)  — neutral (dim → text): low-drop mundane gear
   *   Tier 3-4  (RARE/LEGENDARY)   — teal: combat-grade upgrade signal
   *   Tier 5-6  (IMMORTAL/ARCANA)  — gold: power-threshold elite gear
   *   Tier 7-8  (BEYOND/CELESTIAL) — coral dim: prestige zone
   *   Tier 9-10 (DIVINE/COSMIC)    — coral vivid: endgame pinnacle
   *
   * The icon PNG does NOT change between grades of the same tier — grade
   * must always be conveyed via this badge/color, never via the icon alone.
   */
  className: string;
}

/**
 * All 10 grades in ascending power order (matches `db.grades`).
 * Exported so the legend/filter components can iterate without duplicating the list.
 */
export const GEAR_GRADES = [
  "COMMON",
  "UNCOMMON",
  "RARE",
  "LEGENDARY",
  "IMMORTAL",
  "ARCANA",
  "BEYOND",
  "CELESTIAL",
  "DIVINE",
  "COSMIC",
] as const;

export type GearGrade = (typeof GEAR_GRADES)[number];

// Badge base: small pill with border, same padding for all tiers.
const BASE = "text-xs px-1.5 py-0.5 rounded border";

const GRADE_MAP: Record<GearGrade, GradeStyle> = {
  // ── Tier 1-2: neutral ───────────────────────────────────────────────────────
  COMMON: {
    label: "Comum",
    className: `${BASE} text-dim border-line bg-surface-2`,
  },
  UNCOMMON: {
    label: "Incomum",
    className: `${BASE} text-text border-line bg-surface-2`,
  },
  // ── Tier 3-4: teal ─────────────────────────────────────────────────────────
  RARE: {
    label: "Raro",
    className: `${BASE} text-teal/70 border-teal/40 bg-surface-2`,
  },
  LEGENDARY: {
    label: "Lendário",
    className: `${BASE} text-teal border-teal bg-surface-2`,
  },
  // ── Tier 5-6: gold ─────────────────────────────────────────────────────────
  IMMORTAL: {
    label: "Imortal",
    className: `${BASE} text-gold/70 border-gold/40 bg-surface-2`,
  },
  ARCANA: {
    label: "Arcana",
    className: `${BASE} text-gold border-gold bg-surface-2`,
  },
  // ── Tier 7-8: coral dim ────────────────────────────────────────────────────
  BEYOND: {
    label: "Beyond",
    className: `${BASE} text-gold border-gold bg-gold/10`,
  },
  CELESTIAL: {
    label: "Celestial",
    className: `${BASE} text-coral/70 border-coral/40 bg-surface-2`,
  },
  // ── Tier 9-10: coral vivid ─────────────────────────────────────────────────
  DIVINE: {
    label: "Divino",
    className: `${BASE} text-coral border-coral bg-surface-2`,
  },
  COSMIC: {
    label: "Cósmico",
    className: `${BASE} text-coral border-coral bg-coral/15`,
  },
};

/** Neutral fallback for unknown/future grades. */
const GRADE_FALLBACK: GradeStyle = {
  label: "?",
  className: `${BASE} text-dim border-line bg-surface-2`,
};

/**
 * War-table badge style for a gear grade.
 * Accepts any string (the grade comes from the engine as `string`).
 * Returns a neutral fallback for unknown grades.
 */
export function gradeStyle(grade: string): GradeStyle {
  return GRADE_MAP[grade as GearGrade] ?? GRADE_FALLBACK;
}
