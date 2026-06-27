// Drop finder — port fiel de engine.js (~652-691).
// Stages drop the monster box of their 5-level band; db.boxDrops holds each band's
// weighted item-group table and db.dropGroups the gear items per group. An item's
// chance = its groups' weight share of the box, split across each group's items.
import type { GameDB, PlayerSaveData } from "./types";
import { stageUnlocked } from "./farm";

const dropBandKeys = (db: GameDB): number[] =>
  Object.keys(db.boxDrops ?? {})
    .map(Number)
    .sort((a, b) => a - b);

export function bandOfLevel(db: GameDB, lvl: number): number | null {
  let b: number | null = null;
  for (const x of dropBandKeys(db)) if (x <= lvl) b = x;
  return b;
}

export function dropBands(db: GameDB, itemKey: number | string): { band: number; chance: number }[] {
  const k = Number(itemKey),
    out: { band: number; chance: number }[] = [];
  for (const band in db.boxDrops ?? {}) {
    const rows = db.boxDrops[band];
    if (!rows) continue;
    let total = 0,
      mine = 0;
    for (const [g, w] of rows) {
      total += w;
      const its = db.dropGroups[g] || [];
      if (its.indexOf(k) >= 0) mine += w / its.length;
    }
    if (mine > 0 && total > 0) out.push({ band: +band, chance: mine / total });
  }
  return out.sort((a, b) => a.band - b.band);
}

export function dropStages(db: GameDB, itemKey: number | string, psd?: PlayerSaveData) {
  const bands: Record<number, number> = {};
  for (const b of dropBands(db, itemKey)) bands[b.band] = b.chance;
  const maxC = psd ? psd.commonSaveData.maxCompletedStage : null;
  const out = [];
  for (const [key, s] of Object.entries(db.stages)) {
    const b = bandOfLevel(db, s.lvl);
    if (b != null && bands[b] != null) {
      out.push({
        key: Number(key),
        lvl: s.lvl,
        label: s.label,
        diff: s.diff,
        chance: bands[b],
        unlocked: psd ? stageUnlocked(db, key, maxC) : true,
      });
    }
  }
  return out.sort((a, b) => a.lvl - b.lvl);
}

// rank the player's reachable stages by how much of the wishlist drops there
export function favFarm(db: GameDB, psd: PlayerSaveData, favKeys?: (number | string)[]) {
  const infos = (favKeys ?? []).map((k) => {
    const m: Record<number, number> = {};
    for (const b of dropBands(db, k)) m[b.band] = b.chance;
    return { key: Number(k), bands: m };
  });
  const maxC = psd.commonSaveData.maxCompletedStage,
    rows = [];
  for (const [key, s] of Object.entries(db.stages)) {
    if (!stageUnlocked(db, key, maxC)) continue;
    const b = bandOfLevel(db, s.lvl);
    if (b == null) continue;
    const favs = infos.filter((f) => f.bands[b]).map((f) => ({ key: f.key, chance: f.bands[b]! }));
    if (favs.length) rows.push({ key: Number(key), lvl: s.lvl, favs, score: favs.reduce((a, f) => a + f.chance, 0) });
  }
  rows.sort((a, b) => b.score - a.score || b.lvl - a.lvl);
  return rows;
}
