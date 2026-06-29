import { describe, it, expect } from "vitest";
import { dedupeByNameAndSt } from "./rune-dedupe";

// Pure unit tests — no DOM, no engine, no locale dependency.
// Plain strings are used for `name` because localized(plainString) === plainString.

interface TestRune {
  key: number;
  name: string;
  st?: string | null;
  cost: number;
}

describe("dedupeByNameAndSt", () => {
  it("collapses two items with identical (name + st) to ONE row with count = 2", () => {
    const items: TestRune[] = [
      { key: 1, name: "Rune of Expansion", st: "AllHeroAttackDamage", cost: 100 },
      { key: 2, name: "Rune of Expansion", st: "AllHeroAttackDamage", cost: 200 },
    ];
    const result = dedupeByNameAndSt(items);
    expect(result).toHaveLength(1);
    expect(result[0]!.count).toBe(2);
  });

  it("keeps the FIRST item when deduping (cheapest/best-ranked, input is pre-sorted)", () => {
    const items: TestRune[] = [
      { key: 1, name: "Rune of Expansion", st: "AllHeroAttackDamage", cost: 100 },
      { key: 2, name: "Rune of Expansion", st: "AllHeroAttackDamage", cost: 200 },
    ];
    const result = dedupeByNameAndSt(items);
    expect(result[0]!.key).toBe(1);
    expect(result[0]!.cost).toBe(100);
  });

  it("does NOT merge two items with the same name but DIFFERENT st (stays two rows)", () => {
    const items: TestRune[] = [
      { key: 1, name: "Rune of Expansion", st: "AllHeroAttackDamage", cost: 100 },
      { key: 2, name: "Rune of Expansion", st: "AllHeroArmor", cost: 150 },
    ];
    const result = dedupeByNameAndSt(items);
    expect(result).toHaveLength(2);
    expect(result[0]!.count).toBe(1);
    expect(result[1]!.count).toBe(1);
  });

  it("keeps items with distinct names as separate rows", () => {
    const items: TestRune[] = [
      { key: 1, name: "Rune Alpha", st: "AllHeroAttackDamage", cost: 100 },
      { key: 2, name: "Rune Beta", st: "AllHeroAttackDamage", cost: 200 },
    ];
    const result = dedupeByNameAndSt(items);
    expect(result).toHaveLength(2);
  });

  it("accumulates count beyond 2 when more than two duplicates are present", () => {
    const base: TestRune = { key: 1, name: "Rune of Expansion", st: "AllHeroAttackDamage", cost: 100 };
    const items: TestRune[] = [
      base,
      { ...base, key: 2, cost: 120 },
      { ...base, key: 3, cost: 140 },
      { ...base, key: 4, cost: 160 },
      { ...base, key: 5, cost: 180 },
      { ...base, key: 6, cost: 200 },
    ];
    const result = dedupeByNameAndSt(items);
    expect(result).toHaveLength(1);
    expect(result[0]!.count).toBe(6);
    expect(result[0]!.key).toBe(1); // first (cheapest) is kept
  });

  it("handles empty input", () => {
    expect(dedupeByNameAndSt([])).toHaveLength(0);
  });
});
