import { describe, it, expect } from "vitest";
import type { GameDB } from "@tbh/engine";
import { DIFF_LABEL, DIFF_ORDER, diffTone, stageOptionText } from "./stage-format";

// Minimal DB stub — only the stages table the helpers touch.
const db = {
  stages: {
    "101": { lvl: 95, label: "3-9", diff: "TORMENT", gold: 100, exp: 50, totalHP: 1000, waves: 5 },
    "102": { lvl: 50, label: "1-5", diff: "NORMAL", gold: 50, exp: 25, totalHP: 500, waves: 3 },
    "103": { lvl: 70, label: "2-3", gold: 70, exp: 35, totalHP: 700, waves: 4 }, // no diff
    "104": { lvl: 60, label: "2-1", diff: "NIGHTMARE", gold: 60, exp: 30, totalHP: 600, waves: 3 },
    "105": { lvl: 80, label: "2-9", diff: "HELL", gold: 80, exp: 40, totalHP: 800, waves: 4 },
  },
} as unknown as GameDB;

describe("DIFF_LABEL", () => {
  it("maps all 4 raw keys to PT-BR names verbatim", () => {
    expect(DIFF_LABEL["NORMAL"]).toBe("Normal");
    expect(DIFF_LABEL["NIGHTMARE"]).toBe("Pesadelo");
    expect(DIFF_LABEL["HELL"]).toBe("Inferno");
    expect(DIFF_LABEL["TORMENT"]).toBe("Tormento");
  });

  it("has exactly 4 entries", () => {
    expect(Object.keys(DIFF_LABEL).length).toBe(4);
  });
});

describe("DIFF_ORDER", () => {
  it("lists all 4 tiers in ascending difficulty", () => {
    expect(DIFF_ORDER).toEqual(["NORMAL", "NIGHTMARE", "HELL", "TORMENT"]);
  });
});

describe("diffTone", () => {
  it("returns a Tailwind text token per tier", () => {
    expect(diffTone("NORMAL")).toContain("text-dim");
    expect(diffTone("NIGHTMARE")).toContain("text-teal");
    expect(diffTone("HELL")).toContain("text-gold");
    expect(diffTone("TORMENT")).toContain("text-coral");
  });

  it("escalates (Normal is most subtle, Tormento most vivid)", () => {
    // Normal uses 'dim' (muted), Tormento uses 'coral' (alert/risk).
    expect(diffTone("NORMAL")).not.toContain("coral");
    expect(diffTone("TORMENT")).not.toContain("dim");
  });

  it("returns empty string for unknown or empty diff", () => {
    expect(diffTone("")).toBe("");
    expect(diffTone("UNKNOWN")).toBe("");
    expect(diffTone(undefined)).toBe("");
  });
});

describe("stageOptionText", () => {
  it("includes the PT-BR difficulty label for TORMENT", () => {
    const text = stageOptionText(db, "101");
    expect(text).toContain("Tormento");
    expect(text).toContain("3-9");
    expect(text).toContain("95");
  });

  it("includes the PT-BR difficulty label for NORMAL", () => {
    const text = stageOptionText(db, "102");
    expect(text).toContain("Normal");
    expect(text).toContain("1-5");
    expect(text).toContain("50");
  });

  it("includes NIGHTMARE and HELL labels", () => {
    expect(stageOptionText(db, "104")).toContain("Pesadelo");
    expect(stageOptionText(db, "105")).toContain("Inferno");
  });

  it("falls back to just label+level when diff is absent", () => {
    const text = stageOptionText(db, "103");
    expect(text).toContain("2-3");
    expect(text).toContain("70");
    // Should not include any difficulty label
    expect(text).not.toContain("Normal");
    expect(text).not.toContain("Pesadelo");
    expect(text).not.toContain("Inferno");
    expect(text).not.toContain("Tormento");
  });

  it("returns the key string when the stage is not in db", () => {
    const text = stageOptionText(db, "999");
    expect(text).toContain("999");
  });

  it("format is 'Diff · label (nv N)' for stages with diff", () => {
    const text = stageOptionText(db, "101");
    expect(text).toMatch(/Tormento · 3-9 \(nv 95\)/);
  });

  it("format is 'label (nv N)' for stages without diff", () => {
    const text = stageOptionText(db, "103");
    expect(text).toMatch(/2-3 \(nv 70\)/);
  });
});
