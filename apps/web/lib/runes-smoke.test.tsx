// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { getDemoSaveText } from "@tbh/game-data";
import type { Recommendation } from "@tbh/engine";
import { fmt, localized } from "./format";
import { runRecommend } from "./engine-bridge";
import { RunesPane } from "@/components/runes/runes-pane";

afterEach(() => cleanup());

async function demoRec(): Promise<Recommendation> {
  return runRecommend(getDemoSaveText());
}

describe("RunesPane (smoke)", () => {
  it("renderiza um <svg> com ~197 nós (circle) e ≥100 arestas (line) do demo real", async () => {
    const rec = await demoRec();
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

  it("começa sem nó selecionado (mostra a dica de hover/clique)", async () => {
    const rec = await demoRec();
    const { container } = render(<RunesPane rec={rec} />);
    expect(container.textContent).toContain("Passe o mouse ou clique num nó");
  });

  it("clicar num nó popula o detalhe (nome + custo do nó)", async () => {
    const rec = await demoRec();
    // Um nó concreto com nome e custo (comprável). Nomes não são únicos →
    // identificamos pela chave (data-key) em vez do aria-label.
    const entry = Object.entries(rec.runeTree.nodes).find(
      ([, n]) => n.cost != null && localized(n.name).length > 0,
    );
    expect(entry).toBeDefined();
    const [key, node] = entry!;

    const { container } = render(<RunesPane rec={rec} />);
    const target = container.querySelector(`g.rune-node[data-key="${key}"]`);
    expect(target).not.toBeNull();

    fireEvent.click(target!);

    // A dica some e nome + custo formatado do nó aparecem no detalhe.
    expect(container.textContent).not.toContain("Passe o mouse ou clique");
    expect(container.textContent).toContain(localized(node.name));
    expect(container.textContent).toContain(fmt(node.cost!));
  });

  it("ativar um chip de categoria esmaece os nós das demais (data-dimmed)", async () => {
    const rec = await demoRec();
    const { container, getByRole } = render(<RunesPane rec={rec} />);

    // Sem filtro: nenhum nó esmaecido por categoria.
    expect(container.querySelectorAll('[data-dimmed="true"]').length).toBe(0);

    // Ativa "Combate" → nós de outras categorias ganham data-dimmed.
    fireEvent.click(getByRole("button", { name: /Combate/ }));
    expect(
      container.querySelectorAll('[data-dimmed="true"]').length,
    ).toBeGreaterThan(0);
  });

  it("expõe o slider de orçamento", async () => {
    const rec = await demoRec();
    const { getByLabelText } = render(<RunesPane rec={rec} />);
    const slider = getByLabelText("Orçamento em gold") as HTMLInputElement;
    expect(slider).toBeDefined();
    expect(slider.type).toBe("range");
  });

  it("o toggle do caminho de DPS está presente e alterna", async () => {
    const rec = await demoRec();
    const { getByRole } = render(<RunesPane rec={rec} />);
    const toggle = getByRole("button", { name: /Caminho de DPS/ });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });
});
