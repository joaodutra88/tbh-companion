// Gear / AP / enchant advisors + gear progression — port fiel de engine.js
// (~478-580, 645-650 gearProgression).
import type { GameDB, PlayerSaveData } from "./types";
import {
  PARAMS,
  gearStatLines,
  heroSaveMap,
  itemSaveMap,
  runeContrib,
  party,
  refStageLevel,
  refDamage,
  heroStats,
  powerDelta,
  effPower,
  aggregate,
  deliveryOf,
  type Contrib,
  type PowerDelta,
} from "./stats";
import { partyComp } from "./party";

function cloneContrib(base: Contrib): Contrib {
  const c: Contrib = {};
  for (const [st, mods] of Object.entries(base)) {
    const byMt: Record<string, number[]> = {};
    for (const [mt, arr] of Object.entries(mods)) byMt[mt] = arr.slice();
    c[st] = byMt;
  }
  return c;
}

export function decodeItem(db: GameDB, itemKey: number | string) {
  const idb = db.items[itemKey];
  return { itemKey, gearType: idb?.gt, grade: idb?.grade, level: idb?.lvl, lines: gearStatLines(db, itemKey) };
}

export function slotGearType(db: GameDB, heroKey: number | string, slot: number): string | null | undefined {
  const h = db.heroes[heroKey];
  if (slot === 0) return h?.mainW;
  if (slot === 1) return h?.subW;
  return PARAMS.SLOT_TYPES[slot];
}

export function gearAdvisor(db: GameDB, psd: PlayerSaveData, stageLevel?: number) {
  const sl = stageLevel || refStageLevel(db, psd);
  const hsm = heroSaveMap(psd),
    ism = itemSaveMap(psd),
    rstats = runeContrib(db, psd);

  const equippedUids = new Set<number | string>();
  for (const hk of party(psd)) for (const u of hsm[hk]?.equippedItemIds ?? []) if (u) equippedUids.add(u);
  const result = [];
  for (const hk of party(psd)) {
    const hs = hsm[hk];
    if (!hs) continue;
    for (let slot = 0; slot < 10; slot++) {
      const gt = slotGearType(db, hk, slot);
      if (!gt) continue;
      const curUid = (hs.equippedItemIds ?? [])[slot] || 0;
      const curKey = curUid ? ism[curUid]?.ItemKey : null;

      const cands: number[] = [];
      for (const it of psd.itemSaveDatas ?? []) {
        const idb = db.items[it.ItemKey];
        if (!idb || idb.gt !== gt) continue;
        if (it.UniqueId !== curUid && equippedUids.has(it.UniqueId)) continue;
        cands.push(it.ItemKey);
      }

      let best: { key: number | string | null | undefined; dPower: number; detail?: PowerDelta } = { key: curKey, dPower: 0 };
      for (const ck of cands) {
        if (ck === curKey) continue;
        const d = powerDelta(db, hs, psd, slot, ck, rstats, sl);
        if (d.dPower > best.dPower + 1e-6) best = { key: ck, dPower: d.dPower, detail: d };
      }
      result.push({
        heroKey: hk,
        slot,
        gearType: gt,
        current: curKey ? decodeItem(db, curKey) : null,
        best: best.key && best.key !== curKey ? { ...decodeItem(db, best.key), dPower: best.dPower } : null,
        empty: !curKey,
        worth: !!(best.key && best.key !== curKey && best.dPower > 0),
      });
    }
  }

  const emptyJewelry = result.filter((r) => r.empty && ["AMULET", "EARING", "RING", "BRACER"].includes(r.gearType));
  const swaps = result.filter((r) => r.worth);
  return { slots: result, swaps, emptyJewelry };
}

export function apAdvisor(db: GameDB, psd: PlayerSaveData, stageLevel?: number) {
  const sl = stageLevel || refStageLevel(db, psd);
  const hsm = heroSaveMap(psd),
    rstats = runeContrib(db, psd);
  const out = [];
  for (const hk of Object.keys(db.heroes).map(Number)) {
    const hs = hsm[hk];
    if (!hs || !((hs.AbilityPoint ?? 0) > 0)) continue;
    const allocated = hs.AllocatedHeroAbilityPoint || 0;
    const attrLevels: Record<string, number> = {};
    for (const a of psd.attributeSaveDatas ?? []) attrLevels[a.Key] = a.Level;
    const base = heroStats(db, hs, psd, rstats, sl);
    let best: { attrKey: number; stat: string; mod: string; value: number; dPower: number } | null = null;
    for (const [ak, node] of Object.entries(db.attributes)) {
      if (node.hero !== hk || node.atype !== "PASSIVESKILL") continue;
      if ((attrLevels[ak] || 0) >= node.max) continue;
      if (allocated < (db.attributeGroups[node.grp] || 0)) continue;
      const p = db.passives[node.val];
      if (!p) continue;
      const c = cloneContrib(base.contrib);
      const byMt = (c[p.st] ??= {});
      (byMt[p.mt] ??= []).push(p.v);
      const dP = effPower(db, hs, psd, aggregate(c), sl, refDamage(db, psd), deliveryOf(db, hk)) - base.power;
      if (!best || dP > best.dPower) best = { attrKey: Number(ak), stat: p.st, mod: p.mt, value: p.v, dPower: dP };
    }
    out.push({ heroKey: hk, ap: hs.AbilityPoint, best });
  }
  return out;
}

export function enchantAdvisor(db: GameDB, psd: PlayerSaveData, stageLevel?: number, affixFactor?: number) {
  const sl = stageLevel || refStageLevel(db, psd);
  const af = affixFactor || 0.25;
  const hsm = heroSaveMap(psd),
    ism = itemSaveMap(psd),
    rstats = runeContrib(db, psd),
    comp = partyComp(db, psd);
  const roleStat = (role: string): string =>
    role === "tank" || role === "bruiser" || role === "support" ? "MaxHp" : "AttackDamage";
  const perHero = [];
  let totalOpen = 0;
  for (const hk of party(psd)) {
    const hs = hsm[hk];
    if (!hs) continue;
    let open = 0;
    for (const uid of hs.equippedItemIds ?? []) {
      if (!uid) continue;
      const it = ism[uid];
      if (!it) continue;
      const idb = db.items[it.ItemKey];
      const gs = idb && idb.grade != null ? db.gradeSlots[idb.grade] : undefined;
      const used = (it.EnchantData ?? []).filter((e) => e && e.StatModKey).length;
      if (gs) open += Math.max(0, gs.extra - used);
    }
    totalOpen += open;
    const role = comp.roles.find((r) => r.heroKey === hk)?.role || "dps";
    const stat = roleStat(role),
      aff = db.affixRep[stat] || { value: 0, mod: "FLAT" };
    const perSlot = Math.round(aff.value * af);
    const base = heroStats(db, hs, psd, rstats, sl);
    const c = cloneContrib(base.contrib);
    const byMt = (c[stat] ??= {});
    const arr = (byMt[aff.mod] ??= []);
    for (let i = 0; i < open; i++) arr.push(perSlot);
    const estPower = effPower(db, hs, psd, aggregate(c), sl, refDamage(db, psd), deliveryOf(db, hk));
    perHero.push({ heroKey: hk, open, stat, mod: aff.mod, perSlot, basePower: base.power, estPower, dPower: estPower - base.power });
  }
  return { perHero, totalOpen, affixFactor: af };
}

export function gearProgression(db: GameDB, psd: PlayerSaveData, frontierLvl?: number) {
  const ism = itemSaveMap(psd),
    hsm = heroSaveMap(psd),
    levels: number[] = [];
  for (const hk of party(psd)) {
    const hs = hsm[hk];
    for (const u of (hs && hs.equippedItemIds) || []) {
      if (!u) continue;
      const it = ism[u];
      const idb = it && db.items[it.ItemKey];
      if (idb && idb.lvl != null) levels.push(idb.lvl);
    }
  }
  const avg = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
  const fl = frontierLvl ?? 0;
  return {
    avgItemLevel: Math.round(avg),
    frontierLevel: fl,
    gap: Math.max(0, fl - Math.round(avg)),
    advice: fl > avg + 3 ? "push_for_drops" : "on_par",
  };
}
