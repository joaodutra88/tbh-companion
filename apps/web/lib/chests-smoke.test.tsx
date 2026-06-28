// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { getDemoSaveText } from "@tbh/game-data";
import type { Recommendation } from "@tbh/engine";
import { runRecommend } from "./engine-bridge";
import { ChestsPane } from "@/components/chests/chests-pane";

afterEach(() => cleanup());

describe("ChestsPane (smoke)", () => {
  it("renders at least one chest card with a cooldown from a real demo rec", async () => {
    const rec: Recommendation = await runRecommend(getDemoSaveText());

    render(<ChestsPane rec={rec} />);

    // Drop-window section is always rendered.
    expect(screen.getByLabelText("Janela de drop")).toBeTruthy();

    // At least one of the PT-BR chest titles is present.
    const titles = [
      "Baú normal",
      "Baú de chefe de fase",
      "Baú de chefe de ato",
    ] as const;
    const found = titles.filter((t) => screen.queryByText(t) !== null);
    expect(found.length).toBeGreaterThan(0);

    // At least one duration value (auto-open cooldown or drop window) is rendered.
    // fmtDur returns strings like "5m", "10m", "1h", "30s", etc.
    const durs = screen.getAllByText(/^\d+(s|m|h)/);
    expect(durs.length).toBeGreaterThan(0);
  });
});
