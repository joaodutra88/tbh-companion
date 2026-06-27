import { describe, it, expect, beforeAll } from "vitest";
import { loadGameDB, getDemoSaveText } from "@tbh/game-data";
import type { GameDB } from "../src/types";
import {
  parseSave,
  heroStats,
  runeContrib,
  party,
  heroSaveMap,
  bestFarm,
} from "../src/index";

let db: GameDB;
let psd: ReturnType<typeof parseSave>;
const approxPct = (got: number, want: number, tolPct: number): void =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual((Math.abs(want) * tolPct) / 100);

beforeAll(async () => {
  db = await loadGameDB();
  psd = parseSave(getDemoSaveText());
});

describe("stats core (POWER @ stage level 23)", () => {
  it("hero POWERs batem com o oráculo", () => {
    const hsm = heroSaveMap(psd);
    const rc = runeContrib(db, psd);
    const p = (hk: number): number => {
      const hs = hsm[hk];
      if (!hs) throw new Error(`hero ${hk} ausente no save`);
      return heroStats(db, hs, psd, rc).power;
    };
    approxPct(p(201), 307, 10);
    approxPct(p(401), 579, 10);
    approxPct(p(301), 405, 10);
    expect(party(psd)).toContain(201);
  });
});

describe("farm optimizer", () => {
  it("bestFarm calibra e recomenda um stage farmável", () => {
    const hsm = heroSaveMap(psd);
    const rcv = runeContrib(db, psd);
    const heroes = party(psd).map((hk) => {
      const hs = hsm[hk];
      if (!hs) throw new Error(`hero ${hk} ausente no save`);
      return heroStats(db, hs, psd, rcv);
    });
    const D = heroes.reduce((a, h) => a + h.dps, 0);
    const f = bestFarm(db, psd, D, {});
    expect(f.recommend).toBeTruthy();
    expect(typeof f.recommend?.goldPerSec).toBe("number");
  });
});
