import { describe, it, expect } from "vitest";
import type { GameDB } from "@tbh/engine";
import { fmt, fmtK, fmtDur, pct, fmtPerHour, localized, heroName, heroIcon } from "./format";

// Minimal DB stub — only the heroes table the helpers touch.
const db = {
  heroes: {
    "201": { cls: "Ranger", name: { "pt-BR": "Explorador", "en-US": "Ranger" }, icon: "/game/heroes/portraits/Hero_201.png" },
    "301": { cls: "Sorcerer", name: "Feiticeiro" }, // plain-string name, no icon
  },
} as unknown as GameDB;

describe("fmt", () => {
  it("formats integers with PT-BR thousands separator", () => {
    expect(fmt(171505)).toBe("171.505");
    expect(fmt(966.6)).toBe("967");
    expect(fmt(0)).toBe("0");
  });
  it("guards non-finite", () => {
    expect(fmt(Infinity)).toBe("—");
  });
});

describe("fmtK", () => {
  it("keeps small numbers intact", () => {
    expect(fmtK(966)).toBe("966");
    expect(fmtK(999)).toBe("999");
  });
  it("compacts thousands and millions (PT-BR decimal)", () => {
    expect(fmtK(1234)).toBe("1,2k");
    expect(fmtK(1000)).toBe("1k");
    expect(fmtK(3_400_000)).toBe("3,4M");
    expect(fmtK(1_000_000)).toBe("1M");
  });
  it("handles negatives and billions", () => {
    expect(fmtK(-1500)).toBe("-1,5k");
    expect(fmtK(2_500_000_000)).toBe("2,5B");
  });
});

describe("fmtDur", () => {
  it("formats hours and minutes", () => {
    expect(fmtDur(8000)).toBe("2h 13m");
    expect(fmtDur(3600)).toBe("1h");
  });
  it("formats minutes and seconds", () => {
    expect(fmtDur(90)).toBe("1m");
    expect(fmtDur(30)).toBe("30s");
  });
  it("formats days for long ETAs", () => {
    expect(fmtDur(90000)).toBe("1d 1h");
  });
  it("guards invalid input", () => {
    expect(fmtDur(-1)).toBe("—");
  });
});

describe("fmtPerHour", () => {
  it("formats per-hour rates in compact notation with /h suffix", () => {
    expect(fmtPerHour(12345)).toBe("12,3k/h");
    expect(fmtPerHour(1000)).toBe("1k/h");
    expect(fmtPerHour(500)).toBe("500/h");
    expect(fmtPerHour(3_400_000)).toBe("3,4M/h");
  });
  it("guards non-finite input", () => {
    expect(fmtPerHour(Infinity)).toBe("—");
    expect(fmtPerHour(NaN)).toBe("—");
  });
});

describe("pct", () => {
  it("converts fraction to percent", () => {
    expect(pct(0.458)).toBe("46%");
    expect(pct(1)).toBe("100%");
    expect(pct(0)).toBe("0%");
  });
});

describe("localized", () => {
  it("defaults to en-US when no locale given", () => {
    expect(localized({ "pt-BR": "Cavaleiro", "en-US": "Knight" })).toBe("Knight");
    expect(localized({ "en-US": "Knight" })).toBe("Knight");
    expect(localized("plain")).toBe("plain");
    expect(localized(undefined)).toBe("");
  });

  it("returns the requested locale when present", () => {
    const map = { "en-US": "Knight", "pt-BR": "Cavaleiro", "es-ES": "Caballero" };
    expect(localized(map, "pt-BR")).toBe("Cavaleiro");
    expect(localized(map, "es-ES")).toBe("Caballero");
    expect(localized(map, "en-US")).toBe("Knight");
  });

  it("falls back to en-US when the requested locale is absent", () => {
    expect(localized({ "en-US": "Knight" }, "ko-KR")).toBe("Knight");
  });

  it("falls back to pt-BR when en-US is also absent", () => {
    expect(localized({ "pt-BR": "Cavaleiro" }, "ko-KR")).toBe("Cavaleiro");
  });

  it("falls back to the first available string when no known locale matches", () => {
    expect(localized({ "ja-JP": "騎士" }, "ko-KR")).toBe("騎士");
  });
});

describe("heroName / heroIcon", () => {
  it("resolves i18n hero names in en-US by default", () => {
    expect(heroName(201, db)).toBe("Ranger");
    expect(heroName(301, db)).toBe("Feiticeiro"); // plain string — unchanged
  });
  it("resolves to a requested locale", () => {
    expect(heroName(201, db, "pt-BR")).toBe("Explorador");
  });
  it("falls back for unknown heroes", () => {
    expect(heroName(999, db)).toBe("Herói 999");
    expect(heroName(999, null)).toBe("Herói 999");
  });
  it("returns icon URL or empty string", () => {
    expect(heroIcon(201, db)).toBe("/game/heroes/portraits/Hero_201.png");
    expect(heroIcon(301, db)).toBe("");
    expect(heroIcon(201, null)).toBe("");
  });
});
