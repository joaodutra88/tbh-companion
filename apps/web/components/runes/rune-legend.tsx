"use client";

import React, { useCallback } from "react";
import { Route, Wallet } from "lucide-react";
import { fmt } from "@/lib/format";
import {
  RUNE_CATS,
  RUNE_CAT_LABEL,
  RUNE_STATUSES,
  RUNE_STATUS_LABEL,
  RUNE_STATUS_DOT,
  type RuneCat,
} from "@/lib/rune-colors";

// ── RuneLegend ────────────────────────────────────────────────────────────────
// Controles + legenda da árvore: (a) chips de categoria (filtro com contagem),
// (b) legenda de status (cor → significado) + caminho de DPS (toggle), (c)
// slider de orçamento (habilitar até X gold). Tudo client-side; o pai (RunesPane)
// guarda o estado e a árvore reage via props (sem mexer no engine).

interface RuneLegendProps {
  /** Contagem de nós por categoria. */
  catCounts: Record<string, number>;
  /** Contagem de nós por status (legenda). */
  statusCounts: Record<string, number>;
  /** Categoria ativa (null = todas). */
  activeCat: RuneCat | null;
  onCatChange: (cat: RuneCat | null) => void;
  /** Orçamento atual + teto do slider (custo máximo entre os nós). */
  budget: number;
  maxBudget: number;
  onBudgetChange: (budget: number) => void;
  /** Realce do caminho de DPS ligado/desligado. */
  showDps: boolean;
  onDpsToggle: () => void;
}

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function Chip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active
          ? "border-gold bg-gold/15 text-gold"
          : "border-line bg-surface-2 text-dim hover:border-line/80 hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

export function RuneLegend({
  catCounts,
  statusCounts,
  activeCat,
  onCatChange,
  budget,
  maxBudget,
  onBudgetChange,
  showDps,
  onDpsToggle,
}: RuneLegendProps) {
  const onSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onBudgetChange(Number(e.target.value));
    },
    [onBudgetChange],
  );

  // Passo do slider: ~200 paradas, mínimo 1 (custos são inteiros de gold).
  const step = Math.max(1, Math.floor(maxBudget / 200));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-4 py-3">
      {/* (a) Chips de categoria — filtro */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-dim">
          Categoria
        </span>
        <Chip active={activeCat === null} onClick={() => onCatChange(null)}>
          Todas
        </Chip>
        {RUNE_CATS.map((cat) => (
          <Chip
            key={cat}
            active={activeCat === cat}
            onClick={() => onCatChange(activeCat === cat ? null : cat)}
          >
            {RUNE_CAT_LABEL[cat]}
            {catCounts[cat] ? (
              <span className="ml-1 tabular-nums opacity-60">
                {catCounts[cat]}
              </span>
            ) : null}
          </Chip>
        ))}
      </div>

      {/* (b) Legenda de status + caminho de DPS (toggle) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {RUNE_STATUSES.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`size-2.5 rounded-full ${RUNE_STATUS_DOT[status]}`}
            />
            <span className="text-[11px] text-dim">
              {RUNE_STATUS_LABEL[status]}
              {statusCounts[status] ? (
                <span className="ml-1 tabular-nums text-dim">
                  {statusCounts[status]}
                </span>
              ) : null}
            </span>
          </span>
        ))}
        <button
          type="button"
          onClick={onDpsToggle}
          aria-pressed={showDps}
          title="Realçar o caminho de DPS mais barato"
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
            showDps
              ? "border-gold/60 text-gold"
              : "border-line text-dim hover:text-text"
          }`}
        >
          <Route className="size-3" aria-hidden="true" />
          Caminho de DPS
        </button>
      </div>

      {/* (c) Slider de orçamento */}
      <div className="flex items-center gap-3">
        <Wallet className="size-3.5 shrink-0 text-dim" aria-hidden="true" />
        <label
          htmlFor="rune-budget"
          className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-dim"
        >
          Habilitar até
        </label>
        <input
          id="rune-budget"
          type="range"
          min={0}
          max={maxBudget}
          step={step}
          value={Math.min(budget, maxBudget)}
          onChange={onSlider}
          aria-label="Orçamento em gold"
          aria-valuetext={`até ${fmt(Math.min(budget, maxBudget))} gold`}
          className="h-1.5 w-full max-w-xs cursor-pointer accent-gold"
        />
        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-gold">
          {fmt(budget)}
        </span>
      </div>
    </div>
  );
}
