// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { getDemoSaveText } from "@tbh/game-data";
import type { Recommendation } from "@tbh/engine";
import { runRecommend } from "./engine-bridge";
import { RunesPane } from "@/components/runes/runes-pane";

afterEach(() => cleanup());

describe("RunesPane (smoke)", () => {
  it("renderiza um <svg> com ~197 nós (circle) e ≥100 arestas (line) do demo real", async () => {
    const rec: Recommendation = await runRecommend(getDemoSaveText());

    const { container } = render(<RunesPane rec={rec} />);

    // O SVG principal da árvore está presente.
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();

    // 197 nós: cada nó tem ao menos um <circle> de corpo; decorações
    // (anel almostfree / contorno dps / glow / seleção) só somam → ≥ 197.
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThanOrEqual(197);

    // 195 arestas no DB → folga confortável acima de 100.
    const lines = container.querySelectorAll("line");
    expect(lines.length).toBeGreaterThanOrEqual(100);
  });

  it("começa sem nó selecionado (mostra a dica de clique)", async () => {
    const rec: Recommendation = await runRecommend(getDemoSaveText());
    const { container } = render(<RunesPane rec={rec} />);
    expect(container.textContent).toContain("Clique num nó");
  });
});
