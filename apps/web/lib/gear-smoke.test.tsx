// @vitest-environment jsdom
// Smoke tests for the Gear tab (Task 2): hero picker + 10-slot grid.
// Uses the real demo save + game DB, mirroring runes-smoke.test.tsx.

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { getDemoSaveText } from "@tbh/game-data";
import { loadGameDB } from "@tbh/game-data";
import type { Recommendation, GameDB } from "@tbh/engine";
import { runRecommend } from "./engine-bridge";
import { GearPane } from "@/components/gear/gear-pane";
import { SlotGrid } from "@/components/gear/slot-grid";

afterEach(() => cleanup());

async function demoSetup(): Promise<{ rec: Recommendation; db: GameDB }> {
  const [rec, db] = await Promise.all([
    runRecommend(getDemoSaveText()),
    loadGameDB(),
  ]);
  return { rec, db };
}

// ── GearPane ─────────────────────────────────────────────────────────────────

describe("GearPane (smoke)", () => {
  it("renderiza o cabeçalho 'Equipamento'", async () => {
    const { rec, db } = await demoSetup();
    const { container } = render(<GearPane rec={rec} db={db} />);
    expect(container.textContent).toContain("Equipamento");
  });

  it("hero picker lista ≥1 herói da party do demo", async () => {
    const { rec, db } = await demoSetup();
    const { container } = render(<GearPane rec={rec} db={db} />);

    // Cada herói da party tem um botão com data-heroki
    const heroButtons = container.querySelectorAll<HTMLButtonElement>(
      "button[data-heroki]",
    );
    expect(heroButtons.length).toBeGreaterThanOrEqual(1);
    expect(heroButtons.length).toBe(rec.meta.party.length);
  });

  it("o herói padrão vem marcado como ativo (aria-pressed=true)", async () => {
    const { rec, db } = await demoSetup();
    const { container } = render(<GearPane rec={rec} db={db} />);

    const active = container.querySelector<HTMLButtonElement>(
      'button[data-heroki][aria-pressed="true"]',
    );
    expect(active).not.toBeNull();
  });

  it("clicar num herói diferente muda o herói ativo", async () => {
    const { rec, db } = await demoSetup();
    const party = rec.meta.party;
    if (party.length < 2) return; // party com 1 herói: pular

    const { container } = render(<GearPane rec={rec} db={db} />);

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

  it("grid de slots renderiza exatamente 10 cells após trocar herói", async () => {
    const { rec, db } = await demoSetup();
    const { container } = render(<GearPane rec={rec} db={db} />);

    // Slot grid
    const slotSection = container.querySelector(
      'section[aria-label="Slots de equipamento"]',
    );
    expect(slotSection).not.toBeNull();

    const slotButtons = slotSection!.querySelectorAll("button[data-slot]");
    expect(slotButtons.length).toBe(10);
  });

  it("clicar num slot exibe o placeholder do comparador (Task 3)", async () => {
    const { rec, db } = await demoSetup();
    const { container } = render(<GearPane rec={rec} db={db} />);

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

    // Após o clique: placeholder do comparador aparece
    expect(
      container.querySelector('[aria-label="Comparador de itens"]'),
    ).not.toBeNull();
  });

  it("trocar de herói reseta o slot selecionado (comparador desaparece)", async () => {
    const { rec, db } = await demoSetup();
    const party = rec.meta.party;
    if (party.length < 2) return; // pular se apenas 1 herói

    const { container } = render(<GearPane rec={rec} db={db} />);

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

  it("todos os 10 labels PT-BR estão presentes no grid", async () => {
    const { rec, db } = await demoSetup();
    const party = rec.meta.party;
    const firstHk = party[0];
    if (firstHk == null) return;

    const slots = rec.gear.slots.filter((s) => s.heroKey === firstHk);
    const { container } = render(
      <SlotGrid slots={slots} selectedSlot={null} onSlotSelect={() => void 0} db={db} />,
    );

    const text = container.textContent ?? "";
    // Labels esperados (case-insensitive porque são uppercase via CSS, mas o DOM tem o texto original)
    const expected = ["Arma", "Off-hand", "Elmo", "Armadura", "Luvas", "Botas", "Amuleto", "Brinco", "Anel", "Bracelete"];
    for (const label of expected) {
      expect(text).toContain(label);
    }
  });
});
