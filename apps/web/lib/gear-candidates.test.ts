import { describe, it, expect } from "vitest";
import { getDemoSaveText, loadGameDB } from "@tbh/game-data";
import { parseSave, heroSaveMap, itemSaveMap, party, slotGearType } from "@tbh/engine";
import type { GameDB, PlayerSaveData } from "@tbh/engine";
import { scoreOwnedCandidates } from "./gear-candidates";

async function demoSetup(): Promise<{ db: GameDB; psd: PlayerSaveData }> {
  const db = await loadGameDB();
  const psd = parseSave(getDemoSaveText());
  return { db, psd };
}

describe("scoreOwnedCandidates", () => {
  it("returns an array for a valid slot", async () => {
    const { db, psd } = await demoSetup();
    const hsm = heroSaveMap(psd);
    const firstHk = party(psd)[0];
    expect(firstHk).toBeDefined();
    const heroSave = hsm[firstHk!];
    expect(heroSave).toBeDefined();

    const result = scoreOwnedCandidates(db, psd, heroSave, 2, "HELMET");
    expect(Array.isArray(result)).toBe(true);
  });

  it("each candidate has a valid delta shape", async () => {
    const { db, psd } = await demoSetup();
    const hsm = heroSaveMap(psd);
    const firstHk = party(psd)[0]!;
    const heroSave = hsm[firstHk];

    const result = scoreOwnedCandidates(db, psd, heroSave, 2, "HELMET");
    for (const c of result) {
      expect(typeof c.itemKey).toBe("number");
      expect(typeof c.delta.dPower).toBe("number");
      expect(typeof c.delta.dDps).toBe("number");
      expect(typeof c.delta.dEhp).toBe("number");
      expect(c.delta.base).toBeDefined();
      expect(c.delta.next).toBeDefined();
    }
  });

  it("results are sorted descending by dPower", async () => {
    const { db, psd } = await demoSetup();
    const hsm = heroSaveMap(psd);
    const firstHk = party(psd)[0]!;
    const heroSave = hsm[firstHk];

    const result = scoreOwnedCandidates(db, psd, heroSave, 2, "HELMET");
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1]!.delta.dPower).toBeGreaterThanOrEqual(result[i]!.delta.dPower);
    }
  });

  it("results only include items with matching gearType", async () => {
    const { db, psd } = await demoSetup();
    const hsm = heroSaveMap(psd);
    const firstHk = party(psd)[0]!;
    const heroSave = hsm[firstHk];

    const result = scoreOwnedCandidates(db, psd, heroSave, 2, "HELMET");
    for (const c of result) {
      const idb = db.items[c.itemKey];
      expect(idb?.gt).toBe("HELMET");
    }
  });

  it("slot 0 (arma): cada candidato tem o gearType de arma principal do herói", async () => {
    const { db, psd } = await demoSetup();
    const hsm = heroSaveMap(psd);
    const firstHk = party(psd)[0]!;
    const heroSave = hsm[firstHk];

    const weaponGt = slotGearType(db, firstHk, 0);
    // Se o herói não tiver mainW definido no DB, o test não se aplica
    if (!weaponGt) return;

    const result = scoreOwnedCandidates(db, psd, heroSave, 0, weaponGt);
    // Se o demo não tiver nenhum item do tipo, esperamos array vazio — ainda é um guard válido
    expect(Array.isArray(result)).toBe(true);
    for (const c of result) {
      expect(db.items[c.itemKey]?.gt).toBe(weaponGt);
    }
  });

  it("slot 6 (AMULET/joia): cada candidato tem gearType 'AMULET'", async () => {
    const { db, psd } = await demoSetup();
    const hsm = heroSaveMap(psd);
    const firstHk = party(psd)[0]!;
    const heroSave = hsm[firstHk];

    const result = scoreOwnedCandidates(db, psd, heroSave, 6, "AMULET");
    // Se o demo não tiver amuletos em posse, resultado é [] — ainda válido
    expect(Array.isArray(result)).toBe(true);
    for (const c of result) {
      expect(db.items[c.itemKey]?.gt).toBe("AMULET");
    }
  });

  it("the currently equipped item is included when present", async () => {
    const { db, psd } = await demoSetup();
    const hsm = heroSaveMap(psd);
    const ism = itemSaveMap(psd);
    const firstHk = party(psd)[0]!;
    const heroSave = hsm[firstHk];

    // Find a slot that has an equipped item
    const equippedUids = heroSave.equippedItemIds ?? [];
    let found = false;
    for (let slot = 0; slot < 10; slot++) {
      const uid = equippedUids[slot];
      if (!uid) continue;
      const it = ism[uid];
      if (!it) continue;
      const idb = db.items[it.ItemKey];
      if (!idb?.gt) continue;

      const result = scoreOwnedCandidates(db, psd, heroSave, slot, idb.gt);
      const equippedCandidate = result.find((c) => c.uniqueId === uid);
      expect(equippedCandidate).toBeDefined();
      found = true;
      break;
    }
    // Skip if hero has no equipped items (edge case, unlikely in demo)
    if (!found) return;
  });

  it("returns empty for a gearType the hero has no items for", async () => {
    const { db, psd } = await demoSetup();
    const hsm = heroSaveMap(psd);
    const firstHk = party(psd)[0]!;
    const heroSave = hsm[firstHk];

    // "FAKE_TYPE" doesn't exist in the DB so no items can match
    const result = scoreOwnedCandidates(db, psd, heroSave, 0, "FAKE_TYPE");
    expect(result).toHaveLength(0);
  });
});
