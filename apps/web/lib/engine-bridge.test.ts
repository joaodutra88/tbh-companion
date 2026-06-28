import { describe, it, expect } from "vitest";
import { getDemoSaveText } from "@tbh/game-data";
import { runRecommend, measureSave } from "./engine-bridge";

describe("engine-bridge", () => {
  it("demo save → recommend() com coach e party DPS", async () => {
    const r = await runRecommend(getDemoSaveText(), { elapsedSec: 0 });
    expect(r.meta.partyDPS).toBeGreaterThan(0);
    expect(r.coach).not.toBeNull();
    expect(r.heroes.length).toBeGreaterThan(0);
  });

  it("measureSave returns gold > 0, partyExp > 0, and a stageKey", async () => {
    const m = await measureSave(getDemoSaveText());
    expect(m.gold).toBeGreaterThan(0);
    expect(m.partyExp).toBeGreaterThan(0);
    expect(m.stageKey).toBeTruthy();
  });
});
