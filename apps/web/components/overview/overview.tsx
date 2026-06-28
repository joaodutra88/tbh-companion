"use client";

import React from "react";
import type { GameDB, Recommendation } from "@tbh/engine";
import { CoachCard } from "./coach-card";
import { MetaStrip } from "./meta-strip";
import { Roster } from "./roster";
import { DoNow } from "./do-now";

// ── Overview ──────────────────────────────────────────────────────────────────
// The signature screen: coach briefing → meta strip → party roster + do-now.
// Sections enter with a subtle staggered reveal (disabled under reduced-motion
// via the global reset in globals.css).

interface OverviewProps {
  rec: Recommendation;
  db: GameDB | null;
}

export function Overview({ rec, db }: OverviewProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 md:px-6 md:py-6">
      <div className="reveal">
        <CoachCard rec={rec} db={db} />
      </div>

      <div className="reveal" style={{ animationDelay: "60ms" }}>
        <MetaStrip rec={rec} />
      </div>

      <div
        className="reveal grid grid-cols-1 gap-4 lg:grid-cols-3"
        style={{ animationDelay: "120ms" }}
      >
        <div className="lg:col-span-2">
          <Roster rec={rec} db={db} />
        </div>
        <DoNow rec={rec} db={db} />
      </div>
    </div>
  );
}
