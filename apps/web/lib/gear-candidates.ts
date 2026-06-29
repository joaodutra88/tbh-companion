// Pure helper: enumerate and score owned gear candidates for a specific slot.
// Mirrors item-fits-slot logic from gearAdvisor (packages/engine/src/gear.ts:51-75).
import type { GameDB, PlayerSaveData, HeroSave, PowerDelta } from "@tbh/engine";
import {
  heroSaveMap,
  itemSaveMap,
  powerDelta,
  runeContrib,
  refStageLevel,
  party,
} from "@tbh/engine";

export interface CandidateResult {
  /** ItemKey (the item type). Multiple owned instances can share the same ItemKey. */
  itemKey: number;
  /** UniqueId of this specific instance in the player's inventory. */
  uniqueId: number | string;
  /** Full powerDelta result for swapping this candidate into the slot. */
  delta: PowerDelta;
}

/**
 * Returns all player-owned items that fit `slotGearType`, scored by powerDelta,
 * sorted descending by dPower.
 *
 * Mirrors the candidate enumeration logic in gearAdvisor (gear.ts:51-75):
 * - Item's db.items[itemKey].gt must equal slotGearType
 * - Items equipped on any party member are excluded
 *   (exception: the item currently in this specific slot is always included)
 */
export function scoreOwnedCandidates(
  db: GameDB,
  psd: PlayerSaveData,
  heroSave: HeroSave,
  slot: number,
  slotGearType: string,
): CandidateResult[] {
  const ism = itemSaveMap(psd);
  const hsm = heroSaveMap(psd);
  const rstats = runeContrib(db, psd);
  const sl = refStageLevel(db, psd);

  // UID of the item currently equipped in this slot (may be 0/falsy if empty).
  const curUid = (heroSave.equippedItemIds ?? [])[slot] || 0;

  // Collect all UIDs equipped by party members (mirrors gear.ts:51-52).
  const equippedUids = new Set<number | string>();
  for (const hk of party(psd)) {
    const hs = hsm[hk];
    for (const uid of hs?.equippedItemIds ?? []) {
      if (uid) equippedUids.add(uid);
    }
  }

  const results: CandidateResult[] = [];
  for (const it of psd.itemSaveDatas ?? []) {
    const idb = db.items[it.ItemKey];
    // Gear type must match the slot (mirrors gear.ts:65-66).
    if (!idb || idb.gt !== slotGearType) continue;
    // Skip items equipped elsewhere, but not the item currently in this slot (gear.ts:67).
    if (it.UniqueId !== curUid && equippedUids.has(it.UniqueId)) continue;

    const delta = powerDelta(db, heroSave, psd, slot, it.ItemKey, rstats, sl);
    results.push({ itemKey: it.ItemKey, uniqueId: it.UniqueId, delta });
  }

  // Sort descending by dPower (best upgrade first).
  return results.sort((a, b) => b.delta.dPower - a.delta.dPower);
}
