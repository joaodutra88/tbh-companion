"use client";

import React, { useState } from "react";
import { SlidersHorizontal, Loader2, Plus, X } from "lucide-react";
import type { FarmRow, GameDB, RecommendOpts } from "@tbh/engine";

// ── Calibration ───────────────────────────────────────────────────────────────
// Honest, manual calibration: the player types their real clear time (seconds) for
// the current stage (+ an optional 2nd stage to fit the model). We pass both the
// raw clearSec (drives the "clears" path) and clearSamples (drives the "fit" path
// when ≥2 samples) to recalibrate(); the engine picks the strongest signal.

interface CalibrationProps {
  current: FarmRow | null;
  rows: readonly FarmRow[];
  db: GameDB | null;
  recalibrate: (opts: RecommendOpts) => Promise<void>;
}

export function Calibration({ current, rows, db, recalibrate }: CalibrationProps) {
  const [clearStr, setClearStr] = useState("");
  const [extraKey, setExtraKey] = useState<string>("");
  const [extraStr, setExtraStr] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [busy, setBusy] = useState(false);

  const curName = current ? (db?.stages[current.key]?.label ?? current.label) : null;
  const extraRow = rows.find((r) => r.key === extraKey) ?? null;
  const otherStages = rows.filter((r) => current == null || r.key !== current.key);

  const clearSec = Number(clearStr);
  const extraSec = Number(extraStr);
  const hasPrimary = current != null && clearSec > 0;
  const canSubmit = hasPrimary && !busy;

  async function onCalibrate(): Promise<void> {
    if (!current || !(clearSec > 0)) return;
    const clearSamples = [
      { clearSec, hp: current.totalHP, waves: current.waves },
    ];
    if (showExtra && extraRow && extraSec > 0) {
      clearSamples.push({
        clearSec: extraSec,
        hp: extraRow.totalHP,
        waves: extraRow.waves,
      });
    }
    setBusy(true);
    try {
      await recalibrate({ clearSec, clearSamples });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Calibração"
      className="rounded-lg border border-line bg-surface p-4"
    >
      <div className="mb-2 flex items-center gap-2">
        <SlidersHorizontal className="size-3.5 text-dim" aria-hidden="true" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-dim">
          Calibração
        </h2>
      </div>

      {current == null ? (
        <p className="text-[13px] text-dim">
          Sem stage atual pra calibrar — conecte um save em jogo.
        </p>
      ) : (
        <>
          <p className="mb-3 text-[12px] leading-snug text-dim">
            Informe seu tempo real de clear (em segundos) do stage atual pra
            calibrar os números. Sem isso, uso uma estimativa do modelo.
          </p>

          <div className="flex flex-col gap-2.5">
            {/* Primary: current stage */}
            <label className="flex items-center gap-2 text-[13px]">
              <span className="w-20 shrink-0 truncate text-dim">
                Stage {curName}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={clearStr}
                onChange={(e) => setClearStr(e.target.value)}
                placeholder="seg"
                className="w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-[13px] tabular-nums text-text outline-none transition-colors placeholder:text-dim/50 focus:border-gold/60"
              />
            </label>

            {/* Optional second stage (fit) */}
            {showExtra ? (
              <div className="flex items-center gap-2 text-[13px]">
                <select
                  value={extraKey}
                  onChange={(e) => setExtraKey(e.target.value)}
                  className="w-20 shrink-0 rounded-md border border-line bg-bg px-1.5 py-1.5 text-[12px] text-text outline-none focus:border-gold/60"
                >
                  <option value="">2º…</option>
                  {otherStages.map((r) => (
                    <option key={r.key} value={r.key}>
                      {db?.stages[r.key]?.label ?? r.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={extraStr}
                  onChange={(e) => setExtraStr(e.target.value)}
                  placeholder="seg"
                  className="w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-[13px] tabular-nums text-text outline-none transition-colors placeholder:text-dim/50 focus:border-gold/60"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowExtra(false);
                    setExtraKey("");
                    setExtraStr("");
                  }}
                  aria-label="Remover 2º stage"
                  className="shrink-0 rounded-md p-1.5 text-dim transition-colors hover:text-coral"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowExtra(true)}
                className="inline-flex items-center gap-1 self-start text-[12px] text-dim transition-colors hover:text-text"
              >
                <Plus className="size-3" aria-hidden="true" />
                adicionar 2º stage (afina o modelo)
              </button>
            )}

            <button
              type="button"
              onClick={onCalibrate}
              disabled={!canSubmit}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-md bg-gold px-3 py-2 text-[13px] font-semibold text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              {busy ? "Calibrando…" : "Calibrar"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
