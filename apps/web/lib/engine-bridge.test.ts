import { describe, it, expect } from "vitest";
import { getDemoSaveText } from "@tbh/game-data";
import { runRecommend } from "./engine-bridge";

describe("engine-bridge", () => {
  it("demo save → recommend() com coach e party DPS", async () => {
    const r = await runRecommend(getDemoSaveText());
    expect(r.meta.partyDPS).toBeGreaterThan(0);
    expect(r.coach).not.toBeNull();
    expect(r.heroes.length).toBeGreaterThan(0);
  });
});
