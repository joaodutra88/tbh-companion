"use client";

import React from "react";
import { Package, Info, AlertCircle, Crosshair, Clock } from "lucide-react";
import type { ChestPlan, GameDB, Recommendation } from "@tbh/engine";
import { fmtDur } from "@/lib/format";
import { StageName } from "@/components/stage-name";

// ── ChestsPane ────────────────────────────────────────────────────────────────
// Chest auto-open timers + drop window (rec.chests).
// War-table theme: gold for cooldowns, coral for warnings, teal for highlights.
// One card per chest type (normal/stage-boss/act-boss), shared drop window
// at top, and — if the engine found one — the best stage for chest loot.

const KIND_LABEL: Record<"normal" | "boss" | "act", string> = {
  normal: "Baú normal",
  boss: "Baú de chefe de fase",
  act: "Baú de chefe de ato",
};

// ── ChestCard ─────────────────────────────────────────────────────────────────

type ChestTypeItem = ChestPlan["types"][number];

interface ChestCardProps {
  type: ChestTypeItem;
}

function ChestCard({ type }: ChestCardProps) {
  const { kind, unlocked, cooldown, base, reduce, capacity, slowOpen } = type;
  const title = KIND_LABEL[kind];

  return (
    <section
      aria-label={title}
      className="overflow-hidden rounded-lg border border-line bg-surface"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <Package className="size-3.5 text-gold" aria-hidden="true" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-dim">
          {title}
        </h3>
        {!unlocked && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-coral/12 px-2 py-0.5 text-[10px] font-medium text-coral">
            não desbloqueado
          </span>
        )}
      </div>

      {unlocked ? (
        <>
          <div className="grid grid-cols-2 gap-px bg-line">
            {/* Cooldown */}
            <div className="flex flex-col gap-1 bg-surface px-4 py-3">
              <span className="text-[11px] font-medium uppercase tracking-wider text-dim">
                Auto-abertura
              </span>
              <span className="text-[20px] font-semibold tabular-nums leading-none text-gold">
                {fmtDur(cooldown)}
              </span>
              {reduce > 0 && (
                <span className="text-[11px] tabular-nums text-dim">
                  {fmtDur(base)} − {fmtDur(reduce)} runas
                </span>
              )}
            </div>

            {/* Capacity */}
            <div className="flex flex-col gap-1 bg-surface px-4 py-3">
              <span className="text-[11px] font-medium uppercase tracking-wider text-dim">
                Capacidade
              </span>
              <span className="text-[20px] font-semibold tabular-nums leading-none text-text">
                {capacity > 0 ? String(capacity) : "—"}
              </span>
            </div>
          </div>

          {/* slowOpen warning */}
          {slowOpen && (
            <div className="flex items-start gap-1.5 border-t border-line px-4 py-2">
              <Info className="mt-0.5 size-3 shrink-0 text-coral" aria-hidden="true" />
              <p className="text-[11px] leading-snug text-coral">
                abre mais devagar que os drops
              </p>
            </div>
          )}
        </>
      ) : (
        /* Unlocked hint */
        <div className="flex items-start gap-2 px-4 py-3">
          <AlertCircle
            className="mt-0.5 size-3.5 shrink-0 text-dim"
            aria-hidden="true"
          />
          <p className="text-[13px] leading-snug text-dim">
            Suba a runa de desbloqueio pra ativar a auto-abertura deste tipo de
            baú.
          </p>
        </div>
      )}
    </section>
  );
}

// ── ChestsPane ────────────────────────────────────────────────────────────────

interface ChestsPaneProps {
  rec: Recommendation;
  db?: GameDB | null;
}

export function ChestsPane({ rec, db }: ChestsPaneProps) {
  const { dropCooldown, types, best } = rec.chests;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 md:px-6 md:py-6">
      {/* Shared drop window — one server-side limit for all chest types */}
      <section
        aria-label="Janela de drop"
        className="overflow-hidden rounded-lg border border-line bg-surface"
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <Clock className="size-3.5 text-dim" aria-hidden="true" />
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-dim">
            Janela de drop compartilhada
          </h2>
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-dim">
            <Info className="size-3" aria-hidden="true" />
            estimada pelo servidor
          </span>
        </div>
        <div className="flex flex-wrap items-baseline gap-3 px-4 py-3">
          <span className="text-[26px] font-semibold tabular-nums leading-none text-text">
            {fmtDur(dropCooldown)}
          </span>
          <p className="text-[12px] leading-snug text-dim">
            limite compartilhado entre todos os tipos de baú (~5 min); estimativa
            do servidor.
          </p>
        </div>
      </section>

      {/* One card per chest type */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {types.map((type) => (
          <ChestCard key={type.kind} type={type} />
        ))}
      </div>

      {/* Best stage for chest loot */}
      {best != null && (
        <section
          aria-label="Melhor stage pra loot de baú"
          className="overflow-hidden rounded-lg border border-line bg-surface"
        >
          <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <Crosshair className="size-3.5 text-gold" aria-hidden="true" />
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gold">
              Melhor stage pra loot de baú
            </h2>
          </div>
          <div className="flex flex-wrap items-start gap-6 px-4 py-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-dim">
                Stage
              </span>
              <span className="text-[22px] font-semibold tabular-nums leading-none text-text">
                <StageName
                  db={db}
                  stageKey={String(best.key)}
                  label={best.label ?? String(best.key)}
                />
              </span>
              <span className="text-[11px] tabular-nums text-dim">
                nível {best.lvl}
              </span>
            </div>

            {best.clearsPerWindow != null && (
              <div className="flex flex-col gap-1 border-l border-line pl-6">
                <span className="text-[11px] font-medium uppercase tracking-wider text-dim">
                  Clears / janela
                </span>
                <span className="text-[22px] font-semibold tabular-nums leading-none text-teal">
                  {Math.round(best.clearsPerWindow)}
                </span>
                <span className="text-[11px] text-dim">
                  por {fmtDur(dropCooldown)}
                </span>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
