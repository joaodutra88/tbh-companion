"use client";

import React from "react";
import { LineChart } from "lucide-react";
import type { FarmRow, GameDB } from "@tbh/engine";
import { projectLevel } from "@tbh/engine";
import { fmtK } from "@/lib/format";

// ── Projections ───────────────────────────────────────────────────────────────
// For the recommended stage: how much gold piles up and where the party level lands
// after 1/3/5/8h of unattended farming. Gold = goldPerSec·t; level via the engine's
// fit-aware projectLevel (EXP falls off as you out-level the stage).

const HOURS = [1, 3, 5, 8] as const;

interface ProjectionsProps {
  recommend: FarmRow;
  partyLevel: number;
  db: GameDB | null;
}

export function Projections({ recommend, partyLevel, db }: ProjectionsProps) {
  const rows = HOURS.map((h) => {
    const gold = recommend.goldPerSec * h * 3600;
    const level = db
      ? projectLevel(db, partyLevel, 0, recommend.expPerSec, recommend.lvl, h)
      : null;
    return { h, gold, level };
  });

  return (
    <section
      aria-label="Projeções"
      className="overflow-hidden rounded-lg border border-line bg-surface"
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <LineChart className="size-3.5 text-dim" aria-hidden="true" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-dim">
          Projeções
        </h2>
        <span className="ml-auto text-[11px] text-dim">no stage recomendado</span>
      </div>

      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-dim">
            <th scope="col" className="px-4 py-2 text-left font-medium">
              Tempo
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              Gold
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              Nível
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ h, gold, level }) => (
            <tr key={h} className="border-t border-line/40">
              <td className="px-4 py-2 tabular-nums text-text">{h}h</td>
              <td className="px-4 py-2 text-right tabular-nums text-gold">
                +{fmtK(gold)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-teal">
                {level == null
                  ? "—"
                  : `Lv ${level.toLocaleString("pt-BR", {
                      maximumFractionDigits: 1,
                    })}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
