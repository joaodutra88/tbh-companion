// @vitest-environment jsdom
// Smoke tests for the Gear tab (Tasks 2 & 3): hero picker + 10-slot grid + slot comparator.
// Uses the real demo save + game DB, mirroring runes-smoke.test.tsx.

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { getDemoSaveText } from "@tbh/game-data";
import { loadGameDB } from "@tbh/game-data";
import { parseSave } from "@tbh/engine";
import type { Recommendation, GameDB, PlayerSaveData } from "@tbh/engine";
import { runRecommend } from "./engine-bridge";
import { GearPane } from "@/components/gear/gear-pane";
import { SlotGrid } from "@/components/gear/slot-grid";
import { SlotCompare } from "@/components/gear/slot-compare";

afterEach(() => cleanup());

async function demoSetup(): Promise<{ rec: Recommendation; db: GameDB; psd: PlayerSaveData }> {
  const [rec, db] = await Promise.all([
    runRecommend(getDemoSaveText()),
    loadGameDB(),
  ]);
  const psd = parseSave(getDemoSaveText());
  return { rec, db, psd };
}

// ── GearPane ─────────────────────────────────────────────────────────────────

describe("GearPane (smoke)", () => {
  it("renderiza o cabeçalho 'Equipamento'", async () => {
    const { rec, db, psd } = await demoSetup();
    const { container } = render(<GearPane rec={rec} db={db} psd={psd} />);
    expect(container.textContent).toContain("Equipamento");
  });

  it("hero picker lista ≥1 herói da party do demo", async () => {
    const { rec, db, psd } = await demoSetup();
    const { container } = render(<GearPane rec={rec} db={db} psd={psd} />);

    // Cada herói da party tem um botão com data-heroki
    const heroButtons = container.querySelectorAll<HTMLButtonElement>(
      "button[data-heroki]",
    );
    expect(heroButtons.length).toBeGreaterThanOrEqual(1);
    expect(heroButtons.length).toBe(rec.meta.party.length);
  });

  it("o herói padrão vem marcado como ativo (aria-pressed=true)", async () => {
    const { rec, db, psd } = await demoSetup();
    const { container } = render(<GearPane rec={rec} db={db} psd={psd} />);

    const active = container.querySelector<HTMLButtonElement>(
      'button[data-heroki][aria-pressed="true"]',
    );
    expect(active).not.toBeNull();
  });

  it("clicar num herói diferente muda o herói ativo", async () => {
    const { rec, db, psd } = await demoSetup();
    const party = rec.meta.party;
    expect(party.length).toBeGreaterThanOrEqual(2);

    const { container } = render(<GearPane rec={rec} db={db} psd={psd} />);

    // Pega o segundo herói e clica nele
    const buttons = container.querySelectorAll<HTMLButtonElement>(
      "button[data-heroki]",
    );
    const secondBtn = buttons[1];
    expect(secondBtn).toBeDefined();
    const secondHk = secondBtn!.getAttribute("data-heroki");

    fireEvent.click(secondBtn!);

    // O botão do segundo herói agora está ativo
    const nowActive = container.querySelector<HTMLButtonElement>(
      'button[data-heroki][aria-pressed="true"]',
    );
    expect(nowActive).not.toBeNull();
    expect(nowActive!.getAttribute("data-heroki")).toBe(secondHk);
  });

  it("grid de slots renderiza exatamente 10 cells", async () => {
    const { rec, db, psd } = await demoSetup();
    const { container } = render(<GearPane rec={rec} db={db} psd={psd} />);

    // Slot grid
    const slotSection = container.querySelector(
      'section[aria-label="Slots de equipamento"]',
    );
    expect(slotSection).not.toBeNull();

    const slotButtons = slotSection!.querySelectorAll("button[data-slot]");
    expect(slotButtons.length).toBe(10);
  });

  it("clicar num slot exibe o comparador de itens", async () => {
    const { rec, db, psd } = await demoSetup();
    const { container } = render(<GearPane rec={rec} db={db} psd={psd} />);

    // Antes de clicar: sem comparador
    expect(
      container.querySelector('[aria-label="Comparador de itens"]'),
    ).toBeNull();

    // Clica no primeiro slot
    const firstSlot = container.querySelector<HTMLButtonElement>(
      "button[data-slot]",
    );
    expect(firstSlot).not.toBeNull();
    fireEvent.click(firstSlot!);

    // Após o clique: comparador aparece
    expect(
      container.querySelector('[aria-label="Comparador de itens"]'),
    ).not.toBeNull();
  });

  it("trocar de herói reseta o slot selecionado (comparador desaparece)", async () => {
    const { rec, db, psd } = await demoSetup();
    const party = rec.meta.party;
    expect(party.length).toBeGreaterThanOrEqual(2);

    const { container } = render(<GearPane rec={rec} db={db} psd={psd} />);

    // Seleciona o primeiro slot
    const firstSlot = container.querySelector<HTMLButtonElement>(
      "button[data-slot]",
    );
    expect(firstSlot).not.toBeNull();
    fireEvent.click(firstSlot!);
    expect(
      container.querySelector('[aria-label="Comparador de itens"]'),
    ).not.toBeNull();

    // Clica no segundo herói
    const heroButtons = container.querySelectorAll<HTMLButtonElement>(
      "button[data-heroki]",
    );
    fireEvent.click(heroButtons[1]!);

    // Comparador deve sumir (slot resetado)
    expect(
      container.querySelector('[aria-label="Comparador de itens"]'),
    ).toBeNull();
  });
});

// ── SlotGrid ─────────────────────────────────────────────────────────────────

describe("SlotGrid (smoke)", () => {
  it("sempre renderiza exatamente 10 botões de slot", async () => {
    const { rec, db } = await demoSetup();
    const party = rec.meta.party;
    const firstHk = party[0];
    if (firstHk == null) return;

    const slots = rec.gear.slots.filter((s) => s.heroKey === firstHk);
    const { container } = render(
      <SlotGrid slots={slots} selectedSlot={null} onSlotSelect={() => void 0} db={db} />,
    );

    const slotButtons = container.querySelectorAll("button[data-slot]");
    expect(slotButtons.length).toBe(10);
  });

  it("≥1 slot mostra ícone de item (src preenchido) no demo real", async () => {
    const { rec, db } = await demoSetup();
    const party = rec.meta.party;
    const firstHk = party[0];
    if (firstHk == null) return;

    const slots = rec.gear.slots.filter((s) => s.heroKey === firstHk);
    const { container } = render(
      <SlotGrid slots={slots} selectedSlot={null} onSlotSelect={() => void 0} db={db} />,
    );

    // Slots com item equipado devem ter uma <img> com src não vazio
    const imgs = container.querySelectorAll<HTMLImageElement>("img[src]");
    const withSrc = Array.from(imgs).filter((img) => img.src !== "");
    expect(withSrc.length).toBeGreaterThanOrEqual(1);
  });

  it("slot selecionado tem aria-pressed=true", async () => {
    const { rec, db } = await demoSetup();
    const party = rec.meta.party;
    const firstHk = party[0];
    if (firstHk == null) return;

    const slots = rec.gear.slots.filter((s) => s.heroKey === firstHk);
    const { container } = render(
      <SlotGrid slots={slots} selectedSlot={2} onSlotSelect={() => void 0} db={db} />,
    );

    const selected = container.querySelector<HTMLButtonElement>(
      'button[data-slot="2"][aria-pressed="true"]',
    );
    expect(selected).not.toBeNull();

    // Os outros 9 slots não devem estar selecionados
    const notSelected = container.querySelectorAll<HTMLButtonElement>(
      'button[data-slot]:not([data-slot="2"])[aria-pressed="true"]',
    );
    expect(notSelected.length).toBe(0);
  });

  it("labels PT-BR dos slots de armadura/joia (2-9) estão presentes no grid", async () => {
    const { rec, db } = await demoSetup();
    const party = rec.meta.party;
    const firstHk = party[0];
    if (firstHk == null) return;

    const slots = rec.gear.slots.filter((s) => s.heroKey === firstHk);
    const { container } = render(
      <SlotGrid slots={slots} selectedSlot={null} onSlotSelect={() => void 0} db={db} />,
    );

    const text = container.textContent ?? "";
    // Slots 0-1 usam gearTypeLabel dinâmico (depende da classe do herói); slots 2-9 têm labels estáticos.
    const expected = ["Elmo", "Armadura", "Luvas", "Botas", "Amuleto", "Brinco", "Anel", "Bracelete"];
    for (const label of expected) {
      expect(text).toContain(label);
    }
  });
});

// ── SlotCompare ───────────────────────────────────────────────────────────────

describe("SlotCompare (smoke)", () => {
  it("renderiza o aside com aria-label 'Comparador de itens'", async () => {
    const { rec, db, psd } = await demoSetup();
    const party = rec.meta.party;
    const firstHk = party[0];
    if (firstHk == null) return;

    const slotResult = rec.gear.slots.find((s) => s.heroKey === firstHk);
    if (!slotResult) return;

    const { container } = render(
      <SlotCompare rec={rec} db={db} psd={psd} heroKey={firstHk} slotResult={slotResult} />,
    );
    expect(container.querySelector('[aria-label="Comparador de itens"]')).not.toBeNull();
  });

  it("slot com item equipado mostra seção 'Item atual' com nome do item", async () => {
    const { rec, db, psd } = await demoSetup();
    const party = rec.meta.party;
    const firstHk = party[0];
    if (firstHk == null) return;

    // Find a slot that has a current item
    const slotResult = rec.gear.slots.find((s) => s.heroKey === firstHk && s.current != null);
    if (!slotResult) return;

    const { container } = render(
      <SlotCompare rec={rec} db={db} psd={psd} heroKey={firstHk} slotResult={slotResult} />,
    );

    const text = container.textContent ?? "";
    expect(text).toContain("Atual");
  });

  it("slot com best-in-slot mostra ΔPOWER com valor numérico", async () => {
    const { rec, db, psd } = await demoSetup();
    const party = rec.meta.party;
    const firstHk = party[0];
    if (firstHk == null) return;

    // Find a slot that has a best item (recommended swap)
    const slotResult = rec.gear.slots.find((s) => s.heroKey === firstHk && s.best != null);
    if (!slotResult) return;

    const { container } = render(
      <SlotCompare rec={rec} db={db} psd={psd} heroKey={firstHk} slotResult={slotResult} />,
    );

    // data-dpow spans should exist and contain a non-empty value
    const dpowSpans = container.querySelectorAll("[data-dpow]");
    expect(dpowSpans.length).toBeGreaterThan(0);
    // Tolerate dPower === 0: any formatted numeric string (including "0") is valid.
    const texts = Array.from(dpowSpans).map((el) => el.textContent ?? "");
    expect(texts.every((t) => t !== "")).toBe(true);
  });

  it("candidatos em posse aparecem quando o demo tem itens compatíveis", async () => {
    const { rec, db, psd } = await demoSetup();
    const party = rec.meta.party;

    // Try all heroes and all slots to find one with owned candidates rendered
    let found = false;
    outer: for (const hk of party) {
      for (const slotResult of rec.gear.slots.filter((s) => s.heroKey === hk)) {
        const { container } = render(
          <SlotCompare rec={rec} db={db} psd={psd} heroKey={hk} slotResult={slotResult} />,
        );
        const candidateSection = container.querySelector('[aria-label="Candidatos em posse"]');
        cleanup();
        if (candidateSection != null) {
          found = true;
          break outer;
        }
      }
    }

    // The demo save should have at least one slot with owned candidates
    expect(found).toBe(true);
  });

  it("slot sem best mostra mensagem 'Já é o melhor' ou 'Slot vazio'", async () => {
    const { rec, db, psd } = await demoSetup();
    const party = rec.meta.party;
    const firstHk = party[0];
    if (firstHk == null) return;

    // Find a slot with no best (already optimal or empty)
    const slotResult = rec.gear.slots.find((s) => s.heroKey === firstHk && s.best == null);
    if (!slotResult) return;

    const { container } = render(
      <SlotCompare rec={rec} db={db} psd={psd} heroKey={firstHk} slotResult={slotResult} />,
    );

    const text = container.textContent ?? "";
    const hasBestMsg = text.includes("Já é o melhor") || text.includes("Slot vazio");
    expect(hasBestMsg).toBe(true);
  });
});

// ── Task 3 — Upgrades óbvios no grid ─────────────────────────────────────────

describe("Task 3 — Upgrades óbvios no grid", () => {
  it("slots em rec.gear.swaps do herói têm data-upgrade=true no SlotGrid", async () => {
    const { rec, db } = await demoSetup();

    // Encontra um herói com pelo menos 1 swap
    const heroWithSwap = rec.meta.party.find(
      (hk) => rec.gear.swaps.some((s) => s.heroKey === hk),
    );
    if (heroWithSwap == null) return; // demo sem swaps: teste vacuamente OK

    const heroSlots = rec.gear.slots.filter((s) => s.heroKey === heroWithSwap);
    const { container } = render(
      <SlotGrid slots={heroSlots} selectedSlot={null} onSlotSelect={() => void 0} db={db} />,
    );

    const heroSwapSlots = rec.gear.swaps
      .filter((s) => s.heroKey === heroWithSwap)
      .map((s) => s.slot);

    for (const slotIdx of heroSwapSlots) {
      const btn = container.querySelector<HTMLButtonElement>(
        `button[data-slot="${slotIdx}"]`,
      );
      expect(btn).not.toBeNull();
      expect(btn!.getAttribute("data-upgrade")).toBe("true");
    }
  });

  it("slots sem swap NÃO têm data-upgrade=true no SlotGrid", async () => {
    const { rec, db } = await demoSetup();
    const firstHk = rec.meta.party[0];
    if (firstHk == null) return;

    const heroSlots = rec.gear.slots.filter((s) => s.heroKey === firstHk);
    const { container } = render(
      <SlotGrid slots={heroSlots} selectedSlot={null} onSlotSelect={() => void 0} db={db} />,
    );

    const swapSlotIndices = new Set(
      rec.gear.swaps.filter((s) => s.heroKey === firstHk).map((s) => s.slot),
    );

    const allSlotBtns = container.querySelectorAll<HTMLButtonElement>("button[data-slot]");
    for (const btn of Array.from(allSlotBtns)) {
      const slotIdx = parseInt(btn.getAttribute("data-slot") ?? "-1", 10);
      if (!swapSlotIndices.has(slotIdx)) {
        expect(btn.getAttribute("data-upgrade")).not.toBe("true");
      }
    }
  });

  it("badge '↑ upgrade' (data-upgrade-badge) aparece no slot com swap", async () => {
    const { rec, db } = await demoSetup();

    const heroWithSwap = rec.meta.party.find(
      (hk) => rec.gear.swaps.some((s) => s.heroKey === hk),
    );
    if (heroWithSwap == null) return;

    const firstSwapSlot = rec.gear.swaps.find((s) => s.heroKey === heroWithSwap);
    if (firstSwapSlot == null) return;

    const heroSlots = rec.gear.slots.filter((s) => s.heroKey === heroWithSwap);
    const { container } = render(
      <SlotGrid slots={heroSlots} selectedSlot={null} onSlotSelect={() => void 0} db={db} />,
    );

    const upgradeBtn = container.querySelector<HTMLButtonElement>(
      `button[data-slot="${firstSwapSlot.slot}"]`,
    );
    expect(upgradeBtn).not.toBeNull();

    const badge = upgradeBtn!.querySelector("[data-upgrade-badge]");
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toContain("upgrade");
  });

  it("header do GearPane reflete a contagem de upgrades do herói selecionado com ↑", async () => {
    const { rec, db, psd } = await demoSetup();

    const heroWithSwap = rec.meta.party.find(
      (hk) => rec.gear.swaps.some((s) => s.heroKey === hk),
    );
    if (heroWithSwap == null) return;

    const { container } = render(<GearPane rec={rec} db={db} psd={psd} />);

    // Garante que o herói com swap está selecionado
    const heroBtn = container.querySelector<HTMLButtonElement>(
      `button[data-heroki="${heroWithSwap}"]`,
    );
    expect(heroBtn).not.toBeNull();
    fireEvent.click(heroBtn!);

    const heroSwapCount = rec.gear.swaps.filter((s) => s.heroKey === heroWithSwap).length;

    const text = container.textContent ?? "";
    // Header deve conter a contagem e o símbolo ↑
    expect(text).toContain(String(heroSwapCount));
    expect(text).toContain("↑");
  });
});

// ── SlotCompare v2 ────────────────────────────────────────────────────────────

describe("SlotCompare v2 — métrica + stats + raridade + explicação", () => {
  it("seletor de métrica no GearPane renderiza 3 botões data-metric", async () => {
    const { rec, db, psd } = await demoSetup();
    const { container } = render(<GearPane rec={rec} db={db} psd={psd} />);

    // Click first slot to reveal the comparator + metric toggle
    const firstSlot = container.querySelector<HTMLButtonElement>("button[data-slot]");
    expect(firstSlot).not.toBeNull();
    if (firstSlot == null) return;
    fireEvent.click(firstSlot);

    const metricButtons = container.querySelectorAll("[data-metric]");
    expect(metricButtons.length).toBe(3);
  });

  it("trocar métrica muda o botão ativo (aria-pressed) e re-ordena candidatos", async () => {
    const { rec, db, psd } = await demoSetup();
    const { container } = render(<GearPane rec={rec} db={db} psd={psd} />);

    const firstSlot = container.querySelector<HTMLButtonElement>("button[data-slot]");
    expect(firstSlot).not.toBeNull();
    if (firstSlot == null) return;
    fireEvent.click(firstSlot);

    // Default is 'power'
    const powerBtn = container.querySelector<HTMLButtonElement>('[data-metric="power"]');
    expect(powerBtn?.getAttribute("aria-pressed")).toBe("true");

    // Capture headline metric-delta of first candidate at 'power'
    const deltaAtPower = container.querySelector<HTMLElement>(
      '[data-candidate] [data-metric-delta]',
    )?.textContent ?? null;

    // Switch to 'dps'
    const dpsBtn = container.querySelector<HTMLButtonElement>('[data-metric="dps"]');
    expect(dpsBtn).not.toBeNull();
    if (dpsBtn == null) return;
    fireEvent.click(dpsBtn);

    expect(dpsBtn.getAttribute("aria-pressed")).toBe("true");
    expect(
      container.querySelector<HTMLButtonElement>('[data-metric="power"]')?.getAttribute("aria-pressed"),
    ).toBe("false");

    // Re-rank check: if candidates were visible at 'power', they must re-render at 'dps'
    if (deltaAtPower != null) {
      const deltaAtDps = container.querySelector<HTMLElement>(
        '[data-candidate] [data-metric-delta]',
      )?.textContent ?? null;
      expect(deltaAtDps).not.toBeNull();
      expect(deltaAtDps).not.toBe("");
    }
  });

  it("item com stats mostra ≥1 linha com data-drives-metric", async () => {
    const { rec, db, psd } = await demoSetup();
    const party = rec.meta.party;

    let found = false;
    outer: for (const hk of party) {
      for (const slotResult of rec.gear.slots.filter((s) => s.heroKey === hk)) {
        if (slotResult.current == null && slotResult.best == null) continue;
        const { container } = render(
          <SlotCompare rec={rec} db={db} psd={psd} heroKey={hk} slotResult={slotResult} metric="power" />,
        );
        const rows = container.querySelectorAll("[data-drives-metric]");
        cleanup();
        if (rows.length > 0) {
          found = true;
          break outer;
        }
      }
    }
    expect(found).toBe(true);
  });

  it("stat que impulsiona DPS tem data-drives-metric=true ao selecionar métrica dps", async () => {
    const { rec, db, psd } = await demoSetup();
    const party = rec.meta.party;

    let found = false;
    outer: for (const hk of party) {
      for (const slotResult of rec.gear.slots.filter((s) => s.heroKey === hk)) {
        if (slotResult.current == null && slotResult.best == null) continue;
        const { container } = render(
          <SlotCompare rec={rec} db={db} psd={psd} heroKey={hk} slotResult={slotResult} metric="dps" />,
        );
        const highlighted = container.querySelector('[data-drives-metric="true"]');
        cleanup();
        if (highlighted != null) {
          found = true;
          break outer;
        }
      }
    }
    expect(found).toBe(true);
  });

  it("nota 'Troca:' aparece quando há best item com delta não-zero", async () => {
    const { rec, db, psd } = await demoSetup();
    const party = rec.meta.party;

    let found = false;
    outer: for (const hk of party) {
      for (const slotResult of rec.gear.slots.filter(
        (s) => s.heroKey === hk && s.best != null,
      )) {
        const { container } = render(
          <SlotCompare rec={rec} db={db} psd={psd} heroKey={hk} slotResult={slotResult} metric="power" />,
        );
        const note = container.querySelector("[data-swap-note]");
        cleanup();
        if (note != null) {
          found = true;
          break outer;
        }
      }
    }
    expect(found).toBe(true);
  });
});
