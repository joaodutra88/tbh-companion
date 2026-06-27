// Misc utilities — port fiel de engine.js (~213-214 aggVal/totalClears,
// 830-833 forecast, 909 ticksToUnix).
import type { PlayerSaveData } from "./types";
import { gold } from "./stats";
import type { LevelInfo } from "./leveling";
import type { IdleInfo } from "./idle";

export function ticksToUnix(ticks: number | string): number {
  return Number(ticks) / 1e7 - 62135596800;
}

export function aggVal(psd: PlayerSaveData, type: number, sub: number): number | null {
  const a = (psd.aggregateSaveDatas ?? []).find((x) => x.Type === type && x.SubKey === sub);
  return a ? a.Value : null;
}

export function totalClears(psd: PlayerSaveData): number | null {
  return aggVal(psd, 15, 0);
}

export function forecast(psd: PlayerSaveData, level: LevelInfo[], idle: IdleInfo, goldPerSec?: number) {
  const g = goldPerSec ?? 0;
  return {
    nextLevel: level.map((l) => ({ heroKey: l.heroKey, etaSec: l.etaSec })).filter((x) => x.etaSec),
    idleCapSec: idle && idle.unlocked ? idle.cap : null,
    goldPerSec: g || null,
    gold100kSec: g > 0 ? Math.max(0, 100000 - gold(psd)) / g : null,
  };
}

export type Forecast = ReturnType<typeof forecast>;
