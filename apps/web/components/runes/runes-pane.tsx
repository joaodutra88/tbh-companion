"use client";

import React, { useMemo, useState } from "react";
import { Sparkles, MousePointerClick } from "lucide-react";
import type { Recommendation } from "@tbh/engine";
import { fmt, fmtK, fmtDur } from "@/lib/format";
import { RUNE_STATUS_LABEL, type RuneStatus } from "@/lib/rune-colors";
import { RuneTree, type RuneBounds } from "./rune-tree";

// ── RunesPane ───────────────────────────────────────────────────────────────
// Orquestra a aba Runas. Nesta task: a árvore interativa (T1) + um readout de
// detalhe placeholder do nó selecionado. Legenda/filtro/slider e o painel de
// detalhe completo + painéis de recomendadas vêm em T2/T3.

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

// Chaves de status p/ a legenda mínima (cor via utilitário do tema, não inline).
const STATUS_KEY: { status: RuneStatus; dot: string }[] = [
  { status: "recommended", dot: "bg-gold" },
  { status: "almostfree", dot: "border border-gold bg-surface-2" },
  { status: "owned", dot: "bg-teal" },
  { status: "maxed", dot: "bg-teal/40" },
  { status: "available", dot: "border border-line bg-surface-2" },
  { status: "locked", dot: "border border-line bg-surface-2/40" },
  { status: "skip", dot: "bg-coral/50" },
];

interface StatusKeyProps {
  counts: Record<string, number>;
}

function StatusKey({ counts }: StatusKeyProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {STATUS_KEY.map(({ status, dot }) => (
        <span key={status} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={`size-2.5 rounded-full ${dot}`} />
          <span className="text-[11px] text-dim">
            {RUNE_STATUS_LABEL[status]}
            {counts[status] ? (
              <span className="ml-1 tabular-nums text-dim/60">{counts[status]}</span>
            ) : null}
          </span>
        </span>
      ))}
    </div>
  );
}

// ── Detalhe placeholder ──

interface DetailBarProps {
  node: Recommendation["runeTree"]["nodes"][string] | null;
}

function DetailBar({ node }: DetailBarProps) {
  if (!node) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-[12px] text-dim">
        <MousePointerClick className="size-3.5 shrink-0 text-dim" aria-hidden="true" />
        Clique num nó pra ver custo, stat, ΔPOWER e tempo de farm.
      </div>
    );
  }

  const statusLabel =
    RUNE_STATUS_LABEL[node.status as RuneStatus] ?? node.status;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-line bg-surface px-4 py-3">
      <div className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wider text-dim">
          {statusLabel}
        </span>
        <span className="text-[15px] font-semibold leading-tight text-text">
          {node.name ?? "Runa"}
        </span>
      </div>
      {node.cost != null ? (
        <Field label="Custo" value={fmt(node.cost)} accent="text-gold" />
      ) : null}
      {node.dPower != null && node.dPower > 0 ? (
        <Field label="ΔPOWER" value={fmtK(node.dPower)} accent="text-teal" />
      ) : null}
      <Field
        label="Nível"
        value={`${node.level}${node.max > 0 ? ` / ${node.max}` : ""}`}
        accent="text-text"
      />
      {node.farmSeconds != null ? (
        <Field label="Farm" value={fmtDur(node.farmSeconds)} accent="text-dim" />
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-medium uppercase tracking-wider text-dim">
        {label}
      </span>
      <span className={`text-[15px] font-semibold tabular-nums leading-tight ${accent}`}>
        {value}
      </span>
    </div>
  );
}

// ── RunesPane ──

interface RunesPaneProps {
  rec: Recommendation;
}

export function RunesPane({ rec }: RunesPaneProps) {
  const { nodes, edges, bounds, firstDpsPath } = rec.runeTree;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = selectedKey ? nodes[selectedKey] ?? null : null;

  const counts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const n of Object.values(nodes)) acc[n.status] = (acc[n.status] ?? 0) + 1;
    return acc;
  }, [nodes]);

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
        <StatusKey counts={counts} />
      </header>

      {/* Árvore (ocupa o espaço restante) */}
      <div className="relative min-h-[440px] flex-1">
        <RuneTree
          nodes={nodes}
          edges={edges}
          bounds={asBounds(bounds)}
          firstDpsPath={firstDpsPath}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
        />
      </div>

      {/* Detalhe placeholder do nó selecionado */}
      <DetailBar node={selected} />
    </div>
  );
}
