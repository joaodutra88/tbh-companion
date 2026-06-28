// Chest auto-open timers + planner — port fiel de engine.js (~693-750).
// The game auto-opens one chest of each type every N seconds. The Unlock rune's
// value IS that base cooldown and is 0 when not unlocked; the Reduce runes shave
// seconds off it. Capacity = stockpile before the backpack overflows.
import type { GameDB, PlayerSaveData } from "./types";
import { runeContrib } from "./stats";
import { favFarm } from "./drops";
import type { FarmResult, FarmRow } from "./farm";

const CHEST_BASE: Record<"normal" | "boss" | "act", number> = { normal: 300, boss: 600, act: 60 };

export function chestInfo(db: GameDB, psd: PlayerSaveData) {
  const rc = runeContrib(db, psd);
  const one = (kind: "normal" | "boss" | "act", unlockKey: string, reduceKey: string, capKey: string) => {
    const unlockVal = rc[unlockKey] || 0,
      unlocked = unlockVal > 0;
    const base = unlockVal || CHEST_BASE[kind],
      reduce = rc[reduceKey] || 0;
    return { kind, unlocked, base, reduce, cooldown: Math.max(1, base - reduce), capacity: rc[capKey] || 0 };
  };
  return {
    normal: one("normal", "UnlockAutoOpenNormalChest", "ReduceAutoOpenNormalChestTime", "MaxAmountNormalChest"),
    boss: one("boss", "UnlockAutoOpenStageBossChest", "ReduceAutoOpenStageBossChestTime", "MaxAmountStageBossChest"),
    act: one("act", "UnlockAutoOpenActBossChest", "ReduceAutoOpenActBossChestTime", "MaxAmountActBossChest"),
  };
}

// A save-driven chest planner. The FIELD-DROP cooldown — chests are server-limited to
// ~1 every 5 min, a single limit SHARED across all chest types — is global, NOT per-stage.
const CHEST_DROP_COOLDOWN = 300;

interface ChestBest {
  key: number | string;
  lvl: number;
  label: string | null | undefined;
  clearTime: number | null | undefined;
  favCount?: number;
  clearsPerWindow?: number;
}

export interface ChestPlanOpts {
  favKeys?: (number | string)[];
  farm?: FarmResult | null;
}

export function chestPlan(db: GameDB, psd: PlayerSaveData, opts?: ChestPlanOpts) {
  const o = opts ?? {};
  const ci = chestInfo(db, psd),
    drop = CHEST_DROP_COOLDOWN;
  const types = (["normal", "boss", "act"] as const).map((k) => {
    const c = ci[k];
    const slowOpen = c.unlocked && c.cooldown > drop;
    const fillSec = !c.unlocked && c.capacity > 0 ? c.capacity * drop : null;
    return { kind: k, unlocked: c.unlocked, cooldown: c.cooldown, base: c.base, reduce: c.reduce, capacity: c.capacity, slowOpen, fillSec };
  });
  let best: ChestBest | null = null,
    source: "wishlist" | "recommend" | null = null;
  const favKeys = (o.favKeys ?? []).map(Number).filter(Boolean);
  const farm = o.farm || null;
  const byKey: Record<string, FarmRow> = {};
  if (farm && farm.all) for (const r of farm.all) byKey[String(r.key)] = r;
  if (favKeys.length) {
    const ff = favFarm(db, psd, favKeys);
    const top = ff[0];
    if (top) {
      const row = byKey[String(top.key)],
        st = db.stages[String(top.key)];
      best = {
        key: top.key,
        lvl: top.lvl,
        label: (row && row.label) || st?.label || null,
        clearTime: row ? row.clearTime : null,
        favCount: top.favs.length,
      };
      source = "wishlist";
    }
  }
  if (!best && farm) {
    const r = farm.recommend || farm.current || farm.frontier;
    if (r) {
      best = { key: r.key, lvl: r.lvl, label: r.label, clearTime: r.clearTime };
      source = "recommend";
    }
  }
  if (best && best.clearTime != null && best.clearTime > 0) best.clearsPerWindow = drop / best.clearTime;
  return { dropCooldown: drop, types, best, source };
}

export type ChestPlan = ReturnType<typeof chestPlan>;
