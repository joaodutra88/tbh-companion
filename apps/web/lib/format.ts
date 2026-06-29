// Formatting helpers for the Overview — numbers as telemetry (mono/tabular),
// durations, percentages, and i18n-aware hero name/icon resolution.
// PT-BR locale: thousands "." and decimal "," (matches the UI language).
import type { GameDB } from "@tbh/engine";

// ── i18n ────────────────────────────────────────────────────────────────────
// Game DB strings (hero/rune names) are either a plain string or a locale map
// like { "pt-BR": "Cavaleiro", "en-US": "Knight", ... }.
// Resolution order: value[locale] → value['en-US'] → value['pt-BR'] → first string.
// Default locale is 'en-US' (game runs in English for most players).

export function localized(value: unknown, locale = "en-US"): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const map = value as Record<string, unknown>;
    const byLocale = map[locale];
    if (typeof byLocale === "string") return byLocale;
    const byEn = map["en-US"];
    if (typeof byEn === "string") return byEn;
    const byPt = map["pt-BR"];
    if (typeof byPt === "string") return byPt;
    const first = Object.values(map).find((v) => typeof v === "string");
    if (typeof first === "string") return first;
  }
  return "";
}

// ── Numbers ───────────────────────────────────────────────────────────────────

/** Integer with PT-BR thousands separator: 171505 → "171.505". */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("pt-BR");
}

/** Compact magnitude: 1234 → "1,2k", 3_400_000 → "3,4M", 966 → "966". */
export function fmtK(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs < 1000) return sign + String(Math.round(abs));
  const oneDecimal = (v: number): string => {
    const s = v.toFixed(1).replace(".", ",");
    return s.endsWith(",0") ? s.slice(0, -2) : s;
  };
  if (abs < 1_000_000) return `${sign}${oneDecimal(abs / 1000)}k`;
  if (abs < 1_000_000_000) return `${sign}${oneDecimal(abs / 1_000_000)}M`;
  return `${sign}${oneDecimal(abs / 1_000_000_000)}B`;
}

/** Human duration from seconds: 8000 → "2h 13m", 90 → "1m", 30 → "30s". */
export function fmtDur(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "—";
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h < 24) return remM ? `${h}h ${remM}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const remH = h % 24;
  return remH ? `${d}d ${remH}h` : `${d}d`;
}

/** Fraction 0..1 → integer percent string: 0.458 → "46%". */
export function pct(x: number): string {
  if (!Number.isFinite(x)) return "—";
  return `${Math.round(x * 100)}%`;
}

/** Per-hour rate in compact format: 12345 → "12,3k/h". Pass the already-computed /h value. */
export function fmtPerHour(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${fmtK(n)}/h`;
}

// ── Hero resolution ─────────────────────────────────────────────────────────

/** Hero display name (en-US by default), falling back to a stable label. */
export function heroName(hk: number | string, db: GameDB | null, locale = "en-US"): string {
  const raw = db?.heroes[String(hk)]?.name as unknown;
  const name = localized(raw, locale);
  return name || `Herói ${hk}`;
}

/** Public URL for the hero portrait, or "" when missing (caller hides <img>). */
export function heroIcon(hk: number | string, db: GameDB | null): string {
  const icon = db?.heroes[String(hk)]?.icon;
  return typeof icon === "string" ? icon : "";
}
