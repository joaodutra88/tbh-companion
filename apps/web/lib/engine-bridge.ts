import { loadGameDB } from "@tbh/game-data";
import {
  recommend,
  parseSave,
  gold,
  partyExp,
  type Recommendation,
  type RecommendOpts,
} from "@tbh/engine";

export async function runRecommend(
  text: string,
  opts?: RecommendOpts,
): Promise<Recommendation> {
  const db = await loadGameDB();
  return recommend(db, parseSave(text), opts ?? {});
}

export async function measureSave(
  text: string,
): Promise<{ gold: number; partyExp: number; stageKey: number | string }> {
  const db = await loadGameDB();
  const psd = parseSave(text);
  return {
    gold: gold(psd),
    partyExp: partyExp(db, psd),
    stageKey: psd.commonSaveData.currentStageKey,
  };
}
