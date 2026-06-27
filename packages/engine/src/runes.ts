// Runes — port fiel de engine.js (~372-476, 793-803).
// `runeParent` era construído no module-load a partir de DB; aqui vira função
// `runeParent(db)` memoizada por-db (WeakMap), comportamento idêntico.
import type { GameDB, PlayerSaveData } from "./types";
import {
  PARAMS,
  RUNE_MAP,
  gold,
  runeContrib,
  heroSaveMap,
  party,
  refStageLevel,
  refDamage,
  heroStats,
  effPower,
  aggregate,
  deliveryOf,
  type Contrib,
} from "./stats";

const runeParentCache = new WeakMap<GameDB, Record<string, number>>();
/** Mapa filho->pai da árvore de runes ({ [to]: from }). Builder memoizado por-db. */
export function runeParent(db: GameDB): Record<string, number> {
  const cached = runeParentCache.get(db);
  if (cached) return cached;
  const p: Record<string, number> = {};
  for (const [from, to] of db.runeTree.edges) p[to] = from;
  runeParentCache.set(db, p);
  return p;
}

export function runeReq(db: GameDB, key: number | string): number {
  const r = db.runes[key];
  return r && r.prevReq != null ? r.prevReq : 1;
}

export function ownedRuneLevels(psd: PlayerSaveData): Record<string, number> {
  const m: Record<string, number> = {};
  for (const r of psd.RuneSaveData ?? []) m[r.RuneKey] = r.Level || 0;
  return m;
}

export function runeUnlocked(db: GameDB, key: number | string, owned: Record<string, number>): boolean {
  const parent = runeParent(db);
  if ((db.runeTree.starts ?? []).includes(Number(key)) || parent[key] == null) return true;
  const par = parent[key]!;
  return (owned[par] || 0) >= runeReq(db, key);
}

function cloneContrib(base: Contrib): Contrib {
  const c: Contrib = {};
  for (const [st, mods] of Object.entries(base)) {
    const byMt: Record<string, number[]> = {};
    for (const [mt, arr] of Object.entries(mods)) byMt[mt] = arr.slice();
    c[st] = byMt;
  }
  return c;
}

export function runePartyPowerDelta(
  db: GameDB,
  psd: PlayerSaveData,
  statType: string,
  value: number,
  stageLevel?: number,
): number {
  const rm = RUNE_MAP[statType];
  if (!rm || !value) return 0;
  const sl = stageLevel || refStageLevel(db, psd);
  const [stat, mt] = rm;
  const rstats = runeContrib(db, psd),
    hsm = heroSaveMap(psd);
  let d = 0;
  for (const hk of party(psd)) {
    const hs = hsm[hk];
    if (!hs) continue;
    const base = heroStats(db, hs, psd, rstats, sl);
    const c = cloneContrib(base.contrib);
    const byMt = (c[stat] ??= {});
    (byMt[mt] ??= []).push(value);
    d += effPower(db, hs, psd, aggregate(c), sl, refDamage(db, psd), deliveryOf(db, hk)) - base.power;
  }
  return d;
}

export function runePlan(db: GameDB, psd: PlayerSaveData, goldPerSec?: number, stageLevel?: number) {
  const sl = stageLevel || refStageLevel(db, psd);
  const owned = ownedRuneLevels(psd),
    have = gold(psd);
  const gps = goldPerSec ?? 0;
  const afThreshold = have * PARAMS.ALMOST_FREE_FRACTION;
  const parent = runeParent(db);
  const cands = [];
  for (const [key, rd] of Object.entries(db.runes)) {
    const lv = owned[key] || 0;
    if (lv >= rd.max) continue;
    const isNew = lv === 0;
    if (isNew && !runeUnlocked(db, key, owned)) continue;
    const rl = db.runeLevels[rd.ldk];
    const row = rl && rl[lv + 1];
    if (!row) continue;
    const isCombat = !!RUNE_MAP[row.st];
    const dPower = isCombat ? runePartyPowerDelta(db, psd, row.st, row.v, sl) : 0;
    cands.push({
      key: Number(key),
      name: rd.name,
      level: lv,
      nextLevel: lv + 1,
      max: rd.max,
      cost: row.cost,
      st: row.st,
      value: row.v,
      isNew,
      isCombat,
      dPower,
      affordable: row.cost <= have,
      almostFree: row.cost <= afThreshold,
      farmSeconds: gps && gps > 0 ? row.cost / gps : null,
      valuePerGold: isCombat && dPower > 0 ? dPower / row.cost : null,
    });
  }
  const almostFree = cands.filter((c) => c.almostFree).sort((a, b) => a.cost - b.cost);
  const combat = cands.filter((c) => c.isCombat).sort((a, b) => (b.valuePerGold || 0) - (a.valuePerGold || 0) || a.cost - b.cost);
  const pathTo = (target: number | string) => {
    const steps = [];
    let cur: number | undefined = Number(target);
    const chain: number[] = [];
    while (cur != null) {
      chain.unshift(cur);
      cur = parent[cur];
    }
    let total = 0;
    for (let i = 0; i < chain.length; i++) {
      const k = chain[i]!,
        rd = db.runes[k]!,
        rl = db.runeLevels[rd.ldk]!;
      const haveLv = owned[k] || 0;
      const needLv = i === chain.length - 1 ? Math.max(haveLv, 1) : Math.max(haveLv, runeReq(db, chain[i + 1]!));
      for (let L = haveLv + 1; L <= needLv; L++) {
        const row = rl[L];
        if (row) {
          total += row.cost;
          steps.push({ key: k, level: L, cost: row.cost, st: row.st, value: row.v, name: rd.name });
        }
      }
    }
    return { target: Number(target), totalCost: total, steps };
  };

  let firstDpsPath: ReturnType<typeof pathTo> | null = null;
  for (const [key, rd] of Object.entries(db.runes)) {
    const rl = db.runeLevels[rd.ldk];
    const row1 = rl && rl["1"];
    if (!row1 || row1.st !== "AllHeroAttackDamagePercent") continue;
    if ((owned[key] || 0) >= 1) continue;
    const p = pathTo(Number(key));
    if (p.totalCost > 0 && (!firstDpsPath || p.totalCost < firstDpsPath.totalCost)) firstDpsPath = p;
  }
  return { almostFree, combat, all: cands, afThreshold, gold: have, goldPerSec: gps || null, firstDpsPath, pathTo };
}

interface RuneTreeNode {
  x: number;
  y: number;
  cat: string;
  level: number;
  status: string;
  max: number;
  name?: string;
  cost?: number | null;
  st?: string | null;
  value?: number | null;
  dPower?: number;
  affordable?: boolean;
  onDpsPath?: boolean;
  important?: boolean;
  farmSeconds?: number | null;
}

export function runeTreeStatus(db: GameDB, psd: PlayerSaveData, goldPerSec?: number, stageLevel?: number) {
  const sl = stageLevel || refStageLevel(db, psd);
  const owned = ownedRuneLevels(psd),
    have = gold(psd);
  const gps = goldPerSec ?? 0;
  const af = have * PARAMS.ALMOST_FREE_FRACTION;
  const plan = runePlan(db, psd, goldPerSec, sl);
  const dpsPath = new Set(plan.firstDpsPath ? plan.firstDpsPath.steps.map((s) => s.key) : []);
  const nodes: Record<string, RuneTreeNode> = {};
  for (const [key, pos] of Object.entries(db.runeNodes)) {
    const rd = db.runes[key];
    const base = { x: pos.x, y: pos.y, cat: pos.cat, level: owned[key] || 0 };
    if (!rd) {
      nodes[key] = { ...base, status: "available", max: 1 };
      continue;
    }
    const lv = owned[key] || 0,
      maxL = rd.max,
      rl = db.runeLevels[rd.ldk];
    const nextRow = lv < maxL && rl ? rl[lv + 1] ?? null : null;
    const row1 = rl ? rl["1"] ?? null : null;
    const unlockable = lv > 0 || runeUnlocked(db, key, owned);
    const isCombat = !!nextRow && !!RUNE_MAP[nextRow.st];
    const dPower = isCombat && nextRow ? runePartyPowerDelta(db, psd, nextRow.st, nextRow.v, sl) : 0;
    let status: string;
    if (maxL > 0 && lv >= maxL) status = "maxed";
    else if (lv > 0) status = "owned";
    else if (!unlockable) status = "locked";
    else if (nextRow && nextRow.cost >= PARAMS.SKIP_COST && nextRow.cost > have) status = "skip";
    else if (dpsPath.has(Number(key)) || (isCombat && dPower > 0)) status = "recommended";
    else if (nextRow && nextRow.cost <= af) status = "almostfree";
    else status = "available";
    nodes[key] = {
      ...base,
      status,
      max: maxL,
      name: rd.name,
      cost: nextRow ? nextRow.cost : null,
      st: nextRow ? nextRow.st : row1 ? row1.st : null,
      value: nextRow ? nextRow.v : null,
      dPower,
      affordable: nextRow ? nextRow.cost <= have : false,
      onDpsPath: dpsPath.has(Number(key)),
      important: !!(isCombat && nextRow && /AttackDamage|AttackSpeed/.test(nextRow.st || "")),
      farmSeconds: nextRow && gps > 0 ? nextRow.cost / gps : null,
    };
  }
  return { nodes, bounds: db.runeBounds, edges: db.runeTree.edges, firstDpsPath: plan.firstDpsPath };
}

export function runeROI(db: GameDB, psd: PlayerSaveData, goldPerSec?: number, stageLevel?: number) {
  const plan = runePlan(db, psd, goldPerSec, stageLevel);
  return plan.combat
    .filter((c) => c.dPower > 0)
    .map((c) => ({
      key: c.key,
      name: c.name,
      st: c.st,
      value: c.value,
      cost: c.cost,
      dPower: c.dPower,
      perGold: c.dPower / c.cost,
      affordable: c.affordable,
    }))
    .sort((a, b) => b.perGold - a.perGold);
}

export type RunePlan = ReturnType<typeof runePlan>;
export type RuneTreeStatus = ReturnType<typeof runeTreeStatus>;
export type RuneROIList = ReturnType<typeof runeROI>;
export type GoldPlan = ReturnType<typeof goldPlan>;

export function goldPlan(db: GameDB, psd: PlayerSaveData, goldPerSec?: number, stageLevel?: number) {
  const have = gold(psd),
    roi = runeROI(db, psd, goldPerSec, stageLevel);
  const cart = [];
  let spent = 0;
  for (const r of roi) {
    if (spent + r.cost <= have) {
      cart.push(r);
      spent += r.cost;
    }
  }
  return { gold: have, cart, totalCost: spent, totalPower: cart.reduce((a, c) => a + c.dPower, 0) };
}
