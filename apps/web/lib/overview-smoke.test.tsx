// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { getDemoSaveText, loadGameDB } from "@tbh/game-data";
import type { GameDB, Recommendation } from "@tbh/engine";
import { runRecommend } from "./engine-bridge";
import { Overview } from "@/components/overview/overview";

describe("Overview (smoke)", () => {
  it("renders POWER, the coach directive, and party hero names from a real demo rec", async () => {
    const rec: Recommendation = await runRecommend(getDemoSaveText());
    const db: GameDB = await loadGameDB();

    render(<Overview rec={rec} db={db} />);

    // POWER = Σ heroes.power (~1.291 in the demo) — appears at least in MetaStrip.
    const power = rec.heroes.reduce((s, h) => s + h.power, 0);
    const powerStr = Math.round(power).toLocaleString("pt-BR");
    expect(screen.getAllByText(powerStr).length).toBeGreaterThan(0);

    // Coach card eyebrow + directive (demo coach is farm_push → stage 1306).
    // The directive also surfaces in the do-now list, so allow multiple matches.
    expect(screen.getByText(/Próxima jogada/i)).toBeTruthy();
    expect(screen.getAllByText(/stage 1306/i).length).toBeGreaterThan(0);

    // At least one hero name (carry 201 = "Ranger" in en-US, the default locale).
    expect(screen.getAllByText(/Ranger/).length).toBeGreaterThan(0);
  });
});
