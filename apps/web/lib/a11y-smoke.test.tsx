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
  it("AppShell: tablist oculto quando ready=false, visível quando ready=true; tabpanel ausente antes do ready", () => {
    const { rerender } = render(
      <AppShell ready={false} activeTab="overview" onTabChange={vi.fn()}>
        <div>content</div>
      </AppShell>,
    );
    // Tablist (nav) must be absent when save is not loaded
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
    // No orphan tabpanel before the save is loaded (panels live inside {ready && …})
    expect(screen.queryByRole("tabpanel")).toBeNull();

    rerender(
      <AppShell ready={true} activeTab="overview" onTabChange={vi.fn()}>
        <div>content</div>
      </AppShell>,
    );
    // Tablist must appear once save is ready
    expect(screen.getByRole("tablist")).toBeTruthy();
    // All tabs must be present (8 tabs defined)
    expect(screen.getAllByRole("tab").length).toBe(8);
    // Active tab's panel is accessible in the a11y tree
    expect(screen.getByRole("tabpanel")).toBeTruthy();
  });

  it("AppShell: tab ativo tem aria-selected=true e controla o painel via aria-controls", () => {
    render(
      <AppShell ready={true} activeTab="farm" onTabChange={vi.fn()}>
        <div>farm content</div>
      </AppShell>,
    );
    // The "Farm" tab must be selected
    const farmTab = screen.getByRole("tab", { name: "Farm" });
    expect(farmTab.getAttribute("aria-selected")).toBe("true");

    // The panel must exist with role="tabpanel"
    const panel = screen.getByRole("tabpanel");
    expect(panel).toBeTruthy();

    // aria-controls on the active tab must point to the panel id
    const controls = farmTab.getAttribute("aria-controls");
    expect(controls).not.toBeNull();
    const panelId = panel.getAttribute("id");
    expect(panelId).not.toBeNull();
    expect(controls).toBe(panelId);
  });

  it("AppShell: tab inativa habilitada tem aria-controls que resolve para painel no DOM (keepMounted)", () => {
    const { container } = render(
      <AppShell ready={true} activeTab="farm" onTabChange={vi.fn()}>
        <div>farm content</div>
      </AppShell>,
    );
    // "Overview" is enabled but NOT the active tab (farm is active)
    const overviewTab = screen.getByRole("tab", { name: "Overview" });
    expect(overviewTab.getAttribute("aria-selected")).not.toBe("true");

    const controls = overviewTab.getAttribute("aria-controls");
    expect(controls).not.toBeNull();

    // Panel must exist in the DOM even though hidden (keepMounted keeps it mounted)
    // so aria-controls doesn't dangle — fixes the ARIA Tabs pattern gap
    const panel = container.ownerDocument.getElementById(controls!);
    expect(panel).not.toBeNull();
    expect(panel!.getAttribute("role")).toBe("tabpanel");
  });

  it("AppShell: tabs desabilitados têm aria-disabled=true (Base UI usa aria-disabled, não native disabled)", () => {
    render(
      <AppShell ready={true} activeTab="overview" onTabChange={vi.fn()}>
        <div>content</div>
      </AppShell>,
    );
    // "Loja", "Vender", "Histórico" are disabled ("Gear" was enabled in Task 2).
    // Base UI Tabs.Tab exposes disabled state via aria-disabled="true" on the composite item
    // (not the native HTML disabled attribute, so keyboard focus/navigation still works).
    const disabledTabs = screen
      .getAllByRole("tab")
      .filter(
        (el) =>
          el.getAttribute("aria-disabled") === "true" ||
          el.hasAttribute("disabled"),
      );
    expect(disabledTabs.length).toBe(3);
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
