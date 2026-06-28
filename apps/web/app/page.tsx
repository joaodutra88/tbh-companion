"use client";

import React from "react";
import { AppShell } from "@/components/app-shell";
import { ConnectSave } from "@/components/connect-save";
import { Overview } from "@/components/overview/overview";
import { useRecommendation } from "@/lib/recommendation-context";

// ── Status slot (top-bar right side) ─────────────────────────────────────────

function StatusSlot() {
  const { status, source, disconnect } = useRecommendation();

  const dotClass =
    status === "ready" && source === "live"
      ? "bg-teal"
      : status === "ready"
        ? "bg-gold"
        : status === "error"
          ? "bg-coral"
          : status === "loading"
            ? "bg-gold/50 animate-pulse"
            : "bg-dim/40";

  const label =
    status === "idle"
      ? "Sem save"
      : status === "loading"
        ? "Carregando..."
        : status === "error"
          ? "Erro"
          : source === "live"
            ? "Live-watch"
            : source === "demo"
              ? "Demo"
              : "Save carregado";

  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
      <span className="text-[12px] text-dim font-body">{label}</span>
      {status !== "idle" && (
        <button
          onClick={disconnect}
          className="ml-1 text-[11px] text-dim/60 hover:text-dim font-body transition-colors px-1.5 py-0.5 rounded border border-line/60 hover:border-line"
        >
          Desconectar
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const { status, rec, db } = useRecommendation();

  return (
    <AppShell statusSlot={<StatusSlot />}>
      {status === "ready" && rec ? (
        <Overview rec={rec} db={db} />
      ) : (
        <ConnectSave />
      )}
    </AppShell>
  );
}
