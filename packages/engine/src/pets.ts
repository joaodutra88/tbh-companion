// Pets — port fiel de engine.js (~624-636).
import type { GameDB, PlayerSaveData } from "./types";

export function petAdvisor(db: GameDB, psd: PlayerSaveData) {
  const BAT_KEY = 1001;
  const unlockedSet = new Set((psd.PetSaveData ?? []).filter((p) => p.IsUnlock).map((p) => p.PetKey));
  const unlocked = [...unlockedSet];
  const arranged = psd.commonSaveData.ArrangedPetKey;
  const locked = Object.keys(db.pets)
    .map(Number)
    .filter((k) => !unlockedSet.has(k));
  const score = (pk: number, stType: string): number => {
    const pet = db.pets[String(pk)];
    if (!pet) return 0;
    const s = (db.petStats[String(pet.statKey)] ?? []).find((x) => x.st === stType);
    return s ? s.v : 0;
  };
  const rank = (stType: string) =>
    unlocked
      .map((pk) => ({ petKey: pk, name: db.pets[String(pk)]?.name, value: score(pk, stType) }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  const batUnlocked = unlockedSet.has(BAT_KEY);
  return {
    arranged,
    unlocked,
    locked,
    passive: true,
    batUnlocked,
    unlockNext: !batUnlocked ? BAT_KEY : locked[0] || null, // Bat first, then the rest naturally
    bestGold: rank("IncreaseGoldAmount")[0] || null,
    bestExp: rank("IncreaseExpAmount")[0] || null,
    bestDrop: rank("DropChanceNormalChestPercent")[0] || null,
  };
}
