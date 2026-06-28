"use client";

import React from "react";
import type { Recommendation } from "@tbh/engine";
import { fmt, fmtK } from "@/lib/format";

// ── MetaStrip ─────────────────────────────────────────────────────────────────
// Horizontal status bar (a nod to *Task Bar Hero*): POWER / DPS / EHP / Gold as
// telemetry. Hairlines via a 1px gap over a line-colored backplate. 2×2 on mobile.

interface MetaStripProps {
  rec: Recommendation;
}

interface Cell {
  label: string;
  value: string;
  accent: string;
  big?: boolean;
}

export function MetaStrip({ rec }: MetaStripProps) {
  const power = rec.heroes.reduce((sum, h) => sum + h.power, 0);

  const cells: Cell[] = [
    { label: "Power", value: fmt(power), accent: "text-gold", big: true },
    { label: "DPS", value: fmtK(rec.meta.partyDPS), accent: "text-teal" },
    { label: "EHP", value: fmtK(rec.meta.partyEHP), accent: "text-text" },
    { label: "Gold", value: fmtK(rec.meta.gold), accent: "text-text" },
  ];

  return (
    <div
      aria-label="Resumo da party"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4"
    >
      {cells.map((c) => (
        <div key={c.label} className="flex flex-col gap-1 bg-surface px-4 py-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-dim">
            {c.label}
          </span>
          <span
            className={`tabular-nums font-semibold leading-none ${c.accent} ${
              c.big ? "text-[24px]" : "text-[19px]"
            }`}
          >
            {c.value}
          </span>
        </div>
      ))}
    </div>
  );
}
