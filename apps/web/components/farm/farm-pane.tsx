"use client";

import React from "react";
import { Crosshair, Check, Info, Anchor } from "lucide-react";
import type { FarmRow, GameDB, ParkStage, Recommendation, RecommendOpts } from "@tbh/engine";
import { fmtPerHour, fmtDur } from "@/lib/format";
import { StageTable } from "./stage-table";
import { Calibration } from "./calibration";
import { IdleSection } from "./idle-section";
import { Projections } from "./projections";

// ── Farm pane ─────────────────────────────────────────────────────────────────
// "Onde/quando jogar": the recommended stage (the focus), the full sortable stage
// ledger, manual calibration, the offline/idle curve, and forward projections.
// War-table theme — gold for gold-rates, teal for exp, coral for risk.

// Honest calibration copy keyed to the engine's calSource (all except 'rate',
// which gets a special live-auto-cal badge in the card).
const CAL_LABELS: Record<string, string> = {
  model: "estimado pelo modelo",
  rate: "calibrado pela sua taxa",
  clears: "calibrado pelos seus clears",
  fit: "calibrado (fit)",
};

function calLabel(calSource: string): string {
  return CAL_LABELS[calSource] ?? "estimado pelo modelo";
}

// ── Recommended-stage card (signature) ────────────────────────────────────────

interface RecommendedCardProps {
  recommend: FarmRow;
  onBest: boolean;
  calSource: string;
  goldBonusPct: number;
  expBonusPct: number;
  db: GameDB | null;
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1 px-4 py-3">
      <span className="text-[11px] font-medium uppercase tracking-wider text-dim">
        {label}
      </span>
      <span className={`text-[22px] font-semibold leading-none tabular-nums ${accent}`}>
        {value}
      </span>
    </div>
  );
}

function RecommendedCard({
  recommend,
  onBest,
  calSource,
  goldBonusPct,
  expBonusPct,
  db,
}: RecommendedCardProps) {
  const name = db?.stages[recommend.key]?.label ?? recommend.label;

  return (
    <section
      aria-label="Stage recomendado"
      className="relative overflow-hidden rounded-xl border border-gold/30 bg-gradient-to-br from-surface-2 via-surface to-surface p-5 shadow-[0_1px_0_0_rgba(232,176,75,0.12)_inset,0_18px_40px_-24px_rgba(0,0,0,0.8)] md:p-6"
    >
      {/* War-table accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-gold/10 blur-3xl"
      />
      <Crosshair
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 top-1/2 hidden size-44 -translate-y-1/2 text-gold/[0.05] lg:block"
        strokeWidth={1}
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Crosshair className="size-3.5 text-gold" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
              Stage recomendado
            </span>
          </div>
          {onBest && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal/12 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-teal">
              <Check className="size-3" aria-hidden="true" />
              já no melhor
            </span>
          )}
        </div>

        <p className="mt-2 font-display text-[28px] font-semibold leading-tight tracking-[-0.01em] text-text md:text-[32px]">
          Stage {name}
        </p>
        <p className="mt-0.5 text-[12px] text-dim tabular-nums">
          nível {recommend.lvl}
        </p>

        {/* Stat strip — gold/h, exp/h, clear */}
        <div className="mt-4 flex items-stretch divide-x divide-line/50 rounded-lg border border-line/50 bg-bg/30">
          <Stat label="Gold / h" value={fmtPerHour(recommend.goldPerHour)} accent="text-gold" />
          <Stat label="Exp / h" value={fmtPerHour(recommend.expPerHour)} accent="text-teal" />
          <Stat label="Clear" value={fmtDur(recommend.clearTime)} accent="text-text" />
        </div>

        {/* Bonuses + honest calibration label */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-gold/12 px-2 py-0.5 text-[11px] font-medium tabular-nums text-gold">
            +{goldBonusPct}% gold
          </span>
          <span className="rounded-full bg-teal/12 px-2 py-0.5 text-[11px] font-medium tabular-nums text-teal">
            +{expBonusPct}% exp
          </span>
          {calSource === "rate" ? (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-teal">
              <Check className="size-3" aria-hidden="true" />
              auto-calibrado pela sua taxa (live)
            </span>
          ) : (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-dim">
              <Info className="size-3" aria-hidden="true" />
              {calLabel(calSource)}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Auto-farm action highlights ───────────────────────────────────────────────
// Prominent action block at the top of the Farm pane — always shows where to
// leave the auto-clear running, and (when offline is unlocked) where to park.

interface AutoFarmHighlightsProps {
  recommend: FarmRow;
  bestPark: ParkStage | null | undefined;
  db: GameDB | null;
}

function AutoFarmHighlights({ recommend, bestPark, db }: AutoFarmHighlightsProps) {
  const recName = db?.stages[recommend.key]?.label ?? recommend.label ?? recommend.key;
  const parkName = bestPark
    ? (db?.stages[bestPark.key]?.label ?? bestPark.label ?? bestPark.key)
    : null;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {/* 🔄 Deixa rolando aqui — melhor stage pra auto-clear ativo */}
      <section
        aria-label="Deixa rolando — auto-farm"
        className="rounded-lg border border-gold/30 bg-surface p-4"
      >
        <div className="mb-2 flex items-center gap-1.5">
          <span aria-hidden="true" className="text-[14px] leading-none">🔄</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gold">
            Deixa rolando aqui
          </span>
        </div>
        <p className="text-[20px] font-semibold leading-tight text-text">
          Stage {recName}
        </p>
        <p className="text-[11px] tabular-nums text-dim">nível {recommend.lvl}</p>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="font-mono text-[13px] font-semibold tabular-nums text-gold">
            {fmtPerHour(recommend.goldPerHour)}
            <span className="text-[10px] font-normal text-dim"> gold/h</span>
          </span>
          <span className="text-[10px] text-dim/40">·</span>
          <span className="font-mono text-[13px] font-semibold tabular-nums text-teal">
            {fmtPerHour(recommend.expPerHour)}
            <span className="text-[10px] font-normal text-dim"> exp/h</span>
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-dim">
          Deixe o auto-clear nesta fase — melhor gold/exp por hora.
        </p>
      </section>

      {/* 💤 Estaciona offline aqui — só renderiza quando bestPark existe */}
      {bestPark && (
        <section
          aria-label="Estaciona offline aqui"
          className="rounded-lg border border-line bg-surface p-4"
        >
          <div className="mb-2 flex items-center gap-1.5">
            <span aria-hidden="true" className="text-[14px] leading-none">💤</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-dim">
              Estaciona offline aqui
            </span>
          </div>
          <p className="text-[20px] font-semibold leading-tight text-text">
            Stage {parkName}
          </p>
          <p className="text-[11px] tabular-nums text-dim">nível {bestPark.lvl}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-dim">
            <Anchor className="size-3 shrink-0" aria-hidden="true" />
            <span>
              Antes de fechar o jogo, pare nesta fase pra melhor recompensa offline.
            </span>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Farm pane ─────────────────────────────────────────────────────────────────

interface FarmPaneProps {
  rec: Recommendation;
  db: GameDB | null;
  recalibrate: (opts: RecommendOpts) => Promise<void>;
}

export function FarmPane({ rec, db, recalibrate }: FarmPaneProps) {
  const { farm, idle } = rec;
  const recommend = farm.recommend;
  const currentKey = farm.current ? farm.current.key : null;
  const recommendKey = recommend ? recommend.key : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 md:px-6 md:py-6">
      {recommend ? (
        <>
          <div className="reveal">
            <AutoFarmHighlights
              recommend={recommend}
              bestPark={idle.bestPark}
              db={db}
            />
          </div>

          <div className="reveal" style={{ animationDelay: "30ms" }}>
            <RecommendedCard
              recommend={recommend}
              onBest={farm.onBest}
              calSource={farm.calSource}
              goldBonusPct={farm.goldBonusPct}
              expBonusPct={farm.expBonusPct}
              db={db}
            />
          </div>

          <div
            className="reveal grid grid-cols-1 gap-4 lg:grid-cols-3"
            style={{ animationDelay: "60ms" }}
          >
            <div className="lg:col-span-2">
              <StageTable
                rows={farm.all}
                currentKey={currentKey}
                recommendKey={recommendKey}
                db={db}
              />
            </div>
            <div className="flex flex-col gap-4">
              <Calibration
                current={farm.current}
                rows={farm.all}
                db={db}
                recalibrate={recalibrate}
              />
              <Projections
                recommend={recommend}
                partyLevel={farm.partyLevel}
                db={db}
              />
            </div>
          </div>

          <div className="reveal" style={{ animationDelay: "120ms" }}>
            <IdleSection idle={idle} db={db} />
          </div>
        </>
      ) : (
        <section className="rounded-lg border border-line bg-surface p-6 text-center text-[14px] text-dim">
          Nenhum stage farmável encontrado neste save.
        </section>
      )}
    </div>
  );
}
