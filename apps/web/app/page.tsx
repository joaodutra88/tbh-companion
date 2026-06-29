"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ConnectSave } from "@/components/connect-save";
import { Overview } from "@/components/overview/overview";
import { FarmPane } from "@/components/farm/farm-pane";
import { ChestsPane } from "@/components/chests/chests-pane";
import { RunesPane } from "@/components/runes/runes-pane";
import { GearPane } from "@/components/gear/gear-pane";
import { useRecommendation } from "@/lib/recommendation-context";
import { LanguageSelect } from "@/components/language-select";

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
      <LanguageSelect />
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

// ── Active pane ───────────────────────────────────────────────────────────────

interface ActivePaneProps {
  tab: string;
  rec: NonNullable<ReturnType<typeof useRecommendation>["rec"]>;
  db: ReturnType<typeof useRecommendation>["db"];
  psd: ReturnType<typeof useRecommendation>["psd"];
  recalibrate: ReturnType<typeof useRecommendation>["recalibrate"];
}

function ActivePane({ tab, rec, db, psd, recalibrate }: ActivePaneProps) {
  if (tab === "farm") {
    return <FarmPane rec={rec} db={db} recalibrate={recalibrate} />;
  }
  if (tab === "baus") {
    return <ChestsPane rec={rec} db={db} />;
  }
  if (tab === "runas") {
    return <RunesPane rec={rec} />;
  }
  if (tab === "gear") {
    return <GearPane rec={rec} db={db} psd={psd} />;
  }
  return <Overview rec={rec} db={db} />;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const { status, rec, db, psd, recalibrate } = useRecommendation();
  const [tab, setTab] = useState("overview");

  return (
    <AppShell statusSlot={<StatusSlot />} activeTab={tab} onTabChange={setTab} ready={status === "ready"}>
      {status === "ready" && rec ? (
        <ActivePane tab={tab} rec={rec} db={db} psd={psd} recalibrate={recalibrate} />
      ) : (
        <ConnectSave />
      )}
    </AppShell>
  );
}
