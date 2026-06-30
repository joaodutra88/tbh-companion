// Regressões do comparador de Gear (bug reportado pelo João 2026-06-30):
//   (1) MULTIPLICATIVE escalava por /100 em vez de /1000 → 10× forte demais.
//       In-game `AttackSpeed MULTIPLICATIVE 171` = +17,1% (×1,171), não +171% (×2,71).
//   (2) powerDelta vazava os EnchantData do gear antigo no estado `next` da simulação
//       de troca → inflava o DPS do candidato.
import { describe, it, expect, beforeAll } from "vitest";
import { loadGameDB } from "@tbh/game-data";
import { aggregate, powerDelta } from "../src/index";
import type { GameDB, HeroSave, PlayerSaveData } from "../src/types";

describe("aggregate — escala de MULTIPLICATIVE", () => {
  it("MULTIPLICATIVE usa /1000 (PERCENT_DIVISOR), não /100", () => {
    // 100 flat de AttackSpeed + 1 linha MULTIPLICATIVE 171.
    // Jogo: +17,1% → ×1,171 → 100 × 1,171 = 117,1 (não 271).
    const out = aggregate({ AttackSpeed: { FLAT: [100], MULTIPLICATIVE: [171] } });
    expect(out.AttackSpeed).toBeCloseTo(117.1, 1);
  });

  it("MULTIPLICATIVE compõe (duas linhas multiplicam, não somam)", () => {
    // ×1,171 × ×1,05 (50/1000) = ×1,22955 → 100 × 1,22955 = 122,955
    const out = aggregate({ AttackSpeed: { FLAT: [100], MULTIPLICATIVE: [171, 50] } });
    expect(out.AttackSpeed).toBeCloseTo(122.955, 2);
  });
});

describe("powerDelta — sem vazamento de enchant do gear antigo", () => {
  let db: GameDB;
  beforeAll(async () => {
    db = await loadGameDB();
  });

  it("o DPS do candidato (next) não muda quando o gear equipado tem enchant", () => {
    // statMod real que afeta AttackDamage (driver de DPS).
    const found = Object.entries(db.statMods).find(([, sm]) => sm.st === "AttackDamage");
    expect(found, "esperado ao menos um statMod de AttackDamage no DB").toBeDefined();
    const [smKey, smTier] = found![0].split(":").map(Number);

    const OLD_UID = 1;
    const OLD_KEY = 315171; // Shadow Bow Arcana
    const NEW_KEY = 313171; // Shadow Bow Lendário
    const heroSave: HeroSave = { heroKey: 201, equippedItemIds: [OLD_UID] };

    const makePsd = (enchant: boolean): PlayerSaveData => ({
      commonSaveData: { currentStageKey: 1 },
      heroSaveDatas: [heroSave],
      itemSaveDatas: [
        {
          UniqueId: OLD_UID,
          ItemKey: OLD_KEY,
          EnchantData: enchant ? [{ StatModKey: smKey, Tier: smTier, Value: 100000 }] : [],
        },
      ],
      RuneSaveData: [],
      attributeSaveDatas: [],
    });

    const withEnchant = powerDelta(db, heroSave, makePsd(true), 0, NEW_KEY);
    const without = powerDelta(db, heroSave, makePsd(false), 0, NEW_KEY);

    // O gear antigo (e seu enchant) é REMOVIDO na simulação da troca, então o
    // estado `next` (= candidato NEW_KEY) deve ser idêntico com ou sem o enchant.
    expect(withEnchant.next.dps).toBeCloseTo(without.next.dps, 5);
  });
});
