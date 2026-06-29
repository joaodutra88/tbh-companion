"use client";

import React, { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { Recommendation } from "@tbh/engine";
import type { RuneCat } from "@/lib/rune-colors";
import { RuneTree, type RuneBounds } from "./rune-tree";
import { RuneLegend } from "./rune-legend";
import { RuneDetail } from "./rune-detail";

// ── RunesPane ───────────────────────────────────────────────────────────────
// Orquestra a aba Runas: árvore interativa (T1) + legenda/filtro de categoria +
// slider de orçamento + toggle do caminho de DPS (legenda) + painel de detalhe
// do nó selecionado. Os painéis de recomendadas/plano de gasto vêm em T3.
//
// Estado mora aqui (selectedKey/activeCat/budget/showDps); a árvore reage via
// props. Trocar orçamento só re-renderiza os nós que cruzam o limite; categoria
// e dps re-renderizam uma vez (ação deliberada). Hover continua 100% CSS.

/** Narrow seguro: rec.runeTree.bounds vem tipado como `unknown` (db.runeBounds). */
function asBounds(b: unknown): RuneBounds {
  if (b && typeof b === "object") {
    const o = b as Record<string, unknown>;
    if (
      typeof o.minX === "number" &&
      typeof o.maxX === "number" &&
      typeof o.minY === "number" &&
      typeof o.maxY === "number"
    ) {
      return { minX: o.minX, maxX: o.maxX, minY: o.minY, maxY: o.maxY };
    }
  }
  // Fallback defensivo — não deve acontecer com o DB real.
  return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
}

interface RunesPaneProps {
  rec: Recommendation;
}

export function RunesPane({ rec }: RunesPaneProps) {
  const { nodes, edges, bounds, firstDpsPath } = rec.runeTree;
  const gold = rec.runes.gold;

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<RuneCat | null>(null);
  const [showDps, setShowDps] = useState(true);

  // Contagens (status + categoria) e custo máximo entre os nós.
  const { statusCounts, catCounts, maxNodeCost } = useMemo(() => {
    const sc: Record<string, number> = {};
    const cc: Record<string, number> = {};
    let max = 0;
    for (const n of Object.values(nodes)) {
      sc[n.status] = (sc[n.status] ?? 0) + 1;
      cc[n.cat] = (cc[n.cat] ?? 0) + 1;
      if (n.cost != null && n.cost > max) max = n.cost;
    }
    return { statusCounts: sc, catCounts: cc, maxNodeCost: max };
  }, [nodes]);

  // Teto do slider = maior custo de nó; default = gold atual (limitado ao teto).
  const sliderMax = Math.max(1, Math.round(maxNodeCost));
  const [budget, setBudget] = useState(() =>
    Math.min(Math.round(gold), Math.max(1, Math.round(maxNodeCost))),
  );

  const selected = selectedKey ? nodes[selectedKey] ?? null : null;
  const nodeCount = Object.keys(nodes).length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 px-4 py-5 md:px-6 md:py-6">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-gold" aria-hidden="true" />
            <h1 className="font-display text-[20px] font-semibold tracking-[-0.01em] text-text">
              Árvore de runas
            </h1>
          </div>
          <p className="mt-0.5 text-[12px] text-dim tabular-nums">
            {nodeCount} nós · arraste pra mover, scroll ou + / − pra dar zoom
          </p>
        </div>
      </header>

      {/* Legenda + filtros (categoria, status, dps, orçamento) */}
      <RuneLegend
        catCounts={catCounts}
        statusCounts={statusCounts}
        activeCat={activeCat}
        onCatChange={setActiveCat}
        budget={budget}
        maxBudget={sliderMax}
        onBudgetChange={setBudget}
        showDps={showDps}
        onDpsToggle={() => setShowDps((v) => !v)}
      />

      {/* Árvore (ocupa o espaço restante) */}
      <div className="relative min-h-[440px] flex-1">
        <RuneTree
          nodes={nodes}
          edges={edges}
          bounds={asBounds(bounds)}
          firstDpsPath={firstDpsPath}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          budget={budget}
          activeCat={activeCat}
          showDps={showDps}
        />
      </div>

      {/* Detalhe do nó selecionado */}
      <RuneDetail node={selected} />
    </div>
  );
}
