// Stage-difficulty formatting helpers — pure, no React, no side-effects.
// PT-BR labels, Tailwind tone tokens, and option-text for <select> elements.
import type { GameDB } from "@tbh/engine";

// ── Difficulty maps ───────────────────────────────────────────────────────────

/** PT-BR label for each raw difficulty key (verbatim from spec). */
export const DIFF_LABEL: Record<string, string> = {
  NORMAL: "Normal",
  NIGHTMARE: "Pesadelo",
  HELL: "Inferno",
  TORMENT: "Tormento",
};

/** Difficulty tiers in ascending order (Normal→Tormento). */
export const DIFF_ORDER = ["NORMAL", "NIGHTMARE", "HELL", "TORMENT"] as const;

// ── Tailwind tone ─────────────────────────────────────────────────────────────

/**
 * Returns the Tailwind text-color token for a difficulty tier.
 * Escalates: Normal (subtle) → Pesadelo → Inferno → Tormento (vivid/alert).
 * Returns "" when diff is absent or unknown (graceful: caller skips the chip).
 */
export function diffTone(diff: string): string {
  switch (diff) {
    case "NORMAL":
      return "text-dim";
    case "NIGHTMARE":
      return "text-teal";
    case "HELL":
      return "text-gold";
    case "TORMENT":
      return "text-coral";
    default:
      return "";
  }
}

// ── Plain-text stage label for <option> elements ──────────────────────────────

/**
 * Returns a plain-text stage descriptor for use in <option> elements (no JSX).
 * Format with diff:    "Tormento · 3-9 (nv 95)"
 * Format without diff: "3-9 (nv 70)"
 * Fallback when key missing from db: String(key)
 */
export function stageOptionText(db: GameDB, key: string): string {
  const stage = db.stages[key];
  if (!stage) return String(key);

  const label = stage.label ?? String(key);
  const nv = stage.lvl;
  const diffLabel = stage.diff ? DIFF_LABEL[stage.diff] : undefined;

  if (diffLabel) {
    return `${diffLabel} · ${label} (nv ${nv})`;
  }
  return `${label} (nv ${nv})`;
}
