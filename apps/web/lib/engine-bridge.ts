import { loadGameDB } from "@tbh/game-data";
import { recommend, parseSave, type Recommendation } from "@tbh/engine";

export async function runRecommend(text: string): Promise<Recommendation> {
  const db = await loadGameDB();
  return recommend(db, parseSave(text), { elapsedSec: 0 });
}
