// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { getDemoSaveText } from "@tbh/game-data";
import type { Recommendation } from "@tbh/engine";
import { fmt, localized } from "./format";
import { runRecommend } from "./engine-bridge";
import { RunesPane } from "@/components/runes/runes-pane";
import { RunePanels } from "@/components/runes/rune-panels";

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
    expect(container.textContent).toContain("Clique num nó da árvore");
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
    expect(container.textContent).not.toContain("Clique num nó da árvore");
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

describe("RunePanels (smoke)", () => {
  it("mostra ≥1 runa recomendada com nome localizado", async () => {
    const rec = await demoRec();
    const { container } = render(
      <RunePanels rec={rec} onSelect={vi.fn()} />,
    );

    // Pelo menos almostFree ou runeROI deve ter itens.
    const almostFree = rec.runes.almostFree.slice(0, 8);
    const roi = rec.runeROI.slice(0, 6);
    const source = almostFree.length > 0 ? almostFree : roi;
    expect(source.length).toBeGreaterThan(0);

    // O nome localizado do primeiro item deve aparecer no painel.
    const firstName = localized(source[0]!.name);
    expect(firstName.length).toBeGreaterThan(0);
    expect(container.textContent).toContain(firstName);
  });

  it("clicar numa runa recomendada chama onSelect com a chave da runa (string)", async () => {
    const rec = await demoRec();
    const onSelect = vi.fn();
    const { container } = render(<RunePanels rec={rec} onSelect={onSelect} />);

    // O primeiro botão de runa (almostFree ou ROI) dispara onSelect.
    const buttons = container.querySelectorAll<HTMLButtonElement>(
      'section[aria-label="Recomendadas"] button',
    );
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]!);
    expect(onSelect).toHaveBeenCalledOnce();
    // A chave é sempre uma string (String(r.key)).
    expect(typeof onSelect.mock.calls[0][0]).toBe("string");
  });

  it("mostra os totais do plano de gasto ou mensagem de vazio", async () => {
    const rec = await demoRec();
    const { container } = render(
      <RunePanels rec={rec} onSelect={vi.fn()} />,
    );

    if (rec.goldPlan.cart.length > 0) {
      // Custo total formatado deve estar presente.
      expect(container.textContent).toContain(fmt(rec.goldPlan.totalCost));
    } else {
      expect(container.textContent).toContain("Nada a comprar agora");
    }
  });

  it("botão 'ver na árvore' chama onSelect com o target do caminho de DPS", async () => {
    const rec = await demoRec();
    if (!rec.runes.firstDpsPath) return; // caminho ausente no demo — pular

    const onSelect = vi.fn();
    const { getByRole } = render(<RunePanels rec={rec} onSelect={onSelect} />);

    const btn = getByRole("button", { name: /ver na árvore/ });
    fireEvent.click(btn);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect.mock.calls[0][0]).toBe(
      String(rec.runes.firstDpsPath.target),
    );
  });
});
