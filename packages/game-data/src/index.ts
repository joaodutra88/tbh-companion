import type { GameDB } from "@tbh/engine";
import demoSave from "./raw/demo-save.json";

let cached: GameDB | null = null;
export async function loadGameDB(): Promise<GameDB> {
  if (cached) return cached;
  const mod = await import("./raw/gamedata.json");
  cached = (mod.default ?? mod) as unknown as GameDB;
  return cached;
}
export function getDemoSaveText(): string {
  return (demoSave as { playerSaveData: string }).playerSaveData;
}
export { default as gearNames } from "./raw/gearnames.json";
export { default as itemNames } from "./raw/itemnames.json";
export { default as materialFx } from "./raw/materialfx.json";
