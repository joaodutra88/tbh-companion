"use client";

import React from "react";
import { MousePointerClick } from "lucide-react";
import type { Recommendation } from "@tbh/engine";
import { fmt, fmtK, fmtDur, localized } from "@/lib/format";
import { statLabel } from "@/lib/stat-labels";
import {
  RUNE_STATUS_LABEL,
  RUNE_STATUS_DOT,
  catLabel,
  type RuneStatus,
} from "@/lib/rune-colors";

// ── RuneDetail ────────────────────────────────────────────────────────────────
// Painel de detalhe do nó selecionado. Mostra nome, categoria, status (chip
// colorido), nível/max, custo (mono), efeito (`st` + `value`), ΔPOWER e tempo
// de farm. Sem nó → dica de interação. Componente "burro": só lê o nó.

type RuneNodeData = Recommendation["runeTree"]["nodes"][string];

interface RuneDetailProps {
  node: RuneNodeData | null;
}

function Field({
  label,
  value,
  accent = "text-text",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-medium uppercase tracking-wider text-dim">
        {label}
      </span>
      <span
        className={`text-[15px] font-semibold tabular-nums leading-tight ${accent}`}
      >
        {value}
      </span>
    </div>
  );
}

export function RuneDetail({ node }: RuneDetailProps) {
  if (!node) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-[12px] text-dim">
        <MousePointerClick
          className="size-3.5 shrink-0 text-dim"
          aria-hidden="true"
        />
        Clique num nó da árvore.
      </div>
    );
  }

  const status = node.status as RuneStatus;
  const statusLabel = RUNE_STATUS_LABEL[status] ?? node.status;
  const statusDot = RUNE_STATUS_DOT[status] ?? "bg-dim/40";

  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3">
      {/* Cabeçalho: ícone + nome + status (chip) + categoria */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {node.icon ? (
          <img
            src={node.icon}
            alt=""
            aria-hidden="true"
            className="size-7 shrink-0 rounded"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}
        <span className="text-[15px] font-semibold leading-tight text-text">
          {localized(node.name) || "Runa"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2 py-0.5">
          <span
            aria-hidden="true"
            className={`size-2.5 rounded-full ${statusDot}`}
          />
          <span className="text-[11px] text-dim">{statusLabel}</span>
        </span>
        <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] text-dim">
          {catLabel(node.cat)}
        </span>
        {node.onDpsPath ? (
          <span className="rounded-full border border-gold/60 px-2 py-0.5 text-[11px] text-gold">
            Caminho de DPS
          </span>
        ) : null}
      </div>

      {/* Métricas */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Field
          label="Nível"
          value={`${node.level}${node.max > 0 ? ` / ${node.max}` : ""}`}
        />
        {node.cost != null ? (
          <Field label="Custo" value={fmt(node.cost)} accent="text-gold" />
        ) : null}
        {node.st ? (
          <Field
            label="Efeito"
            value={
              node.value != null
                ? `${statLabel(node.st)} +${fmtK(node.value)}`
                : statLabel(node.st)
            }
          />
        ) : null}
        {node.dPower != null && node.dPower > 0 ? (
          <Field label="ΔPOWER" value={fmtK(node.dPower)} accent="text-teal" />
        ) : null}
        {node.farmSeconds != null ? (
          <Field
            label="Tempo de farm"
            value={fmtDur(node.farmSeconds)}
            accent="text-dim"
          />
        ) : null}
      </div>
    </div>
  );
}
