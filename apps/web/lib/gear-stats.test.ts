import { describe, it, expect } from "vitest";
import { loadGameDB } from "@tbh/game-data";
import {
  gearStatRows,
  statDrivesMetric,
  GEAR_METRICS,
  metricTargets,
  formatGearStatValue,
} from "./gear-stats";

// Real gear keys confirmed from gamedata.json:
//   300001 = SWORD (b1s=AttackDamage FLAT, b2s=AttackSpeed FLAT)
//   410001 = ARROW (b1s=AttackSpeed ADDITIVE)

// ── gearStatRows ─────────────────────────────────────────────────────────────

describe("gearStatRows — flat stats (SWORD 300001)", () => {
  it("returns at least 2 rows for a SWORD with b1+b2", async () => {
    const db = await loadGameDB();
    const rows = gearStatRows(db, 300001);
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it("AttackDamage row: label='Attack Damage', FLAT, isPercent=false", async () => {
    const db = await loadGameDB();
    const rows = gearStatRows(db, 300001);
    const row = rows.find((r) => r.statKey === "AttackDamage");
    expect(row).toBeDefined();
    expect(row!.label).toBe("Attack Damage");
    expect(row!.mt).toBe("FLAT");
    expect(row!.isPercent).toBe(false);
    expect(typeof row!.value).toBe("number");
  });

  it("AttackSpeed row: label='Attack Speed', FLAT, isPercent=false", async () => {
    const db = await loadGameDB();
    const rows = gearStatRows(db, 300001);
    const row = rows.find((r) => r.statKey === "AttackSpeed");
    expect(row).toBeDefined();
    expect(row!.label).toBe("Attack Speed");
    expect(row!.mt).toBe("FLAT");
    expect(row!.isPercent).toBe(false);
  });
});

describe("gearStatRows — percent stat (ARROW 410001)", () => {
  it("returns 1 row for an ARROW (b1 only)", async () => {
    const db = await loadGameDB();
    const rows = gearStatRows(db, 410001);
    // ARROW has b1 only; inh may be empty → at least 1 row
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("AttackSpeed row: ADDITIVE, isPercent=true", async () => {
    const db = await loadGameDB();
    const rows = gearStatRows(db, 410001);
    const row = rows.find((r) => r.statKey === "AttackSpeed");
    expect(row).toBeDefined();
    expect(row!.mt).toBe("ADDITIVE");
    expect(row!.isPercent).toBe(true);
  });
});

describe("gearStatRows — edge cases", () => {
  it("returns [] for unknown gear key", async () => {
    const db = await loadGameDB();
    expect(gearStatRows(db, 999999)).toEqual([]);
  });

  it("accepts string key as well as number", async () => {
    const db = await loadGameDB();
    const byNum = gearStatRows(db, 300001);
    const byStr = gearStatRows(db, "300001");
    expect(byStr.length).toBe(byNum.length);
  });

  it("all rows have a non-empty label", async () => {
    const db = await loadGameDB();
    const rows = gearStatRows(db, 300001);
    for (const row of rows) {
      expect(row.label).toBeTruthy();
    }
  });
});

// ── formatGearStatValue ───────────────────────────────────────────────────────

describe("formatGearStatValue — casa com o tooltip in-game (escala /1000)", () => {
  it("MULTIPLICATIVE 171 → +17,1% (não +171%)", () => {
    expect(formatGearStatValue(171, "MULTIPLICATIVE")).toBe("+17,1%");
  });

  it("ADDITIVE 171 → +17,1%", () => {
    expect(formatGearStatValue(171, "ADDITIVE")).toBe("+17,1%");
  });

  it("FLAT 839 → +839 (número absoluto, sem %)", () => {
    expect(formatGearStatValue(839, "FLAT")).toBe("+839");
  });

  it("MULTIPLICATIVE 160 → +16,0%", () => {
    expect(formatGearStatValue(160, "MULTIPLICATIVE")).toBe("+16,0%");
  });
});

// ── statDrivesMetric ──────────────────────────────────────────────────────────

describe("statDrivesMetric — direct base-stat keys", () => {
  it("AttackDamage drives dps", () => {
    expect(statDrivesMetric("AttackDamage", "dps")).toBe(true);
  });

  it("AttackSpeed drives dps", () => {
    expect(statDrivesMetric("AttackSpeed", "dps")).toBe(true);
  });

  it("CriticalChance drives dps", () => {
    expect(statDrivesMetric("CriticalChance", "dps")).toBe(true);
  });

  it("CriticalDamage drives dps", () => {
    expect(statDrivesMetric("CriticalDamage", "dps")).toBe(true);
  });

  it("Armor drives def", () => {
    expect(statDrivesMetric("Armor", "def")).toBe(true);
  });

  it("MaxHp drives def", () => {
    expect(statDrivesMetric("MaxHp", "def")).toBe(true);
  });

  it("AttackDamage drives power", () => {
    expect(statDrivesMetric("AttackDamage", "power")).toBe(true);
  });

  it("Armor drives power", () => {
    expect(statDrivesMetric("Armor", "power")).toBe(true);
  });

  it("AttackDamage does NOT drive def", () => {
    expect(statDrivesMetric("AttackDamage", "def")).toBe(false);
  });

  it("Armor does NOT drive dps", () => {
    expect(statDrivesMetric("Armor", "dps")).toBe(false);
  });

  it("MovementSpeed does not drive any metric", () => {
    expect(statDrivesMetric("MovementSpeed", "dps")).toBe(false);
    expect(statDrivesMetric("MovementSpeed", "def")).toBe(false);
    expect(statDrivesMetric("MovementSpeed", "power")).toBe(false);
  });
});

describe("statDrivesMetric — AllHero* keys (via RUNE_MAP)", () => {
  it("AllHeroAttackDamage drives dps", () => {
    expect(statDrivesMetric("AllHeroAttackDamage", "dps")).toBe(true);
  });

  it("AllHeroAttackDamagePercent drives dps", () => {
    expect(statDrivesMetric("AllHeroAttackDamagePercent", "dps")).toBe(true);
  });

  it("AllHeroAttackSpeed drives dps", () => {
    expect(statDrivesMetric("AllHeroAttackSpeed", "dps")).toBe(true);
  });

  it("AllHeroArmor drives def", () => {
    expect(statDrivesMetric("AllHeroArmor", "def")).toBe(true);
  });

  it("AllHeroArmorPercent drives def", () => {
    expect(statDrivesMetric("AllHeroArmorPercent", "def")).toBe(true);
  });

  it("AllHeroAttackDamage does NOT drive def", () => {
    expect(statDrivesMetric("AllHeroAttackDamage", "def")).toBe(false);
  });

  it("AllHeroArmor does NOT drive dps", () => {
    expect(statDrivesMetric("AllHeroArmor", "dps")).toBe(false);
  });
});

describe("statDrivesMetric — unknown stats", () => {
  it("returns false for completely unknown stat", () => {
    expect(statDrivesMetric("SomeFakeStatKey", "dps")).toBe(false);
    expect(statDrivesMetric("SomeFakeStatKey", "def")).toBe(false);
    expect(statDrivesMetric("SomeFakeStatKey", "power")).toBe(false);
  });

  it("returns false for BlockChance (not a DPS/def driver)", () => {
    expect(statDrivesMetric("BlockChance", "dps")).toBe(false);
    expect(statDrivesMetric("BlockChance", "def")).toBe(false);
  });
});

// ── GEAR_METRICS ──────────────────────────────────────────────────────────────

describe("GEAR_METRICS", () => {
  it("has exactly 3 entries", () => {
    expect(GEAR_METRICS).toHaveLength(3);
  });

  it("power is first with field 'dPower'", () => {
    expect(GEAR_METRICS[0].id).toBe("power");
    expect(GEAR_METRICS[0].label).toBe("Poder");
    expect(GEAR_METRICS[0].field).toBe("dPower");
  });

  it("dps is second with field 'dDps'", () => {
    expect(GEAR_METRICS[1].id).toBe("dps");
    expect(GEAR_METRICS[1].label).toBe("DPS");
    expect(GEAR_METRICS[1].field).toBe("dDps");
  });

  it("def is third with field 'dEhp'", () => {
    expect(GEAR_METRICS[2].id).toBe("def");
    expect(GEAR_METRICS[2].label).toBe("Defesa");
    expect(GEAR_METRICS[2].field).toBe("dEhp");
  });
});

// ── metricTargets ─────────────────────────────────────────────────────────────

describe("metricTargets", () => {
  it("dps has exactly 4 targets", () => {
    expect(metricTargets.dps.size).toBe(4);
    for (const t of ["AttackDamage", "AttackSpeed", "CriticalChance", "CriticalDamage"]) {
      expect(metricTargets.dps.has(t)).toBe(true);
    }
  });

  it("def has exactly 2 targets", () => {
    expect(metricTargets.def.size).toBe(2);
    expect(metricTargets.def.has("MaxHp")).toBe(true);
    expect(metricTargets.def.has("Armor")).toBe(true);
  });

  it("power is the union of dps + def (6 entries)", () => {
    expect(metricTargets.power.size).toBe(6);
    for (const t of metricTargets.dps) expect(metricTargets.power.has(t)).toBe(true);
    for (const t of metricTargets.def) expect(metricTargets.power.has(t)).toBe(true);
  });
});
