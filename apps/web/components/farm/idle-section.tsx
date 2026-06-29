"use client";

import React from "react";
import { Moon, Clock, Anchor } from "lucide-react";
import type { GameDB, IdleInfo } from "@tbh/engine";
import { fmtK, fmtDur } from "@/lib/format";

// ── IdleSection ───────────────────────────────────────────────────────────────
// The offline/return curve (rec.idle): full reward at the 8h cap, time-to-cap,
// what's accrued right now, and the best stage to park on while away. Coral when
// the cap is already full (you're leaving rewards on the table).

interface IdleSectionProps {
  idle: IdleInfo;
  db: GameDB | null;
}

interface CellProps {
  label: string;
  children: React.ReactNode;
}

function Cell({ label, children }: CellProps) {
  return (
    <div className="flex flex-col gap-1 bg-surface px-4 py-3">
      <span className="text-[11px] font-medium uppercase tracking-wider text-dim">
        {label}
      </span>
      <span className="leading-none">{children}</span>
    </div>
  );
}

function GoldExp({ gold, exp }: { gold: number | null; exp: number | null }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 text-[18px] font-semibold">
      <span className="tabular-nums text-gold">{gold == null ? "—" : fmtK(gold)}</span>
      <span className="text-dim/50">·</span>
      <span className="tabular-nums text-teal">{exp == null ? "—" : fmtK(exp)}</span>
    </span>
  );
}

export function IdleSection({ idle, db }: IdleSectionProps) {
  if (!idle.unlocked) {
    return (
      <section
        aria-label="Idle / Offline"
        className="rounded-lg border border-line bg-surface p-4"
      >
        <div className="mb-2 flex items-center gap-2">
          <Moon className="size-3.5 text-dim" aria-hidden="true" />
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-dim">
            Idle / Offline
          </h2>
        </div>
        <p className="text-[13px] leading-snug text-dim">
          Recompensa offline ainda travada. Suba a runa de offline pra acumular
          gold e exp enquanto estiver fora (cap de 8h).
        </p>
      </section>
    );
  }

  const capHours = idle.capHours ?? 8;
  const secsToCap = idle.secsToCap ?? null;
  const atCap = secsToCap != null && secsToCap <= 0;
  const park = idle.bestPark;
  const parkName = park ? (db?.stages[park.key]?.label ?? park.label) : null;

  return (
    <section
      aria-label="Idle / Offline"
      className="rounded-lg border border-line bg-surface"
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <Moon className="size-3.5 text-dim" aria-hidden="true" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-dim">
          Idle / Offline
        </h2>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-dim">
          <Clock className="size-3" aria-hidden="true" />
          cap {capHours}h
        </span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
        <Cell label={`Cheio (${capHours}h)`}>
          <GoldExp gold={idle.fullGold} exp={idle.fullExp} />
        </Cell>
        <Cell label="Até o cap">
          {atCap ? (
            <span className="text-[18px] font-semibold text-coral">no cap!</span>
          ) : (
            <span
              className={`text-[18px] font-semibold tabular-nums ${
                secsToCap == null ? "text-dim" : "text-text"
              }`}
            >
              {secsToCap == null ? "—" : fmtDur(secsToCap)}
            </span>
          )}
        </Cell>
        <Cell label="Acumulado agora">
          <GoldExp gold={idle.accruedGold ?? null} exp={idle.accruedExp ?? null} />
        </Cell>
        <Cell label="Estacionar em">
          {park ? (
            <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-text">
              <Anchor className="size-3.5 text-gold" aria-hidden="true" />
              <span className="tabular-nums">{parkName}</span>
              <span className="text-[11px] font-normal tabular-nums text-dim">
                nv {park.lvl}
              </span>
            </span>
          ) : (
            <span className="text-[15px] text-dim">—</span>
          )}
        </Cell>
      </div>

      {park && (
        <p className="border-t border-line px-4 py-2 text-[11px] text-dim">
          Parado em {parkName}: {fmtK(park.fullGold)} gold ·{" "}
          {fmtK(park.fullExp)} exp no cap de {capHours}h.
        </p>
      )}
    </section>
  );
}
