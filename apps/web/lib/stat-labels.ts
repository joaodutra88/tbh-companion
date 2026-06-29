// Readable English labels for rune stat keys.
// Source of truth: basenames of /public/game/runes/*.png (the game's stat key set).
// Fallback: humanize camelCase by inserting a space before each capital letter.
// Never exposes a raw camelCase key to the UI.

const STAT_LABELS: Record<string, string> = {
  AdditionalExp: "Additional EXP",
  AdditionalExpActBoss: "Act Boss EXP Bonus",
  AdditionalExpNormalMonster: "Normal Monster EXP Bonus",
  AdditionalExpStageBoss: "Stage Boss EXP Bonus",
  AdditionalGold: "Additional Gold",
  AdditionalGoldActBoss: "Act Boss Gold Bonus",
  AdditionalGoldNormalMonster: "Normal Monster Gold Bonus",
  AdditionalGoldStageBoss: "Stage Boss Gold Bonus",
  AllHeroArmor: "All Hero Armor",
  AllHeroArmorPercent: "All Hero Armor %",
  AllHeroAttackDamage: "All Hero Attack Damage",
  AllHeroAttackDamagePercent: "All Hero Attack Damage %",
  AllHeroAttackSpeed: "All Hero Attack Speed",
  AllHeroMoveSpeed: "All Hero Move Speed",
  CubeAlchemyGoldPercent: "Cube Alchemy Gold %",
  CubeExpPercent: "Cube EXP %",
  DropChanceNormalChest: "Normal Chest Drop Chance",
  DropChanceStageBossChest: "Stage Boss Chest Drop Chance",
  IncreaseExpAmount: "EXP Gain",
  IncreaseGoldAmount: "Gold Gain",
  MaxAmountActBossChest: "Act Boss Chest Max Capacity",
  MaxAmountNormalChest: "Normal Chest Max Capacity",
  MaxAmountStageBossChest: "Stage Boss Chest Max Capacity",
  MaxInventorySlot: "Max Inventory Slot",
  OfflineRewardExpPercent: "Offline EXP Reward %",
  OfflineRewardGoldPercent: "Offline Gold Reward %",
  OpenAllTypeChestAllAtOnce: "Open All Chests At Once",
  OpenOneTypeChestAllAtOnce: "Open One Chest Type At Once",
  ReduceAutoOpenActBossChestTime: "Act Boss Chest Auto-Open Speed",
  ReduceAutoOpenNormalChestTime: "Normal Chest Auto-Open Speed",
  ReduceAutoOpenStageBossChestTime: "Stage Boss Chest Auto-Open Speed",
  UnlockArrangeSlotCount: "Unlock Arrange Slot",
  UnlockAutoOpenActBossChest: "Unlock Act Boss Chest Auto-Open",
  UnlockAutoOpenNormalChest: "Unlock Normal Chest Auto-Open",
  UnlockAutoOpenStageBossChest: "Unlock Stage Boss Chest Auto-Open",
  UnlockOfflineReward: "Unlock Offline Reward",
  UnlockSkillSlotCount: "Unlock Skill Slot",
  UnlockStashPageCount: "Unlock Stash Page",
  WaveCountReduction: "Wave Count Reduction",
};

/**
 * Readable English label for a rune stat key.
 * Mapped keys return curated labels (e.g. "IncreaseGoldAmount" → "Gold Gain").
 * Unmapped keys are humanized by inserting a space before each capital letter
 * (e.g. "SomethingNewKey" → "Something New Key") — never the raw camelCase.
 */
export function statLabel(key: string): string {
  const mapped = STAT_LABELS[key];
  if (mapped !== undefined) return mapped;
  // Humanize camelCase: insert space before each capital that follows a non-space char.
  return key.replace(/([A-Z])/g, " $1").trimStart();
}
