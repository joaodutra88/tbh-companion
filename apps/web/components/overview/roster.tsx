"use client";

import React from "react";
import { Users } from "lucide-react";
import type { GameDB, Recommendation } from "@tbh/engine";
import { HeroCard } from "./hero-card";

// ── Roster ──────────────────────────────────────────────────────────────────
// Party heroes sorted by POWER desc → grid of HeroCards. The leveling info is
// keyed by heroKey; the carry (by DPS) gets a marker on its card.

interface RosterProps {
  rec: Recommendation;
  db: GameDB | null;
}

export function Roster({ rec, db }: RosterProps) {
  const heroes = [...rec.heroes].sort((a, b) => b.power - a.power);
  const levelByHero = new Map(rec.level.map((l) => [l.heroKey, l]));

  return (
    <section aria-label="Party">
      <div className="mb-2.5 flex items-center gap-2">
        <Users className="size-3.5 text-dim" aria-hidden="true" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-dim">
          Party
        </h2>
        <span className="text-[11px] text-dim/60 tabular-nums">
          {heroes.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {heroes.map((hero) => (
          <HeroCard
            key={hero.heroKey}
            hero={hero}
            level={levelByHero.get(hero.heroKey)}
            db={db}
            partyDPS={rec.meta.partyDPS}
            isCarry={rec.meta.carryHero === hero.heroKey}
          />
        ))}
      </div>
    </section>
  );
}
