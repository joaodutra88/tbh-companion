// Idle / offline rewards — port fiel de engine.js (~339-364).
import type { GameDB, PlayerSaveData } from "./types";
import { PARAMS, OFFLINE_GOLD_RUNES, OFFLINE_EXP_RUNES, OFFLINE_UNLOCK_RUNE } from "./stats";
import { stageLevelOf, type ParkStage } from "./farm";

export interface IdleInfo {
  unlocked: boolean;
  stageLevel: number | undefined;
  cap: number;
  fullGold: number;
  fullExp: number;
  capHours?: number;
  goldBonus?: number;
  expBonus?: number;
  goldPerSec?: number;
  expPerSec?: number;
  accruedGold?: number | null;
  accruedExp?: number | null;
  frac?: number | null;
  secsToCap?: number | null;
  bestPark?: ParkStage | null;
}

export function offlineBonuses(db: GameDB, psd: PlayerSaveData): { goldBonus: number; expBonus: number } {
  const rs: Record<string, number> = Object.fromEntries((psd.RuneSaveData ?? []).map((r) => [r.RuneKey, r.Level]));
  const sum = (keys: number[], st: string): number => {
    let v = 0;
    for (const k of keys) {
      const lv = rs[k] || 0;
      const rd = db.runes[k];
      if (!lv || !rd) continue;
      const rl = db.runeLevels[rd.ldk];
      for (let L = 1; L <= lv; L++) {
        const row = rl && rl[L];
        if (row && row.st === st) v += row.v || 0;
      }
    }
    return v;
  };
  const g_ = sum(OFFLINE_GOLD_RUNES, "OfflineRewardGoldPercent");
  const e_ = sum(OFFLINE_EXP_RUNES, "OfflineRewardExpPercent");
  return { goldBonus: g_ / 100, expBonus: e_ / 100 };
}

export const offlineUnlocked = (psd: PlayerSaveData): boolean =>
  ((psd.RuneSaveData ?? []).find((r) => r.RuneKey === OFFLINE_UNLOCK_RUNE)?.Level ?? 0) > 0;

export function idleInfo(db: GameDB, psd: PlayerSaveData, elapsedSec?: number | null): IdleInfo {
  const sl = stageLevelOf(db, String(psd.commonSaveData.currentStageKey));
  const row = sl != null ? db.offlineRewards[sl] : undefined;
  const cap = PARAMS.OFFLINE_CAP_SECONDS;
  if (!row || !offlineUnlocked(psd)) return { unlocked: offlineUnlocked(psd), stageLevel: sl, cap, fullGold: 0, fullExp: 0 };
  const { goldBonus, expBonus } = offlineBonuses(db, psd);
  const fullGold = Math.round(row.gold * row.kills * (1 + goldBonus));
  const fullExp = Math.round(row.exp * row.kills * (1 + expBonus));
  const frac = elapsedSec != null ? Math.min(1, Math.max(0, elapsedSec) / cap) : null;
  return {
    unlocked: true,
    stageLevel: sl,
    cap,
    capHours: cap / 3600,
    goldBonus,
    expBonus,
    fullGold,
    fullExp,
    goldPerSec: fullGold / cap,
    expPerSec: fullExp / cap,
    accruedGold: frac != null ? Math.round(fullGold * frac) : null,
    accruedExp: frac != null ? Math.round(fullExp * frac) : null,
    frac,
    secsToCap: elapsedSec != null ? Math.max(0, cap - Math.min(cap, elapsedSec)) : null,
  };
}
