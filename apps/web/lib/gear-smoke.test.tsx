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
    const texts = Array.from(dpowSpans).map((el) => el.textContent ?? "");
    expect(texts.some((t) => t !== "" && t !== "0")).toBe(true);
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
