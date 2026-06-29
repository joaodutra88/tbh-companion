"use client";

import React from "react";
import { Crosshair, Check } from "lucide-react";
import type { GameDB, Recommendation } from "@tbh/engine";
import { actionText } from "@/lib/action-text";
import { heroName, pct } from "@/lib/format";
import { useEntityLocale } from "@/lib/entity-locale";
import { HeroSprite } from "./hero-card";

// ── CoachCard (signature) ─────────────────────────────────────────────────────
// The reason the app exists: the single next move, briefed like a war-table order.
// Carry sprite + the directive in display type, gold-accented and elevated.

interface CoachCardProps {
  rec: Recommendation;
  db: GameDB | null;
}

export function CoachCard({ rec, db }: CoachCardProps) {
  const { locale } = useEntityLocale();
  const directive = actionText(rec.coach, db, locale);
  const carry = rec.meta.carryHero;
  const carryShare = rec.meta.carryShare;
  const hasCoach = rec.coach != null;

  return (
    <section
      aria-label="Próxima jogada"
      className="relative overflow-hidden rounded-xl border border-gold/30 bg-gradient-to-br from-surface-2 via-surface to-surface p-5 shadow-[0_1px_0_0_rgba(232,176,75,0.12)_inset,0_18px_40px_-24px_rgba(0,0,0,0.8)] md:p-6"
    >
      {/* Decorative gold glow + top hairline (war-table accent) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-gold/10 blur-3xl"
      />
      {/* Oversized target watermark — fills the banner's right field (war-table motif) */}
      <Crosshair
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 top-1/2 hidden size-44 -translate-y-1/2 text-gold/[0.05] lg:block"
        strokeWidth={1}
      />

      <div className="relative flex items-center gap-5">
        {/* Carry sprite, framed */}
        {hasCoach && carry != null && (
          <div className="shrink-0">
            <div className="relative rounded-lg bg-bg/40 p-1.5 ring-1 ring-gold/40">
              <HeroSprite hk={carry} db={db} size={72} className="rounded-md" />
            </div>
            <p className="mt-1.5 max-w-[88px] truncate text-center text-[11px] font-body text-dim">
              {heroName(carry, db, locale)}
            </p>
          </div>
        )}

        {/* Briefing */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {hasCoach ? (
              <Crosshair className="size-3.5 text-gold" aria-hidden="true" />
            ) : (
              <Check className="size-3.5 text-teal" aria-hidden="true" />
            )}
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
              Próxima jogada
            </span>
          </div>

          <p className="mt-2 font-display text-[24px] font-semibold leading-snug tracking-[-0.01em] text-text md:text-[30px]">
            {directive}
          </p>

          {hasCoach && carry != null && (
            <p className="mt-2.5 text-[12px] font-body text-dim">
              <span className="text-dim/70">Carry:</span>{" "}
              <span className="text-text">{heroName(carry, db, locale)}</span>
              {carryShare != null && (
                <>
                  {" "}
                  ·{" "}
                  <span className="tabular-nums text-teal">{pct(carryShare)}</span>{" "}
                  do DPS da party
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
