// Maps engine actions (recommend().actions / .coach) to PT-BR directives.
// Mirrors the copilot's actionText but typed and localized. Every known `k`
// produces a concrete sentence; unknown `k` returns a non-empty fallback.
import type { Action, GameDB } from "@tbh/engine";
import { fmt, heroName, localized } from "./format";

// ── Safe field readers (Action extras are typed `unknown`) ──────────────────────

function num(a: Action, key: string): number {
  const v = a[key];
  return typeof v === "number" ? v : 0;
}

function str(a: Action, key: string): string {
  const v = a[key];
  return typeof v === "string" || typeof v === "number" ? String(v) : "";
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

// ── Localized lookups ───────────────────────────────────────────────────────

function runeName(target: unknown, db: GameDB | null, locale: string): string {
  const raw = db?.runes[String(target)]?.name as unknown;
  return localized(raw, locale) || `runa ${String(target)}`;
}

const GRADE_PT: Record<string, string> = {
  COMMON: "Comum",
  UNCOMMON: "Incomum",
  RARE: "Raro",
  LEGENDARY: "Lendário",
  IMMORTAL: "Imortal",
  ARCANA: "Arcano",
  BEYOND: "Além",
  CELESTIAL: "Celestial",
  DIVINE: "Divino",
  COSMIC: "Cósmico",
};

function gradeLabel(grade: string): string {
  return GRADE_PT[grade] ?? grade;
}

// ── Mapping ─────────────────────────────────────────────────────────────────

export function actionText(a: Action | null, db: GameDB | null, locale = "en-US"): string {
  if (!a) return "Tudo otimizado por agora 👌";

  switch (a.k) {
    case "rune_almostfree": {
      const n = num(a, "n");
      return `${n} ${plural(n, "runa", "runas")} quase de graça`;
    }
    case "farm_switch":
      return `Troque pro stage ${str(a, "to")}`;
    case "farm_push":
      return `Tente o stage ${str(a, "to")} (lv ${str(a, "lvl")})`;
    case "rune_dps_path":
      return `Caminho de DPS: ${runeName(a.target, db, locale)} (~${fmt(num(a, "cost"))} gold)`;
    case "party_tank":
      return `Bote ${heroName(str(a, "hero"), db, locale)} de frente`;
    case "gear_swap": {
      const n = num(a, "n");
      return `${n} ${plural(n, "troca", "trocas")} de equip valem POWER`;
    }
    case "gear_enchant": {
      const n = num(a, "n");
      return `${n} ${plural(n, "slot", "slots")} de encante aberto${plural(n, "", "s")}`;
    }
    case "gear_jewelry": {
      const n = num(a, "n");
      return `${n} ${plural(n, "joia", "joias")} faltando`;
    }
    case "synthesis": {
      const n = num(a, "n");
      return `Fundir ${n}× ${gradeLabel(str(a, "grade"))}`;
    }
    case "pet_swap":
      return "Troque o pet ativo";
    case "fire_protection": {
      const hero = str(a, "hero");
      return hero
        ? `Resistência a fogo baixa — reforce ${heroName(hero, db, locale)}`
        : "Resistência a fogo baixa";
    }
    default:
      return "Otimização disponível";
  }
}
