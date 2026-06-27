import { parseSave } from "@tbh/engine";
import type { PlayerSaveData } from "@tbh/engine";
export * from "./decrypt"; export * from "./connect"; export * from "./demo";
export function textToSave(text: string): PlayerSaveData { return parseSave(text); }
