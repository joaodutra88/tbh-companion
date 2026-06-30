// Pure helpers for gear stat display, metric targeting, and rarity — no DOM, no side-effects.
// Consumed by GearComparatorV2 UI (Task 2+). Engine is unchanged.
import type { GameDB } from "@tbh/engine";
import { gearStatLines, RUNE_MAP } from "@tbh/engine";
import { statLabel } from "./stat-labels";

// ---------------------------------------------------------------------------
// Metric targets
// ---------------------------------------------------------------------------

/** Engine base-stat targets that drive DPS. */
const DPS_TARGETS = new Set(["AttackDamage", "AttackSpeed", "CriticalChance", "CriticalDamage"]);
/** Engine base-stat targets that drive Defense (EHP). */
const DEF_TARGETS = new Set(["MaxHp", "Armor"]);
/** Engine base-stat targets that drive Power (geometric-mean of DPS × EHP). */
const POWER_TARGETS = new Set([...DPS_TARGETS, ...DEF_TARGETS]);

/**
 * Sets of engine base-stat targets keyed by metric id.
 * DPS: AttackDamage, AttackSpeed, CriticalChance, CriticalDamage.
 * Def: MaxHp, Armor.
 * Power: union of both (drives the √(DPS × EHP) formula).
 */
export const metricTargets: Record<"power" | "dps" | "def", Set<string>> = {
  dps: DPS_TARGETS,
  def: DEF_TARGETS,
  power: POWER_TARGETS,
};

// ---------------------------------------------------------------------------
// GEAR_METRICS
// ---------------------------------------------------------------------------

/**
 * The three metrics the comparator exposes.
 * `field` matches the keys of `PowerDelta` returned by the engine.
 */
export const GEAR_METRICS = [
  { id: "power" as const, label: "Poder", field: "dPower" as const },
  { id: "dps" as const, label: "DPS", field: "dDps" as const },
  { id: "def" as const, label: "Defesa", field: "dEhp" as const },
] as const;

export type GearMetricId = "power" | "dps" | "def";

// ---------------------------------------------------------------------------
// Stat → engine target map
// ---------------------------------------------------------------------------

/**
 * Maps AllHero* (and other compound) stat keys to their engine base-stat target.
 * Built by mirroring RUNE_MAP (exported from @tbh/engine).
 *
 * Gear stat lines from gearStatLines() already use base-stat keys
 * (AttackDamage, Armor, etc.) for b1s/b2s and inh lines, so those keys
 * fall through to the identity fallback in statDrivesMetric.
 * This map handles the rune-style AllHero* keys the task tests require.
 */
const GEAR_STAT_TARGET: Record<string, string> = Object.fromEntries(
  Object.entries(RUNE_MAP).map(([k, [target]]) => [k, target]),
);

/**
 * Whether a gear (or rune) stat key drives a given metric.
 *
 * Resolves the stat key to its engine base-stat target:
 *   1. AllHero* keys are mapped via RUNE_MAP → target.
 *   2. Keys not in the map (e.g. "AttackDamage", "Armor") are used as-is.
 *
 * Then checks membership in metricTargets[metricId].
 * Returns false for unknown stats.
 */
export function statDrivesMetric(statKey: string, metricId: GearMetricId): boolean {
  const target = GEAR_STAT_TARGET[statKey] ?? statKey;
  return metricTargets[metricId].has(target);
}

// ---------------------------------------------------------------------------
// Gear stat rows
// ---------------------------------------------------------------------------

export interface GearStatRow {
  /** Engine stat key (e.g. "AttackDamage", "Armor"). */
  statKey: string;
  /** Readable label via statLabel (e.g. "Attack Damage"). */
  label: string;
  /** Raw numeric value from the gear definition. */
  value: number;
  /** ModType string from the engine ("FLAT" | "ADDITIVE" | "MULTIPLICATIVE"). */
  mt: string;
  /**
   * True when the value is percentage-based (ADDITIVE or MULTIPLICATIVE).
   * FLAT = absolute bonus; anything else = percent-scaled.
   */
  isPercent: boolean;
}

/**
 * Returns labeled stat rows for a gear item.
 * Wraps gearStatLines() from the engine and enriches each line with a UI label.
 * Pure — no mutations, no side-effects. Returns [] for unknown gear keys.
 */
export function gearStatRows(db: GameDB, key: number | string): GearStatRow[] {
  return gearStatLines(db, key).map(([statKey, mt, value]) => ({
    statKey,
    label: statLabel(statKey),
    value,
    mt,
    isPercent: mt !== "FLAT",
  }));
}

/**
 * Formata o valor de uma stat de gear pra exibição, casando com o tooltip in-game.
 *
 * FLAT → número absoluto ("+839").
 * ADDITIVE / MULTIPLICATIVE → percentual na escala /1000 do engine (PERCENT_DIVISOR),
 * então o percentual real é `value / 10`. Ex.: `MULTIPLICATIVE 171` → "+17,1%"
 * (×1,171 no cálculo), NÃO "+171%". É o mesmo número que o jogo mostra no item.
 */
export function formatGearStatValue(value: number, mt: string): string {
  if (mt === "FLAT") return `+${value.toLocaleString("pt-BR")}`;
  const pct = value / 10;
  return `+${pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
