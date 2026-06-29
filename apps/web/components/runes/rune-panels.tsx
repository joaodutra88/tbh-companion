"use client";

import React from "react";
import { ShoppingCart, Route } from "lucide-react";
import type { Recommendation } from "@tbh/engine";
import { fmt, fmtK, localized } from "@/lib/format";
import { statLabel } from "@/lib/stat-labels";
import { dedupeByNameAndSt } from "@/lib/rune-dedupe";

// ── RunePanels ────────────────────────────────────────────────────────────────
// Painéis laterais da aba Runas:
//   "Recomendadas" — almostFree (mais baratas, top 8) + top ROI de combate
//     por perGold (top 6). Clicar numa linha → onSelect(String(key)), que
//     seleciona o nó na árvore e abre o detalhe.
//   "Plano de gasto" — goldPlan: cart dentro do orçamento atual, totais de
//     custo e ΔPOWER. Cart vazio → "Nada a comprar agora."
//   "Caminho de DPS" — firstDpsPath (se existir): alvo, custo total, contagem
//     de passos e botão "ver na árvore" → onSelect(String(target)).
//
// Componente "burro": recebe rec + onSelect; estado mora no pai (RunesPane).

interface RunePanelsProps {
  rec: Recommendation;
  onSelect: (key: string) => void;
}

const MAX_ALMOST_FREE = 8;
const MAX_ROI = 6;


export function RunePanels({ rec, onSelect }: RunePanelsProps) {
  const almostFree = dedupeByNameAndSt(rec.runes.almostFree).slice(0, MAX_ALMOST_FREE);
  const roi = dedupeByNameAndSt(rec.runeROI).slice(0, MAX_ROI);
  const { totalCost, totalPower, gold } = rec.goldPlan;
  const cart = dedupeByNameAndSt(rec.goldPlan.cart);
  const firstDpsPath = rec.runes.firstDpsPath;

  // Nome do alvo do caminho de DPS: do nó da árvore (mais completo) ou do
  // último passo do caminho (fallback).
  const dpsTargetName = firstDpsPath
    ? localized(
        rec.runeTree.nodes[String(firstDpsPath.target)]?.name ??
          (firstDpsPath.steps.length > 0
            ? firstDpsPath.steps[firstDpsPath.steps.length - 1]!.name
            : String(firstDpsPath.target)),
      )
    : "";

  return (
    <div className="flex flex-col gap-3">
      {/* ── Recomendadas ─────────────────────────────────── */}
      <section
        aria-label="Recomendadas"
        className="rounded-lg border border-line bg-surface px-4 py-3"
      >
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-dim">
          Recomendadas
        </h2>

        {almostFree.length > 0 ? (
          <>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-dim/60">
              Mais baratas
            </p>
            <ul className="flex flex-col gap-0.5">
              {almostFree.map((r) => {
                const icon = rec.runeTree.nodes[String(r.key)]?.icon;
                return (
                  <li key={`af-${r.key}`}>
                    <button
                      type="button"
                      onClick={() => onSelect(String(r.key))}
                      className="group flex w-full items-center gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-surface-2"
                    >
                      {icon ? (
                        <img
                          src={icon}
                          alt=""
                          aria-hidden="true"
                          className="size-5 shrink-0 rounded"
                          onError={(e) => {
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.display = "none";
                          }}
                        />
                      ) : null}
                      <span className="flex-1 truncate text-[13px] text-text group-hover:text-gold">
                        {localized(r.name) || `Runa ${r.key}`}
                        {r.count > 1 ? (
                          <span className="ml-1 text-[11px] text-dim">
                            ×{r.count}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-[12px] tabular-nums text-gold">
                        {fmt(r.cost)}
                      </span>
                      {r.st ? (
                        <span className="shrink-0 text-[11px] tabular-nums text-dim">
                          {statLabel(r.st)}
                          {r.value != null ? ` +${fmtK(r.value)}` : ""}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}

        {roi.length > 0 ? (
          <>
            <p
              className={`mb-1 text-[10px] font-medium uppercase tracking-wider text-dim/60${almostFree.length > 0 ? " mt-3" : ""}`}
            >
              Melhor custo-benefício (combate)
            </p>
            <ul className="flex flex-col gap-0.5">
              {roi.map((r) => {
                const icon = rec.runeTree.nodes[String(r.key)]?.icon;
                return (
                  <li key={`roi-${r.key}`}>
                    <button
                      type="button"
                      onClick={() => onSelect(String(r.key))}
                      className="group flex w-full items-center gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-surface-2"
                    >
                      {icon ? (
                        <img
                          src={icon}
                          alt=""
                          aria-hidden="true"
                          className="size-5 shrink-0 rounded"
                          onError={(e) => {
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.display = "none";
                          }}
                        />
                      ) : null}
                      <span className="flex-1 truncate text-[13px] text-text group-hover:text-gold">
                        {localized(r.name) || `Runa ${r.key}`}
                        {r.count > 1 ? (
                          <span className="ml-1 text-[11px] text-dim">
                            ×{r.count}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-[12px] tabular-nums text-teal">
                        +{fmtK(r.dPower)}
                      </span>
                      <span className="shrink-0 text-[12px] tabular-nums text-gold">
                        {fmt(r.cost)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}

        {almostFree.length === 0 && roi.length === 0 ? (
          <p className="text-[13px] text-dim">
            Nenhuma runa recomendada no momento.
          </p>
        ) : null}
      </section>

      {/* ── Plano de gasto ───────────────────────────────── */}
      <section
        aria-label="Plano de gasto"
        className="rounded-lg border border-line bg-surface px-4 py-3"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-dim">
            Plano de gasto
          </h2>
          <span className="flex items-center gap-1 text-[12px] tabular-nums text-gold">
            <ShoppingCart className="size-3" aria-hidden="true" />
            {fmt(gold)}
          </span>
        </div>

        {cart.length === 0 ? (
          <p className="text-[13px] text-dim">Nada a comprar agora.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-0.5">
              {cart.map((r) => {
                const icon = rec.runeTree.nodes[String(r.key)]?.icon;
                return (
                  <li
                    key={`cart-${r.key}`}
                    className="flex items-center gap-2 px-1.5 py-1"
                  >
                    {icon ? (
                      <img
                        src={icon}
                        alt=""
                        aria-hidden="true"
                        className="size-5 shrink-0 rounded"
                        onError={(e) => {
                          (
                            e.currentTarget as HTMLImageElement
                          ).style.display = "none";
                        }}
                      />
                    ) : null}
                    <span className="flex-1 truncate text-[13px] text-text">
                      {localized(r.name) || `Runa ${r.key}`}
                      {r.count > 1 ? (
                        <span className="ml-1 text-[11px] text-dim">
                          ×{r.count}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-teal">
                      +{fmtK(r.dPower)}
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-gold">
                      {fmt(r.cost)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
              <span className="text-[11px] text-dim">Total</span>
              <div className="flex items-center gap-3">
                {totalPower > 0 ? (
                  <span className="text-[12px] font-semibold tabular-nums text-teal">
                    +{fmtK(totalPower)} POWER
                  </span>
                ) : null}
                <span className="text-[12px] font-semibold tabular-nums text-gold">
                  {fmt(totalCost)}
                </span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── Caminho de DPS ───────────────────────────────── */}
      {firstDpsPath ? (
        <section
          aria-label="Caminho de DPS"
          className="rounded-lg border border-gold/30 bg-surface px-4 py-3"
        >
          <div className="mb-2 flex items-center gap-1.5">
            <Route className="size-3.5 text-gold" aria-hidden="true" />
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gold">
              Caminho de DPS
            </h2>
          </div>
          <p className="text-[13px] font-medium text-text">
            {dpsTargetName || `Runa ${firstDpsPath.target}`}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[12px] tabular-nums text-gold">
              {fmt(firstDpsPath.totalCost)} gold
            </span>
            <span className="text-[11px] text-dim">
              {firstDpsPath.steps.length}{" "}
              {firstDpsPath.steps.length === 1 ? "passo" : "passos"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelect(String(firstDpsPath.target))}
            className="mt-2.5 rounded border border-gold/40 bg-gold/10 px-3 py-1 text-[12px] font-medium text-gold transition-colors hover:bg-gold/20"
          >
            ver na árvore
          </button>
        </section>
      ) : null}
    </div>
  );
}
