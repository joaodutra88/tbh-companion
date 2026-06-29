"use client";

import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Table2 } from "lucide-react";
import type { FarmRow, GameDB } from "@tbh/engine";
import { fmtPerHour, fmtDur } from "@/lib/format";
import { StageName } from "@/components/stage-name";

// ── StageTable ────────────────────────────────────────────────────────────────
// The full farmable-stage ledger (rec.farm.all): a sortable, scrollable war-table.
// Numbers are telemetry (mono/tabular); the current + recommended rows are flagged.

type SortKey =
  | "lvl"
  | "goldPerHour"
  | "expPerHour"
  | "clearTime"
  | "expDensity"
  | "goldDensity";

export interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

const DEFAULT_SORT: SortState = { key: "goldPerHour", dir: "desc" };

/** Pure comparator-driven sort (exported for unit testing). Stable, non-mutating. */
export function sortRows(rows: readonly FarmRow[], sort: SortState): FarmRow[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      const av = a.row[sort.key];
      const bv = b.row[sort.key];
      if (av === bv) return a.i - b.i; // stable tiebreak on original order
      return (av < bv ? -1 : 1) * sign;
    })
    .map(({ row }) => row);
}

// ── Column defs ───────────────────────────────────────────────────────────────

interface ColDef {
  key: SortKey;
  label: string;
  /** Numeric cells are right-aligned. */
  numeric: boolean;
}

const COLS: ColDef[] = [
  { key: "lvl", label: "Stage", numeric: false },
  { key: "goldPerHour", label: "Gold/h", numeric: true },
  { key: "expPerHour", label: "Exp/h", numeric: true },
  { key: "clearTime", label: "Clear", numeric: true },
  { key: "expDensity", label: "Exp/HP", numeric: true },
  { key: "goldDensity", label: "Gold/HP", numeric: true },
];

/** Density ratios are tiny (~0.03) — 3 decimals, PT-BR comma. */
function fmtDensity(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface StageTableProps {
  rows: readonly FarmRow[];
  currentKey: string | null;
  recommendKey: string | null;
  db: GameDB | null;
}

export function StageTable({ rows, currentKey, recommendKey, db }: StageTableProps) {
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort]);

  const onSort = (key: SortKey): void => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "desc" ? "asc" : "desc" }
        : { key, dir: "desc" },
    );
  };

  return (
    <section
      aria-label="Stages farmáveis"
      className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface"
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <Table2 className="size-3.5 text-dim" aria-hidden="true" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-dim">
          Stages farmáveis
        </h2>
        <span className="text-[11px] tabular-nums text-dim/60">{rows.length}</span>
        <span className="ml-auto hidden text-[11px] text-dim/50 sm:inline">
          clique no cabeçalho pra ordenar
        </span>
      </div>

      <div className="max-h-[480px] overflow-y-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr>
              {COLS.map((col) => {
                const active = sort.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      active
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={`border-b border-line px-3 py-2 font-medium ${
                      col.numeric ? "text-right" : "text-left"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className={`inline-flex items-center gap-1 text-[11px] uppercase tracking-wider transition-colors ${
                        col.numeric ? "flex-row-reverse" : ""
                      } ${active ? "text-gold" : "text-dim hover:text-text"}`}
                    >
                      {col.label}
                      {active &&
                        (sort.dir === "asc" ? (
                          <ArrowUp className="size-3" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3" aria-hidden="true" />
                        ))}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const isRec = row.key === recommendKey;
              const isCur = row.key === currentKey;
              const name = db?.stages[row.key]?.label ?? row.label;
              return (
                <tr
                  key={row.key}
                  className={[
                    "border-b border-line/40 transition-colors last:border-0",
                    isRec
                      ? "bg-gold/[0.07] hover:bg-gold/[0.1]"
                      : isCur
                        ? "bg-teal/[0.06] hover:bg-teal/[0.09]"
                        : "hover:bg-surface-2/60",
                  ].join(" ")}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`h-3.5 w-0.5 shrink-0 rounded-full ${
                          isRec ? "bg-gold" : isCur ? "bg-teal" : "bg-transparent"
                        }`}
                      />
                      <StageName
                        label={name ?? String(row.key)}
                        diff={row.diff}
                        lvl={row.lvl}
                        showLevel
                      />
                      {isRec && (
                        <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold">
                          melhor
                        </span>
                      )}
                      {isCur && !isRec && (
                        <span className="rounded-full bg-teal/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-teal">
                          atual
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gold">
                    {fmtPerHour(row.goldPerHour)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-teal">
                    {fmtPerHour(row.expPerHour)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-text">
                    {fmtDur(row.clearTime)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-dim">
                    {fmtDensity(row.expDensity)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-dim">
                    {fmtDensity(row.goldDensity)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
