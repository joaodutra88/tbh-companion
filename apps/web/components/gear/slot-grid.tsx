"use client";

import React from "react";
import type { GameDB, GearAdvice } from "@tbh/engine";
import { itemIcon, gearName, gradeStyle, gearTypeLabel } from "@/lib/item-format";

// PT-BR slot labels (index 0..9)
// Slots 0-1: class-specific weapons; 2-5: universal armor; 6-9: jewelry (inherent-only stats)
const SLOT_LABELS: readonly string[] = [
  "Arma",      // 0 — main weapon (class-specific gearType)
  "Off-hand",  // 1 — sub weapon (class-specific gearType)
  "Elmo",      // 2 — HELMET
  "Armadura",  // 3 — ARMOR
  "Luvas",     // 4 — GLOVES
  "Botas",     // 5 — BOOTS
  "Amuleto",   // 6 — AMULET (jewelry: inherent stats only, no gearType in db.gearTypes)
  "Brinco",    // 7 — EARING
  "Anel",      // 8 — RING
  "Bracelete", // 9 — BRACER
] as const;

type SlotResult = GearAdvice["slots"][number];

interface SlotGridProps {
  slots: SlotResult[];
  selectedSlot: number | null;
  onSlotSelect: (slot: number) => void;
  db: GameDB | null;
}

export function SlotGrid({ slots, selectedSlot, onSlotSelect, db }: SlotGridProps) {
  // Build map slot index → SlotResult for ordered rendering
  const slotMap = new Map<number, SlotResult>();
  for (const s of slots) {
    slotMap.set(s.slot, s);
  }

  return (
    <section aria-label="Slots de equipamento" className="flex-1">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 10 }, (_, idx) => {
          const slotResult = slotMap.get(idx);
          const current = slotResult?.current ?? null;
          const isEmpty = slotResult?.empty ?? true;
          const isSelected = selectedSlot === idx;
          const label =
            idx === 0 || idx === 1
              ? gearTypeLabel(slotResult?.gearType ?? "")
              : (SLOT_LABELS[idx] ?? `Slot ${idx}`);
          const gs = current?.grade != null ? gradeStyle(current.grade) : null;

          const cellClass = [
            "relative flex flex-col items-center gap-1 rounded-xl border p-3 cursor-pointer transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold",
            isSelected
              ? "border-gold bg-gold/10 shadow-[0_0_0_1px_rgba(232,176,75,0.4)]"
              : isEmpty
                ? "border-dashed border-line/50 bg-surface-2/50 hover:border-line hover:bg-surface-2"
                : "border-line bg-surface-2 hover:border-gold/40 hover:bg-surface",
          ].join(" ");

          const ariaLabel = current
            ? `${label}: ${gearName(current.itemKey)}`
            : `${label} (vazio)`;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSlotSelect(idx)}
              className={cellClass}
              aria-pressed={isSelected}
              aria-label={ariaLabel}
              data-slot={idx}
            >
              {/* Slot label */}
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">
                {label}
              </span>

              {current != null && !isEmpty ? (
                <>
                  {/* Item icon */}
                  <div className="relative">
                    {db != null ? (
                      <img
                        src={itemIcon(current.itemKey, db)}
                        alt=""
                        aria-hidden="true"
                        className="size-10 rounded object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="size-10 rounded bg-surface" />
                    )}

                    {/* Swap-recommended badge */}
                    {slotResult?.worth === true && (
                      <span
                        className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-teal text-[8px] font-bold text-bg"
                        aria-label="troca recomendada"
                        role="img"
                      >
                        ↑
                      </span>
                    )}
                  </div>

                  {/* Grade badge */}
                  {gs != null && (
                    <span className={gs.className}>
                      {gs.label}
                    </span>
                  )}

                  {/* Level */}
                  {current.level != null && (
                    <span className="font-mono text-[11px] tabular-nums text-dim">
                      Lv.{current.level}
                    </span>
                  )}
                </>
              ) : (
                /* Empty slot treatment */
                <div className="flex size-10 items-center justify-center rounded border border-dashed border-line/40">
                  <span className="text-[10px] text-dim/50" aria-hidden="true">
                    —
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
