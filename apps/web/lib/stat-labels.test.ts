import { describe, it, expect } from "vitest";
import { statLabel } from "./stat-labels";

// Pure unit tests — no DOM, no engine, no locale dependency.
// Tests must not assert locale-specific game names (Task 4 will flip them to
// English) but statLabel returns UI-layer English strings, so assertions here
// are stable across Task 4 changes.

describe("statLabel — mapped keys", () => {
  it("AllHeroAttackDamage → 'All Hero Attack Damage'", () => {
    expect(statLabel("AllHeroAttackDamage")).toBe("All Hero Attack Damage");
  });

  it("AllHeroAttackDamagePercent → 'All Hero Attack Damage %'", () => {
    expect(statLabel("AllHeroAttackDamagePercent")).toBe("All Hero Attack Damage %");
  });

  it("MaxAmountActBossChest → 'Act Boss Chest Max Capacity'", () => {
    expect(statLabel("MaxAmountActBossChest")).toBe("Act Boss Chest Max Capacity");
  });

  it("MaxInventorySlot → 'Max Inventory Slot'", () => {
    expect(statLabel("MaxInventorySlot")).toBe("Max Inventory Slot");
  });

  it("IncreaseGoldAmount → 'Gold Gain'", () => {
    expect(statLabel("IncreaseGoldAmount")).toBe("Gold Gain");
  });

  it("OfflineRewardGoldPercent → 'Offline Gold Reward %'", () => {
    expect(statLabel("OfflineRewardGoldPercent")).toBe("Offline Gold Reward %");
  });

  it("AllHeroArmor → 'All Hero Armor'", () => {
    expect(statLabel("AllHeroArmor")).toBe("All Hero Armor");
  });

  it("WaveCountReduction → 'Wave Count Reduction'", () => {
    expect(statLabel("WaveCountReduction")).toBe("Wave Count Reduction");
  });
});

describe("statLabel — humanize fallback", () => {
  it("unknown camelCase key is humanized (spaces before capitals)", () => {
    // Never returns the raw camelCase key.
    const result = statLabel("SomethingNewKey");
    expect(result).toBe("Something New Key");
    expect(result).not.toBe("SomethingNewKey");
  });

  it("all-lowercase key is returned as-is (no capitals to split)", () => {
    const result = statLabel("lowercase");
    expect(result).toBe("lowercase");
  });

  it("humanized result always contains spaces when input has multiple capitals", () => {
    const result = statLabel("UnknownCamelCaseKey");
    expect(result).toContain(" ");
  });

  it("result is never the raw camelCase for a multi-capital unknown key", () => {
    const result = statLabel("AnyUnmappedStatKey");
    expect(result).not.toBe("AnyUnmappedStatKey");
  });
});
