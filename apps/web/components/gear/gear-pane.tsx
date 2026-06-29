"use client";

import React, { useState, useMemo } from "react";
import type { Recommendation, GameDB, PlayerSaveData } from "@tbh/engine";
import { heroIcon, heroName } from "@/lib/format";
import { SlotGrid } from "./slot-grid";
import { SlotCompare } from "./slot-compare";

// ── GearPane ──────────────────────────────────────────────────────────────────
// Aba de equipamento: hero picker (party) + grid de 10 slots do herói selecionado.
// Estado de herói + slot selecionados vive aqui; o comparador (SlotCompare) é
// renderizado no aside quando um slot é selecionado e psd está disponível.

interface GearPaneProps {
  rec: Recommendation;
  db: GameDB | null;
  /** Parsed player save data — needed by SlotCompare. Optional for backward compat
   *  with smoke tests that don't pass it; when absent, a loading placeholder is shown. */
  psd?: PlayerSaveData | null;
}

export function GearPane({ rec, db, psd }: GearPaneProps) {
  const party = rec.meta.party;

  // Default: carry hero se definido, senão o primeiro da party
  const defaultHero = rec.meta.carryHero ?? party[0] ?? null;

  const [selectedHero, setSelectedHero] = useState<number | null>(defaultHero);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  function handleHeroSelect(hk: number): void {
    setSelectedHero(hk);
    setSelectedSlot(null); // reseta slot ao trocar herói
  }

  // Filtra os slots do herói selecionado (lista plana de todos os heróis)
  const heroSlots = useMemo(() => {
    if (selectedHero == null) return [];
    return rec.gear.slots.filter((s) => s.heroKey === selectedHero);
  }, [rec.gear.slots, selectedHero]);

  // Slot result for the selected slot (null if none selected)
  const selectedSlotResult = useMemo(() => {
    if (selectedSlot == null) return null;
    return heroSlots.find((s) => s.slot === selectedSlot) ?? null;
  }, [heroSlots, selectedSlot]);

  const swapCount = rec.gear.swaps.length;
  const emptyJewelryCount = rec.gear.emptyJewelry.length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-5 md:px-6 md:py-6">
      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[20px] font-semibold tracking-[-0.01em] text-text">
            Equipamento
          </h2>
          <p className="mt-0.5 text-[12px] text-dim tabular-nums">
            {swapCount > 0
              ? `${swapCount} ${swapCount === 1 ? "troca recomendada" : "trocas recomendadas"}`
              : "Nenhuma troca recomendada"}
            {emptyJewelryCount > 0
              ? ` · ${emptyJewelryCount} ${emptyJewelryCount === 1 ? "joia vazia" : "joias vazias"}`
              : null}
          </p>
        </div>
      </header>

      {/* ── Hero picker ────────────────────────────────────────────────────── */}
      <section aria-label="Escolher herói">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Heróis da party">
          {party.map((hk) => {
            const icon = heroIcon(hk, db);
            const name = heroName(hk, db);
            const isActive = selectedHero === hk;
            const isCarry = rec.meta.carryHero === hk;

            return (
              <button
                key={hk}
                type="button"
                onClick={() => handleHeroSelect(hk)}
                aria-pressed={isActive}
                className={[
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                  isActive
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-line bg-surface-2 text-text hover:border-gold/50 hover:bg-surface",
                ].join(" ")}
                data-heroki={hk}
              >
                {/* Hero portrait */}
                {icon !== "" ? (
                  <img
                    src={icon}
                    alt=""
                    aria-hidden="true"
                    className="size-8 shrink-0 rounded object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded bg-surface text-[11px] text-dim">
                    {hk}
                  </span>
                )}

                {/* Hero name */}
                <span className="truncate">{name}</span>

                {/* Carry badge */}
                {isCarry && (
                  <span className="ml-0.5 rounded border border-teal/40 px-1 py-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-teal">
                    carry
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Slot grid + comparador ──────────────────────────────────────────── */}
      {selectedHero != null && (
        <div className="flex flex-col gap-3 md:flex-row md:items-start">
          {/* 10-slot grid para o herói selecionado */}
          <SlotGrid
            slots={heroSlots}
            selectedSlot={selectedSlot}
            onSlotSelect={setSelectedSlot}
            db={db}
          />

          {/* Comparador de slot — Task 3 */}
          {selectedSlot != null &&
            (selectedSlotResult != null && db != null && psd != null && selectedHero != null ? (
              <SlotCompare
                rec={rec}
                db={db}
                psd={psd}
                heroKey={selectedHero}
                slotResult={selectedSlotResult}
              />
            ) : (
              <aside
                aria-label="Comparador de itens"
                className="flex w-full flex-col items-center justify-center rounded-xl border border-line/50 bg-surface-2 p-8 text-center md:w-80"
              >
                <p className="text-[13px] font-medium text-dim">Comparador de itens</p>
                <p className="mt-1 text-[11px] text-dim/60">Carregando...</p>
              </aside>
            ))}
        </div>
      )}
    </div>
  );
}
