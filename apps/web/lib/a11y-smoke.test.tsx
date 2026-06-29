// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { getDemoSaveText } from "@tbh/game-data";
import type { Recommendation, HeroStat } from "@tbh/engine";
import { runRecommend } from "./engine-bridge";
import { AppShell } from "@/components/app-shell";
import { ConnectSave } from "@/components/connect-save";
import { HeroCard } from "@/components/overview/hero-card";
import { RunesPane } from "@/components/runes/runes-pane";

afterEach(() => cleanup());

// ── Mock useRecommendation (ConnectSave depends on it) ────────────────────────
// vi.hoisted ensures the fn is created before vi.mock hoisting resolves imports.

const mockUseRecommendation = vi.hoisted(() => vi.fn());

vi.mock("@/lib/recommendation-context", () => ({
  useRecommendation: mockUseRecommendation,
}));

function makeState(
  overrides: Partial<{
    status: "idle" | "loading" | "ready" | "error";
    error: string | null;
  }> = {},
) {
  return {
    status: "idle" as "idle" | "loading" | "ready" | "error",
    error: null as string | null,
    connect: vi.fn(),
    demo: vi.fn(),
    watch: vi.fn(),
    disconnect: vi.fn(),
    source: null,
    rec: null,
    db: null,
    recalibrate: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockUseRecommendation.mockReturnValue(makeState());
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("A11y + quick-win (smoke)", () => {
  it("AppShell: <nav> oculta quando ready=false, visível quando ready=true", () => {
    const { rerender } = render(
      <AppShell ready={false} activeTab="overview" onTabChange={vi.fn()}>
        <div>content</div>
      </AppShell>,
    );
    // Nav must be absent when save is not loaded
    expect(screen.queryByRole("navigation")).toBeNull();

    rerender(
      <AppShell ready={true} activeTab="overview" onTabChange={vi.fn()}>
        <div>content</div>
      </AppShell>,
    );
    // Nav must appear once save is ready
    expect(screen.getByRole("navigation")).toBeTruthy();
  });

  it("ConnectSave: CTA mostra spinner (.animate-spin) enquanto status=loading", () => {
    mockUseRecommendation.mockReturnValue(makeState({ status: "loading" }));
    const { container } = render(<ConnectSave />);
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it("HeroCard: barra DPS-share tem role=progressbar com aria-valuenow/min/max", () => {
    const hero = {
      heroKey: 201,
      dps: 1000,
      ehp: 5000,
      power: 1000,
      cls: "Ranger",
      level: 10,
    } as unknown as HeroStat;
    render(<HeroCard hero={hero} db={null} partyDPS={2000} isCarry={false} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toBeTruthy();
    expect(bar.getAttribute("aria-valuenow")).toBe("50");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
  });

  it("RuneTree: cada nó da árvore tem <title> SVG com nome da runa", async () => {
    const rec: Recommendation = await runRecommend(getDemoSaveText());
    const { container } = render(<RunesPane rec={rec} />);
    // The <title> must be a child of the rune-node <g>
    const nodeTitle = container.querySelector(".rune-node title");
    expect(nodeTitle).not.toBeNull();
    expect(nodeTitle!.textContent!.length).toBeGreaterThan(0);
  });

  it("ConnectSave: bloco de erro tem role=alert e anuncia o texto", () => {
    mockUseRecommendation.mockReturnValue(
      makeState({ status: "error", error: "Arquivo inválido ou corrompido." }),
    );
    render(<ConnectSave />);
    const alertEl = screen.getByRole("alert");
    expect(alertEl).toBeTruthy();
    expect(alertEl.textContent).toContain("Arquivo inválido");
  });
});
