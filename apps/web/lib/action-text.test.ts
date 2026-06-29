import { describe, it, expect } from "vitest";
import type { Action, GameDB } from "@tbh/engine";
import { actionText } from "./action-text";

const db = {
  heroes: {
    "201": { cls: "Ranger", name: { "pt-BR": "Explorador" } },
    "401": { cls: "Priest", name: { "pt-BR": "Sacerdote" } },
  },
  runes: {
    "413": { name: { "pt-BR": "Runa de Guerra", "en-US": "Rune of War" } },
  },
} as unknown as GameDB;

describe("actionText", () => {
  it("rune_almostfree (with pluralization)", () => {
    expect(actionText({ k: "rune_almostfree", n: 1 }, db)).toBe("1 runa quase de graça");
    expect(actionText({ k: "rune_almostfree", n: 3 }, db)).toBe("3 runas quase de graça");
  });

  it("farm_switch includes target stage", () => {
    const t = actionText({ k: "farm_switch", from: "1300", to: "1301" }, db);
    expect(t).toContain("1301");
    expect(t).toBe("Troque pro stage 1301");
  });

  it("farm_push includes stage and level", () => {
    const t = actionText({ k: "farm_push", to: "1306", lvl: 28 }, db);
    expect(t).toContain("1306");
    expect(t).toContain("28");
  });

  it("rune_dps_path resolves rune name (en-US default) and formats cost", () => {
    const t = actionText({ k: "rune_dps_path", target: 413, cost: 530000 }, db);
    // en-US is the default locale — the stub has en-US → "Rune of War".
    expect(t).toContain("Rune of War");
    expect(t).toContain("530.000");
  });

  it("rune_dps_path resolves rune name in an explicit locale", () => {
    const t = actionText({ k: "rune_dps_path", target: 413, cost: 530000 }, db, "pt-BR");
    expect(t).toContain("Runa de Guerra");
    expect(t).toContain("530.000");
  });

  it("party_tank resolves hero name", () => {
    expect(actionText({ k: "party_tank", hero: 401 }, db)).toBe("Bote Sacerdote de frente");
  });

  it("gear_swap / gear_enchant / gear_jewelry include counts", () => {
    expect(actionText({ k: "gear_swap", n: 1 }, db)).toContain("1 troca");
    expect(actionText({ k: "gear_enchant", n: 54 }, db)).toContain("54");
    expect(actionText({ k: "gear_jewelry", n: 12 }, db)).toContain("12 joias");
  });

  it("synthesis translates grade and shows count", () => {
    expect(actionText({ k: "synthesis", grade: "COMMON", n: 1 }, db)).toBe("Fundir 1× Comum");
  });

  it("pet_swap", () => {
    expect(actionText({ k: "pet_swap", pet: 5 }, db)).toBe("Troque o pet ativo");
  });

  it("fire_protection names the hero", () => {
    const t = actionText({ k: "fire_protection", lvl: 28, res: 0, hero: 401 }, db);
    expect(t).toContain("Sacerdote");
    expect(t.toLowerCase()).toContain("fogo");
  });

  it("null coach → 'all optimized'", () => {
    expect(actionText(null, db)).toContain("otimizado");
  });

  it("unknown k → non-empty generic fallback", () => {
    const t = actionText({ k: "totally_unknown_action" } as Action, db);
    expect(t.length).toBeGreaterThan(0);
    expect(t).toBe("Otimização disponível");
  });
});
