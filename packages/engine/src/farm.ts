// Farm optimizer + stage helpers — port fiel de engine.js (~224-337, 365-370, 805-811).
// DB injetado como `db: GameDB`.
import type { GameDB, PlayerSaveData, HeroStat } from "./types";
import { PARAMS, runeContrib, maxPartyLevel, party } from "./stats";

/** Tipo de um stage (valor de db.stages). */
export type Stage = GameDB["stages"][string];

export interface ClearSample {
  clearSec: number;
  hp: number;
  waves: number;
}

export interface FarmOpts {
  heroes?: HeroStat[];
  measuredGoldPerSec?: number;
  measuredExpPerSec?: number;
  measuredClearSec?: number;
  clearSamples?: ClearSample[];
}

export const stageLevelOf = (db: GameDB, key: number | string): number | undefined => db.stages[key]?.lvl;

export function stageUnlocked(db: GameDB, key: number | string, maxCompleted: number | null | undefined): boolean {
  const ord = db.stageOrder;
  const iMax = ord.indexOf(Number(maxCompleted));
  const iS = ord.indexOf(Number(key));
  if (iS < 0) return false;
  return iMax < 0 ? true : iS <= iMax + 1;
}

export function clearTime(s: Stage, D: number): number {
  return s.totalHP / Math.max(1, D) + PARAMS.T_WAVE * s.waves + PARAMS.T_FIXED;
}

// EXP falloff when over-leveled for a stage: logistic curve centered 8 levels above the
// stage, slope 2/3 per level. Both values were hand-fit to observed sustained EXP rates
// (see the 2026-06 EXP-rate validation); clamped to [0.01, 1].
export function fitFactor(partyLevel: number, stageLvl: number): number {
  return Math.min(1, Math.max(0.01, 1 / (1 + Math.exp((partyLevel - stageLvl - 8) * (2 / 3)))));
}

export function farmBonuses(db: GameDB, psd: PlayerSaveData): { goldMult: number; expMult: number } {
  const rc = runeContrib(db, psd);
  return {
    goldMult: 1 + (rc.IncreaseGoldAmount || 0) / PARAMS.PERCENT_DIVISOR,
    expMult: 1 + (rc.IncreaseExpAmount || 0) / PARAMS.PERCENT_DIVISOR,
  };
}

export function fitClearModel(samples?: ClearSample[]): { tWave: number; D: number; n: number } | null {
  const pts = (samples ?? []).filter((s) => s && s.clearSec > 0 && s.hp > 0 && s.waves > 0);
  if (pts.length < 2) return null;
  let Sww = 0,
    Swh = 0,
    Shh = 0,
    Swy = 0,
    Shy = 0;
  for (const s of pts) {
    const w = s.waves,
      h = s.hp,
      y = s.clearSec - PARAMS.T_FIXED;
    Sww += w * w;
    Swh += w * h;
    Shh += h * h;
    Swy += w * y;
    Shy += h * y;
  }
  const det = Sww * Shh - Swh * Swh;
  if (Math.abs(det) > 1e-9) {
    const tWave = (Swy * Shh - Shy * Swh) / det,
      invD = (Sww * Shy - Swh * Swy) / det;
    if (invD > 1e-12 && tWave >= 0) return { tWave, D: 1 / invD, n: pts.length };
  }
  if (Shh > 1e-9) {
    const invD0 = Shy / Shh;
    if (invD0 > 1e-12) return { tWave: 0, D: 1 / invD0, n: pts.length };
  }
  return null;
}

export function stageRates(
  s: Stage,
  t: number,
  goldMult?: number,
  expMult?: number,
  fit?: number,
): { clearTime: number; fit: number; goldPerSec: number; expPerSec: number } {
  const f = fit == null ? 1 : fit;
  return {
    clearTime: t,
    fit: f,
    goldPerSec: (s.gold * (goldMult || 1)) / t,
    expPerSec: (s.exp * f * (expMult || 1)) / t,
  };
}

export function bestFarm(db: GameDB, psd: PlayerSaveData, D: number, opts?: FarmOpts) {
  const o = opts ?? {};
  const stat = farmBonuses(db, psd);
  const partyLevel = maxPartyLevel(psd);
  const partySize = Math.max(1, party(psd).length);
  const maxC = psd.commonSaveData.maxCompletedStage,
    curKey = String(psd.commonSaveData.currentStageKey);
  const ord = db.stageOrder;
  const idxOf = (k: number | string | undefined): number => ord.indexOf(Number(k));
  let idxMax = idxOf(maxC) - 1;
  if (idxMax < 0) idxMax = idxOf(curKey);
  const curStage = db.stages[curKey];

  let Dcal = Math.max(1, D),
    tWave: number = PARAMS.T_WAVE,
    calibrated = false,
    calSource = "model";
  let goldMult = stat.goldMult,
    expMult = stat.expMult;
  const mgps = o.measuredGoldPerSec ?? 0,
    meps = o.measuredExpPerSec ?? 0,
    mcs = o.measuredClearSec ?? 0;
  const fitM = fitClearModel(o.clearSamples);
  const ovh = (w: number): number => tWave * w + PARAMS.T_FIXED;
  if (fitM) {
    tWave = fitM.tWave;
    Dcal = fitM.D;
    calibrated = true;
    calSource = "fit";
  } else if (mcs && curStage && curStage.totalHP > 0 && mcs > ovh(curStage.waves)) {
    Dcal = curStage.totalHP / Math.max(0.5, mcs - ovh(curStage.waves));
    calibrated = true;
    calSource = "clears";
  } else if (mgps && mgps > 0 && curStage && curStage.gold > 0) {
    const mct = (curStage.gold * goldMult) / mgps;
    Dcal = curStage.totalHP / Math.max(0.1, mct - ovh(curStage.waves));
    calibrated = true;
    calSource = "rate";
  }
  const dutyMul = calSource === "fit" || calSource === "clears" ? 1 / PARAMS.CLEAR_DUTY : 1;
  const ct = (s: Stage): number => (PARAMS.T_FIXED + tWave * s.waves + s.totalHP / Dcal) * dutyMul;
  if (calibrated && curStage) {
    const cc = ct(curStage);
    if (mgps > 0 && curStage.gold > 0) goldMult = (mgps * cc) / curStage.gold;
    if (meps > 0 && curStage.exp > 0) {
      const cf = Math.max(0.01, fitFactor(partyLevel, curStage.lvl));
      expMult = ((meps / partySize) * cc) / (curStage.exp * cf);
    }
  }
  const rows = [];
  for (const [key, s] of Object.entries(db.stages)) {
    const iS = idxOf(key);
    const unlocked = iS >= 0 && (idxMax < 0 || iS <= idxMax + 1);
    if (!unlocked) continue;
    const fit = fitFactor(partyLevel, s.lvl);
    const r = stageRates(s, ct(s), goldMult, expMult, fit);
    rows.push({
      key,
      label: s.label,
      lvl: s.lvl,
      diff: s.diff,
      idx: iS,
      gold: s.gold,
      exp: s.exp,
      goldPerSec: r.goldPerSec,
      expPerSec: r.expPerSec,
      clearTime: r.clearTime,
      fit: r.fit,
      goldPerHour: r.goldPerSec * 3600,
      expPerHour: r.expPerSec * 3600,
      expDensity: s.totalHP ? s.exp / s.totalHP : 0,
      goldDensity: s.totalHP ? s.gold / s.totalHP : 0,
      totalHP: s.totalHP,
      waves: s.waves,
      cleared: idxMax < 0 || iS <= idxMax,
    });
  }
  rows.sort((a, b) => a.idx - b.idx);
  const current = rows.find((r) => r.key === curKey) || null;
  const frontier = rows.length ? rows[rows.length - 1] : null;
  const push = frontier && (idxMax < 0 || frontier.idx > idxMax) ? frontier : null;

  const minLvl = current ? current.lvl : 0;
  const farmable = rows.filter((r) => (r.cleared && r.lvl >= minLvl) || (current && r.key === current.key));
  const pool = farmable.length ? farmable : rows;
  const bestGold = pool.slice().sort((a, b) => b.goldPerSec - a.goldPerSec)[0] || null;
  const bestExp = pool.slice().sort((a, b) => b.expPerSec - a.expPerSec)[0] || null;
  const recommend = bestGold;
  const onBest = !!(current && recommend && recommend.key === current.key);
  const stagesMeasured = fitM ? fitM.n : calSource === "clears" ? 1 : 0;
  return {
    current,
    recommend,
    frontier,
    push,
    onBest,
    calibrated,
    calSource,
    Dcal,
    tWave,
    partyLevel,
    stagesMeasured,
    goldBonusPct: Math.round((goldMult - 1) * 100),
    expBonusPct: Math.round((expMult - 1) * 100),
    goldOptimal: bestGold,
    expOptimal: bestExp,
    bestGold,
    bestExp,
    all: rows,
  };
}

export type FarmResult = ReturnType<typeof bestFarm>;
export type FarmRow = FarmResult["all"][number];

export interface ParkStage {
  key: string;
  label?: string;
  lvl: number;
  fullGold: number;
  fullExp: number;
}

export function bestParkStage(db: GameDB, psd: PlayerSaveData, D: number): ParkStage | null {
  const f = bestFarm(db, psd, D);
  let best: ParkStage | null = null;
  for (const r of f.all ?? []) {
    const row = db.offlineRewards[r.lvl];
    if (!row) continue;
    const fg = row.gold * row.kills;
    if (!best || fg > best.fullGold) best = { key: r.key, label: r.label, lvl: r.lvl, fullGold: fg, fullExp: row.exp * row.kills };
  }
  return best;
}

export function lastClearedKey(db: GameDB, psd: PlayerSaveData): string | null {
  const cs = psd.commonSaveData,
    ord = db.stageOrder;
  const i = ord.indexOf(Number(cs.maxCompletedStage));
  if (i > 0) return String(ord[i - 1]);
  const ic = ord.indexOf(Number(cs.currentStageKey));
  return ic >= 0 ? String(ord[ic]) : null;
}
