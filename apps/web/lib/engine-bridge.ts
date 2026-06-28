import { loadGameDB } from "@tbh/game-data";
import {
  recommend,
  parseSave,
  type Recommendation,
  type RecommendOpts,
} from "@tbh/engine";

export async function runRecommend(
  text: string,
  opts?: RecommendOpts,
): Promise<Recommendation> {
  const db = await loadGameDB();
  return recommend(db, parseSave(text), { elapsedSec: 0, ...opts });
}
