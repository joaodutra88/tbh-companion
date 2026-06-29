"use client";

import React from "react";
import type { GameDB } from "@tbh/engine";
import { DIFF_LABEL } from "@/lib/stage-format";

// ── Difficulty chip ────────────────────────────────────────────────────────────
// Compact, bordered chip — visually distinct from the gold/teal rate numbers
// that surround stage labels in the war-table UI.

function diffChipClasses(diff: string): string {
  switch (diff) {
    case "NORMAL":
      return "border border-line/60 bg-surface-2 text-dim";
    case "NIGHTMARE":
      return "border border-teal/40 bg-teal/10 text-teal";
    case "HELL":
      return "border border-gold/40 bg-gold/10 text-gold";
    case "TORMENT":
      return "border border-coral/40 bg-coral/10 text-coral";
    default:
      return "";
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────
// Two call shapes (both optional fields — component resolves gracefully):
//   {db, stageKey}          — resolves label/diff/lvl from db.stages[stageKey]
//   {label, diff?, lvl?}    — direct props (FarmRow already carries all three)
// showLevel: when true, appends "nv {lvl}" inline (used in tables).

interface StageNameProps {
  // db/stageKey variant
  db?: GameDB | null;
  stageKey?: string;
  // direct variant
  label?: string;
  diff?: string;
  lvl?: number;
  // shared
  showLevel?: boolean;
}

// ── StageName ─────────────────────────────────────────────────────────────────
// Renders: [DiffChip] label [nv N]
// DiffChip is omitted when diff is absent/unknown (graceful).
// showLevel is omitted when showLevel=false (default) or lvl is missing.

export function StageName({
  db,
  stageKey,
  label: labelProp,
  diff: diffProp,
  lvl: lvlProp,
  showLevel,
}: StageNameProps) {
  // Resolve values — stageKey variant takes precedence when provided.
  let label: string;
  let diff: string | undefined;
  let lvl: number | undefined;

  if (stageKey != null) {
    const stage = db?.stages[stageKey];
    label = stage?.label ?? labelProp ?? String(stageKey);
    diff = stage?.diff ?? diffProp;
    lvl = stage?.lvl ?? lvlProp;
  } else {
    label = labelProp ?? "—";
    diff = diffProp;
    lvl = lvlProp;
  }

  const diffLabel = diff ? DIFF_LABEL[diff] : undefined;
  const chipClasses = diff && diffLabel ? diffChipClasses(diff) : "";

  return (
    <span className="inline-flex flex-wrap items-baseline gap-1.5">
      {diffLabel && chipClasses && (
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide ${chipClasses}`}
          aria-label={`dificuldade: ${diffLabel}`}
        >
          {diffLabel}
        </span>
      )}
      <span>{label}</span>
      {showLevel && lvl != null && (
        <span className="text-[11px] tabular-nums text-dim">nv {lvl}</span>
      )}
    </span>
  );
}
