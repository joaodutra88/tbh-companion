// Inventory / stash browser + alchemy + synthesis — port fiel de engine.js
// (~638-643 alchemyValue, 752-791 inventory/storageGrid, 821-828 synthesisPlan).
import type { GameDB, PlayerSaveData, StorageSlot } from "./types";

const GRADE_ORDER: Record<string, number> = {
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  LEGENDARY: 3,
  IMMORTAL: 4,
  ARCANA: 5,
  BEYOND: 6,
  CELESTIAL: 7,
  DIVINE: 8,
  COSMIC: 9,
};

export function inventory(db: GameDB, psd: PlayerSaveData) {
  const loc: Record<string, string> = {},
    slotOf: Record<string, number> = {},
    heroOf: Record<string, number> = {};
  for (const h of psd.heroSaveDatas ?? []) {
    const eq = h.equippedItemIds ?? [];
    for (let s = 0; s < eq.length; s++) {
      const u = eq[s];
      if (u && u !== "0") {
        loc[String(u)] = "equipped";
        slotOf[String(u)] = s;
        heroOf[String(u)] = h.heroKey;
      }
    }
  }
  const mark = (rows: StorageSlot[] | undefined, name: string): void => {
    for (const r of rows ?? []) {
      const u = r.ItemUniqueId;
      if (u && u !== "0" && u !== 0 && !loc[String(u)]) {
        loc[String(u)] = name;
        slotOf[String(u)] = r.Index;
      }
    }
  };
  mark(psd.stashSaveDatas, "stash");
  mark(psd.inventorySaveDatas, "inventory");
  mark(psd.tradingStashSaveDatas, "trading");
  const items = [];
  for (const it of psd.itemSaveDatas ?? []) {
    const idb = db.items[String(it.ItemKey)];
    const u = String(it.UniqueId);
    const enchants = Array.isArray(it.EnchantCount) ? it.EnchantCount.reduce((a, b) => a + (b || 0), 0) : 0;
    const gRank = idb?.grade != null ? GRADE_ORDER[idb.grade] : undefined;
    items.push({
      uid: u,
      key: it.ItemKey,
      name: idb?.name || null,
      grade: idb?.grade || null,
      gradeRank: gRank != null ? gRank : -1,
      level: idb?.lvl != null ? idb.lvl : null,
      type: idb?.type || null,
      gt: idb?.gt || null,
      icon: idb?.icon || null,
      loc: loc[u] || "loose",
      slot: slotOf[u] != null ? slotOf[u] : null,
      hero: heroOf[u] != null ? heroOf[u] : null,
      enchants,
      blocked: !!it.IsBlocked,
      chaotic: !!it.IsChaotic,
    });
  }
  return items;
}

// the raw slot grid of a storage container (stash / backpack / trading), in Index order.
const STORAGE_KEY = {
  stash: "stashSaveDatas",
  inventory: "inventorySaveDatas",
  trading: "tradingStashSaveDatas",
} as const;

export function storageGrid(psd: PlayerSaveData, which: keyof typeof STORAGE_KEY) {
  const rows = psd[STORAGE_KEY[which]] ?? [];
  return rows
    .slice()
    .sort((a, b) => a.Index - b.Index)
    .map((s) => {
      const u = s.ItemUniqueId,
        has = u && u !== "0" && u !== 0;
      return { slot: s.Index, locked: !(s.IsUnLock || s.IsUnlock), uid: has ? String(u) : null };
    });
}

export function alchemyValue(db: GameDB, psd: PlayerSaveData) {
  const equipped = new Set<number | string>();
  for (const h of psd.heroSaveDatas ?? []) for (const u of h.equippedItemIds ?? []) if (u) equipped.add(u);
  let sellGold = 0,
    cubeExp = 0,
    count = 0;
  for (const it of psd.itemSaveDatas ?? []) {
    if (equipped.has(it.UniqueId)) continue;
    const g = db.itemSell[String(it.ItemKey)];
    if (g != null) {
      sellGold += g;
      count++;
    }
    cubeExp += db.itemCubeExp[String(it.ItemKey)] || 0;
  }
  return { looseItems: count, sellGold, cubeExp };
}

export function synthesisPlan(db: GameDB, psd: PlayerSaveData) {
  const equipped = new Set<number | string>();
  for (const h of psd.heroSaveDatas ?? []) for (const u of h.equippedItemIds ?? []) if (u) equipped.add(u);
  const byGrade: Record<string, number> = {};
  for (const it of psd.itemSaveDatas ?? []) {
    if (equipped.has(it.UniqueId)) continue;
    const idb = db.items[it.ItemKey];
    if (!idb || !idb.gt) continue;
    const gradeKey = String(idb.grade);
    byGrade[gradeKey] = (byGrade[gradeKey] || 0) + 1;
  }
  const out = [];
  for (const [grade, n] of Object.entries(byGrade)) {
    const r = db.synthesis[grade];
    if (r && n >= r.amount) {
      out.push({ grade, have: n, need: r.amount, fuses: Math.floor(n / r.amount), nextGrade: db.grades[db.grades.indexOf(grade) + 1] });
    }
  }
  return out;
}

export type Inventory = ReturnType<typeof inventory>;
export type StorageGrid = ReturnType<typeof storageGrid>;
export type AlchemyValue = ReturnType<typeof alchemyValue>;
export type SynthesisPlan = ReturnType<typeof synthesisPlan>;
