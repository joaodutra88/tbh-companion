// Núcleo de stats/combate do engine TBH — port fiel de tbh-copilot/engine/engine.js (linhas 9-208).
// Mudança estrutural única vs. o original: o DB é injetado como parâmetro `db: GameDB`
// (no original era um global de closure `const DB = g.TBH_DB || require('./gamedata.js')`).
import type { GameDB, PlayerSaveData, HeroSave, ItemSave, HeroStat } from "./types";

// ---------------------------------------------------------------------------
// Tipos internos de acumuladores
// ---------------------------------------------------------------------------
/** Mapa stat -> valor agregado (ex.: { AttackDamage: 1234, MaxHp: 5000 }). */
export type Stats = Record<string, number>;
/** Acumulador stat -> modType -> lista de valores brutos. */
export type Contrib = Record<string, Record<string, number[]>>;
/** Linha de stat de equipamento: [stat, modType, value]. */
export type GearStatLine = [string, string, number];

export interface PowerDelta {
  base: { dps: number; ehp: number; power: number };
  next: { dps: number; ehp: number; power: number };
  dPower: number;
  dDps: number;
  dEhp: number;
}

const numOf = (x: number | string | undefined): number => (typeof x === "number" ? x : 0);

// ---------------------------------------------------------------------------
// PARAMS + constantes
// ---------------------------------------------------------------------------
export const PARAMS = {
  // From the decompiled binary via wiki/mechanics (HIGH confidence):
  MITIG_CAP: 0.75,
  ARMOR_PIERCE: 0.4,
  CRITDMG_DIVISOR: 1000,
  PERCENT_DIVISOR: 1000,
  BASIC_ATTACK_MULT: 1.9,
  OFFLINE_CAP_SECONDS: 28800,
  // Clear-time priors, empirically tuned against measured stage clears (2026-06; the
  // docs' first estimate was 1.2/2.0). Only the *ranking* depends weakly on them — live
  // calibration (clearSamples/clearSec) replaces them whenever the player has data.
  T_WAVE: 5.1,
  T_FIXED: 1.0,
  CLEAR_DUTY: 0.65, // fraction of wall-clock actually spent clearing; matches sustained rates
  CLEAR_CAP: 90, // soft kill-speed cap (s) so one-shot stages don't divide by ~0
  ALMOST_FREE_FRACTION: 0.1, // a rune is "almost free" if it costs <=10% of the gold balance
  SKIP_COST: 1e6, // mega-priced rune nodes are "skip" — but only while the player can't afford them
  SAFE_DANGER: 0.6,
  DANGER_TOL: 1.15, // survival-margin bands (comfortable / tight)
  SKILL_SCALE: 1.0, // labeled estimate: active-skill damage assumed proportional to AD
  SLOT_TYPES: [null, null, "HELMET", "ARMOR", "GLOVES", "BOOTS", "AMULET", "EARING", "RING", "BRACER"],
} as const;

/** Forma do bloco PARAMS (usado em `Recommendation.params`). */
export type Params = typeof PARAMS;

export const GOLD_KEY = 100001;
// Rune keys que concedem OfflineReward{Gold,Exp}Percent / desbloqueiam recompensas offline,
// de data/wiki/runes.json. test.cjs verifica que existem no DB e concedem exatamente esses
// stats, então um update do jogo que renumere runes falha alto em vez de somar zeros.
export const OFFLINE_GOLD_RUNES = [110011, 15002, 180201, 180401];
export const OFFLINE_EXP_RUNES = [110012, 150021, 180301, 180501];
export const OFFLINE_UNLOCK_RUNE = 11001;
export const BASE_STATS = [
  "AttackDamage",
  "AttackSpeed",
  "CastSpeed",
  "CriticalChance",
  "CriticalDamage",
  "MaxHp",
  "Armor",
  "MovementSpeed",
  "CooldownReduction",
];
export const RUNE_MAP: Record<string, [string, string]> = {
  AllHeroAttackDamage: ["AttackDamage", "FLAT"],
  AllHeroAttackDamagePercent: ["AttackDamage", "ADDITIVE"],
  AllHeroAttackSpeed: ["AttackSpeed", "ADDITIVE"],
  AllHeroArmor: ["Armor", "FLAT"],
  AllHeroArmorPercent: ["Armor", "ADDITIVE"],
  AllHeroMoveSpeed: ["MovementSpeed", "ADDITIVE"],
};

// ---------------------------------------------------------------------------
// parseSave + helpers de save (puros)
// ---------------------------------------------------------------------------
export function parseSave(raw: string): PlayerSaveData {
  const fixed = String(raw).replace(
    /([:[,])(\s*)(\d{16,})(?=\s*[,\]}])/g,
    (_m: string, p: string, sp: string, num: string) => p + sp + '"' + num + '"',
  );
  const parsed: unknown = JSON.parse(fixed);
  return parsed as PlayerSaveData;
}

export const gold = (psd: PlayerSaveData): number => {
  const c = (psd.currenySaveDatas ?? []).find((x) => x.Key === GOLD_KEY);
  return c ? c.Quantity : 0;
};

export const party = (psd: PlayerSaveData): number[] =>
  (psd.commonSaveData?.arrangedHeroKey ?? []).filter((k): k is number => k != null && Number(k) > 0);

export const heroSaveMap = (psd: PlayerSaveData): Record<string, HeroSave> =>
  Object.fromEntries((psd.heroSaveDatas ?? []).map((h): [number, HeroSave] => [h.heroKey, h]));

export const itemSaveMap = (psd: PlayerSaveData): Record<string, ItemSave> =>
  Object.fromEntries((psd.itemSaveDatas ?? []).map((it): [number | string, ItemSave] => [it.UniqueId, it]));

export const maxPartyLevel = (psd: PlayerSaveData): number => {
  const m = heroSaveMap(psd);
  return Math.max(1, ...party(psd).map((k) => m[k]?.HeroLevel || 1));
};

// ---------------------------------------------------------------------------
// runeContrib / gearStatLines / collect / aggregate
// ---------------------------------------------------------------------------
export function runeContrib(db: GameDB, psd: PlayerSaveData): Record<string, number> {
  const out: Record<string, number> = {};
  for (const rs of psd.RuneSaveData ?? []) {
    if (!rs.Level || rs.Level <= 0) continue;
    const rd = db.runes[rs.RuneKey];
    if (!rd) continue;
    const rl = db.runeLevels[rd.ldk];
    if (!rl) continue;
    for (let L = 1; L <= rs.Level; L++) {
      const row = rl[L];
      if (row) out[row.st] = (out[row.st] || 0) + (row.v || 0);
    }
  }
  return out;
}

export function gearStatLines(db: GameDB, gearKey: number | string): GearStatLine[] {
  const gr = db.gear[gearKey];
  if (!gr) return [];
  const idb = db.items[gearKey];
  const gt = idb && idb.gt != null ? db.gearTypes[idb.gt] : null;
  const out: GearStatLine[] = [];
  if (gt && gt.b1s && gr.b1 != null) out.push([gt.b1s, gt.b1m ?? "", gr.b1]);
  if (gt && gt.b2s && gr.b2 != null) out.push([gt.b2s, gt.b2m ?? "", gr.b2]);
  for (const line of gr.inh ?? []) out.push([line[0], line[1], line[2]]);
  return out;
}

export function collect(
  db: GameDB,
  heroSave: HeroSave,
  psd: PlayerSaveData,
  runeStats?: Record<string, number>,
): Contrib {
  const c: Contrib = {};
  const add = (st: string, mt: string, v: number): void => {
    const byMt = (c[st] ??= {});
    (byMt[mt] ??= []).push(v);
  };
  const hero = db.heroes[heroSave.heroKey];
  for (const st of BASE_STATS) add(st, "FLAT", numOf(hero?.[st]));
  const ism = itemSaveMap(psd);
  for (const uid of heroSave.equippedItemIds ?? []) {
    if (!uid) continue;
    const si = ism[uid];
    if (!si) continue;
    for (const [st, mt, v] of gearStatLines(db, si.ItemKey)) add(st, mt, v);

    for (const e of si.EnchantData ?? []) {
      if (e && e.StatModKey) {
        const sm = db.statMods[`${e.StatModKey}:${e.Tier}`];
        if (sm) add(sm.st, sm.mt, e.Value || 0);
      }
    }
  }
  for (const a of psd.attributeSaveDatas ?? []) {
    if (!a.Level || a.Level <= 0) continue;
    const node = db.attributes[a.Key];
    if (!node || node.hero !== heroSave.heroKey || node.atype !== "PASSIVESKILL") continue;
    const p = db.passives[node.val];
    if (p) add(p.st, p.mt, p.v * a.Level);
  }
  for (const [rst, val] of Object.entries(runeStats ?? {})) {
    const rm = RUNE_MAP[rst];
    if (rm && val) add(rm[0], rm[1], val);
  }
  return c;
}

export function aggregate(c: Contrib): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [st, mods] of Object.entries(c)) {
    const flat = (mods.FLAT ?? []).reduce((a, b) => a + b, 0);
    const add = (mods.ADDITIVE ?? []).reduce((a, b) => a + b, 0);
    let mult = 1;
    // MULTIPLICATIVE usa a mesma escala /1000 dos percentuais do jogo (PERCENT_DIVISOR).
    // Ex.: AttackSpeed MULTIPLICATIVE 171 = +17,1% (×1,171), não +171%. Só AttackSpeed e
    // CastSpeed usam MULTIPLICATIVE no DB; ambos nessa escala.
    for (const v of mods.MULTIPLICATIVE ?? []) mult *= 1 + v / PARAMS.PERCENT_DIVISOR;
    out[st] = flat * (1 + add / PARAMS.PERCENT_DIVISOR) * mult;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Helpers de combate
// ---------------------------------------------------------------------------
export const atkPerSec = (s: Stats): number => (s.AttackSpeed || 0) / 100;
export const critChance = (s: Stats): number => Math.min((s.CriticalChance || 0) / PARAMS.PERCENT_DIVISOR, 1);
export const critMult = (s: Stats): number => (s.CriticalDamage || 0) / PARAMS.CRITDMG_DIVISOR;
export const avgHit = (s: Stats): number => (s.AttackDamage || 0) * (1 - critChance(s) + critChance(s) * critMult(s));

export const DELIVERY: Record<string, string> = {
  Knight: "Melee",
  Slayer: "Melee",
  Ranger: "Projectile",
  Hunter: "Projectile",
  Sorcerer: "AOE",
  Priest: "AOE",
};
export const INC_KEY: Record<string, string> = {
  Melee: "IncreaseMeleeDamage",
  Projectile: "IncreaseProjectileDamage",
  AOE: "IncreaseAreaOfEffectDamage",
  Summon: "IncreaseSummonDamage",
};
export const ELEM_KEY: Record<string, string> = {
  Physical: "PhysicalDamagePercent",
  Fire: "FireDamagePercent",
  Cold: "ColdDamagePercent",
  Lightning: "LightningDamagePercent",
  Chaos: "ChaosDamagePercent",
};

export const deliveryOf = (db: GameDB, heroKey: number | string): string =>
  DELIVERY[db.heroes[String(heroKey)]?.cls ?? ""] || "Melee";

export const autoElementOf = (db: GameDB, heroKey: number | string): string => {
  const bk = db.heroes[String(heroKey)]?.skillKey;
  if (!bk) return "Physical";
  const bs = db.skills[String(bk)];
  return (bs && (bs.dmgType || bs.DamageType)) || "Physical";
};

export function dmgMult(s: Stats, delivery: string, element?: string): number {
  const elemPct = s[ELEM_KEY[element ?? ""] || "PhysicalDamagePercent"] || 0;
  // Dano elemental (*DamagePercent) usa a escala /1000 do jogo (PERCENT_DIVISOR), igual a
  // crit/CDR/AS — confirmado in-game. Ex.: PhysicalDamagePercent 150 = +15%, não +150%.
  // Multistrike e INC_KEY (Increase*Damage) seguem /100 por ora: o INC_KEY hoje agrega 0
  // (ADDITIVE sem base FLAT — Finding A, pendente de confirmação in-game) e a escala do
  // Multistrike não foi verificada; não mexer sem evidência.
  return (
    (1 + (s.Multistrike || 0) / 100) *
    (1 + (s[INC_KEY[delivery] ?? ""] || 0) / 100) *
    (1 + elemPct / PARAMS.PERCENT_DIVISOR)
  );
}

export const dps = (s: Stats): number => avgHit(s) * atkPerSec(s) * PARAMS.BASIC_ATTACK_MULT;
export const dpsOf = (s: Stats, delivery: string, element?: string): number => dps(s) * dmgMult(s, delivery, element);

export const refStageLevel = (db: GameDB, psd: PlayerSaveData): number =>
  db.stages[String(psd.commonSaveData?.currentStageKey)]?.lvl || 1;
export const refDamage = (db: GameDB, psd: PlayerSaveData): number =>
  db.stageThreat[String(psd.commonSaveData?.currentStageKey)]?.hit || 0;

export function mitigation(armor: number, stageLevel?: number, damage?: number): number {
  const sl = stageLevel || 1;
  const dmg = damage || 0;
  const a = armor || 0;
  const T = 14 * sl + 12;
  const denom = a * a + T * (a + PARAMS.ARMOR_PIERCE * dmg);
  const red = denom > 0 ? (a * a) / denom : 0;
  return Math.min(red, PARAMS.MITIG_CAP);
}

export function mitigMult(s: Stats, sl?: number, dmg?: number): number {
  const dodge = Math.min(s.DodgeChance || 0, s.MaxDodgeChance || 75) / 100;
  const block = Math.min(s.BlockChance || 0, s.MaxBlockChance || 75) / 100;
  const armorRed = mitigation(s.Armor || 0, sl, dmg);
  const dr = Math.min(s.DamageReduction || 0, 90) / 100;
  return Math.max(0.01, (1 - dodge) * (1 - block * 0.5) * (1 - armorRed) * (1 - dr));
}

export const ehp = (s: Stats, sl?: number, dmg?: number): number => (s.MaxHp || 0) / mitigMult(s, sl, dmg);
export const power = (s: Stats, sl: number | undefined, dmg: number | undefined, delivery: string): number =>
  Math.sqrt(Math.max(0, dpsOf(s, delivery)) * Math.max(0, ehp(s, sl, dmg)));

// ---------------------------------------------------------------------------
// DPS de skill ativa
// ---------------------------------------------------------------------------
const DELIVERY_STR: Record<string, string> = {
  Melee: "Melee",
  Projectile: "Projectile",
  AOE: "AOE",
  Summon: "Summon",
};

export function skillLevelOf(db: GameDB, heroSave: HeroSave, psd: PlayerSaveData, skillKey: number): number {
  let lvl = 1;
  const alloc: Record<string, number> = {};
  for (const a of psd.attributeSaveDatas ?? []) alloc[a.Key] = a.Level;
  for (const [ak, node] of Object.entries(db.attributes)) {
    if (node.hero === heroSave.heroKey && node.atype === "ACTIVESKILL" && node.val === skillKey) lvl += alloc[ak] || 0;
  }
  return lvl;
}

export function skillDpsEst(db: GameDB, heroSave: HeroSave, psd: PlayerSaveData, stats: Stats): number {
  const AD = stats.AttackDamage || 0;
  const defD = deliveryOf(db, heroSave.heroKey);
  const cc = critChance(stats);
  const critF = 1 - cc + cc * critMult(stats);
  const cdr = (stats.CooldownReduction || 0) / PARAMS.PERCENT_DIVISOR;
  let total = 0;
  for (const sk of heroSave.equippedSKillKey ?? []) {
    if (sk <= 0) continue;
    const s = db.skills[String(sk)];
    if (!s || s.slot !== "SKILL" || s.act !== "COOLDOWN") continue;
    const cd = s.cd ?? 0;
    if (!(cd > 0)) continue;
    const lvls = db.skillLevels[String(s.lvlKey)];
    if (!lvls) continue;
    const lvl = skillLevelOf(db, heroSave, psd, sk);
    const val = lvls[String(lvl)] || lvls[String(Object.keys(lvls).length)] || 0;
    const delLookup = s.delivery ? DELIVERY_STR[String(s.delivery).split(",")[0]?.trim() ?? ""] ?? "" : "";
    const del = delLookup || defD;
    total += ((val / 1000) * AD * critF * dmgMult(stats, del, s.dmgType || s.DamageType)) / (cd / Math.max(0.1, 1 - cdr));
  }
  return total;
}

export function effDpsOf(db: GameDB, heroSave: HeroSave, psd: PlayerSaveData, s: Stats, delivery: string): number {
  return dpsOf(s, delivery, autoElementOf(db, heroSave.heroKey)) + skillDpsEst(db, heroSave, psd, s) * (PARAMS.SKILL_SCALE || 1);
}

export function effPower(
  db: GameDB,
  heroSave: HeroSave,
  psd: PlayerSaveData,
  s: Stats,
  sl: number | undefined,
  dmg: number | undefined,
  delivery: string,
): number {
  return Math.sqrt(Math.max(0, effDpsOf(db, heroSave, psd, s, delivery)) * Math.max(0, ehp(s, sl, dmg)));
}

// ---------------------------------------------------------------------------
// heroStats / powerDelta
// ---------------------------------------------------------------------------
export function heroStats(
  db: GameDB,
  heroSave: HeroSave,
  psd: PlayerSaveData,
  runeStats?: Record<string, number>,
  stageLevel?: number,
): HeroStat {
  const sl = stageLevel || refStageLevel(db, psd);
  const dmg = refDamage(db, psd);
  const delivery = deliveryOf(db, heroSave.heroKey);
  const c = collect(db, heroSave, psd, runeStats || runeContrib(db, psd));
  const s = aggregate(c);

  const autoDps = dpsOf(s, delivery, autoElementOf(db, heroSave.heroKey));
  const skillDps = skillDpsEst(db, heroSave, psd, s) * (PARAMS.SKILL_SCALE || 1);
  const effDps = autoDps + skillDps;
  const eHp = ehp(s, sl, dmg);
  return {
    heroKey: heroSave.heroKey,
    cls: db.heroes[heroSave.heroKey]?.cls,
    level: heroSave.HeroLevel,
    stats: s,
    dps: effDps,
    autoDps,
    skillDpsEst: skillDps,
    ehp: eHp,
    power: Math.sqrt(Math.max(0, effDps) * Math.max(0, eHp)),
    delivery,
    contrib: c,
    stageLevel: sl,
  };
}

export function powerDelta(
  db: GameDB,
  heroSave: HeroSave,
  psd: PlayerSaveData,
  slot: number,
  newGearKey: number | string | null,
  runeStats?: Record<string, number>,
  stageLevel?: number,
): PowerDelta {
  const sl = stageLevel || refStageLevel(db, psd);
  const dmg = refDamage(db, psd);
  const delivery = deliveryOf(db, heroSave.heroKey);
  const rc = runeStats || runeContrib(db, psd);
  const base = heroStats(db, heroSave, psd, rc, sl);
  const ism = itemSaveMap(psd);
  const oldUid = (heroSave.equippedItemIds ?? [])[slot];
  const oldKey = oldUid ? ism[oldUid]?.ItemKey ?? null : null;

  const c: Contrib = {};
  for (const [st, mods] of Object.entries(base.contrib)) {
    const byMt: Record<string, number[]> = {};
    for (const [mt, arr] of Object.entries(mods)) byMt[mt] = arr.slice();
    c[st] = byMt;
  }
  const rm = (st: string, mt: string, v: number): void => {
    const arr = c[st]?.[mt];
    if (arr) {
      const i = arr.indexOf(v);
      if (i >= 0) arr.splice(i, 1);
    }
  };
  if (oldKey) for (const [st, mt, v] of gearStatLines(db, oldKey)) rm(st, mt, v);
  // Ao trocar a peça, os EnchantData do gear antigo saem junto. Espelha o add de
  // collect() (gearStatLines + enchants); sem remover os enchants aqui eles vazam no
  // estado `next` e inflam o delta do candidato.
  if (oldUid)
    for (const e of ism[oldUid]?.EnchantData ?? []) {
      if (e && e.StatModKey) {
        const sm = db.statMods[`${e.StatModKey}:${e.Tier}`];
        if (sm) rm(sm.st, sm.mt, e.Value || 0);
      }
    }
  if (newGearKey)
    for (const [st, mt, v] of gearStatLines(db, newGearKey)) {
      const byMt = (c[st] ??= {});
      (byMt[mt] ??= []).push(v);
    }
  const s2 = aggregate(c);
  const next = {
    dps: effDpsOf(db, heroSave, psd, s2, delivery),
    ehp: ehp(s2, sl, dmg),
    power: effPower(db, heroSave, psd, s2, sl, dmg, delivery),
  };
  return {
    base: { dps: base.dps, ehp: base.ehp, power: base.power },
    next,
    dPower: next.power - base.power,
    dDps: next.dps - base.dps,
    dEhp: next.ehp - base.ehp,
  };
}
