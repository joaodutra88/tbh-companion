"use client";

import React, { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { Recommendation } from "@tbh/engine";
import type { RuneCat } from "@/lib/rune-colors";
import { fmt, fmtK, localized } from "@/lib/format";
import { useEntityLocale } from "@/lib/entity-locale";
import { statLabel } from "@/lib/stat-labels";
import { RuneTree, type RuneBounds } from "./rune-tree";
import { RuneLegend } from "./rune-legend";
import { RuneDetail } from "./rune-detail";
import { RunePanels } from "./rune-panels";

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
  const { locale } = useEntityLocale();
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

  // "Best rune" for the lead card: prioritize goldPlan cart → combat ROI → almostFree.
  const bestRune =
    rec.goldPlan.cart[0] ?? rec.runeROI[0] ?? rec.runes.almostFree[0] ?? null;
  const bestRuneIcon = bestRune
    ? (rec.runeTree.nodes[String(bestRune.key)]?.icon ?? null)
    : null;

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

      {/* ── Card "Próxima runa recomendada" ────────────────────────────────── */}
      {bestRune ? (
        <section
          aria-label="Próxima runa recomendada"
          className="relative overflow-hidden rounded-xl border border-gold/30 bg-gradient-to-br from-surface-2 via-surface to-surface px-5 py-4 shadow-[0_1px_0_0_rgba(232,176,75,0.12)_inset]"
        >
          {/* Gold hairline top accent */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"
          />
          {/* Ambient glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-gold/10 blur-3xl"
          />

          <div className="relative flex items-center gap-3">
            {/* Rune icon */}
            {bestRuneIcon ? (
              <img
                src={bestRuneIcon}
                alt=""
                aria-hidden="true"
                className="size-10 shrink-0 rounded-md"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : null}

            {/* Name + effect */}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                Próxima runa recomendada
              </p>
              <p className="mt-0.5 truncate text-[16px] font-semibold leading-snug text-text">
                {localized(bestRune.name, locale) || `Runa ${bestRune.key}`}
              </p>
              {bestRune.st ? (
                <p className="text-[12px] text-dim">{statLabel(bestRune.st)}</p>
              ) : null}
            </div>

            {/* Cost + ΔPOWER */}
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="text-[16px] font-semibold tabular-nums text-gold">
                {fmt(bestRune.cost)}
              </span>
              {bestRune.dPower > 0 ? (
                <span className="text-[12px] tabular-nums text-teal">
                  +{fmtK(bestRune.dPower)}
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedKey(String(bestRune.key))}
            className="relative mt-3 rounded border border-gold/40 bg-gold/10 px-3 py-1 text-[12px] font-medium text-gold transition-colors hover:bg-gold/20"
          >
            Ver na árvore
          </button>
        </section>
      ) : null}

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

      {/* Árvore + painel lateral (detalhe + recomendadas + plano de gasto) */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        {/* Árvore — ocupa o espaço restante */}
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

        {/* Painel lateral: detalhe do nó + recomendadas + plano de gasto */}
        <div className="flex w-full flex-col gap-3 md:w-80">
          <RuneDetail node={selected} />
          <RunePanels rec={rec} onSelect={setSelectedKey} />
        </div>
      </div>
    </div>
  );
}
