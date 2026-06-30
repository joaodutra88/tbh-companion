// Finding B (achado 2026-06-30): dmgMult escalava o dano elemental (*DamagePercent)
// por /100, mas a convenção do jogo é /1000 (confirmada in-game: AS MULTIPLICATIVE 171 =
// "17% More Attack Speed", e crit/CDR/AS todos /1000). Uma PhysicalDamagePercent 150
// (de passiva/enchant) = +15% (×1,15), não +150% (×2,5).
import { describe, it, expect } from "vitest";
import { dmgMult } from "../src/index";

describe("dmgMult — escala do dano elemental (/1000)", () => {
  it("PhysicalDamagePercent 150 = +15% (×1,15), não +150%", () => {
    const m = dmgMult({ PhysicalDamagePercent: 150 }, "Melee", "Physical");
    expect(m).toBeCloseTo(1.15, 3);
  });

  it("FireDamagePercent 100 = +10% (×1,10)", () => {
    const m = dmgMult({ FireDamagePercent: 100 }, "AOE", "Fire");
    expect(m).toBeCloseTo(1.1, 3);
  });
});
