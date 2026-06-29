"use client";

import React, { useState } from "react";
import { Swords, Shield, Crown } from "lucide-react";
import type { GameDB, HeroStat } from "@tbh/engine";
import type { LevelInfo } from "@tbh/engine";
import { fmt, fmtK, fmtDur, heroIcon, heroName } from "@/lib/format";
import { useEntityLocale } from "@/lib/entity-locale";

// ── HeroSprite ──────────────────────────────────────────────────────────────
// Portrait with graceful fallback: a missing/broken sprite collapses to the
// hero's initial on a quiet surface, so name + POWER never lose their anchor.

interface HeroSpriteProps {
  hk: number;
  db: GameDB | null;
  size?: number;
  className?: string;
}

export function HeroSprite({ hk, db, size = 48, className = "" }: HeroSpriteProps) {
  const [broken, setBroken] = useState(false);
  const { locale } = useEntityLocale();
  const src = heroIcon(hk, db);
  const name = heroName(hk, db, locale);

  if (!src || broken) {
    return (
      <div
        aria-hidden="true"
        style={{ width: size, height: size }}
        className={`grid place-items-center rounded-md bg-surface-2 text-dim font-display font-semibold ${className}`}
      >
        {name.charAt(0)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
      onError={() => setBroken(true)}
      className={`rounded-md object-cover ${className}`}
    />
  );
}

// ── HeroCard ────────────────────────────────────────────────────────────────

interface HeroCardProps {
  hero: HeroStat;
  level?: LevelInfo;
  db: GameDB | null;
  partyDPS: number;
  isCarry: boolean;
}

export function HeroCard({ hero, level, db, partyDPS, isCarry }: HeroCardProps) {
  const { locale } = useEntityLocale();
  const hk = hero.heroKey;
  const share = partyDPS > 0 ? hero.dps / partyDPS : 0;
  const ap = level?.ap ?? 0;
  const eta = level?.etaSec ?? null;
  const expToNext = level?.expToNext ?? 0;
  const maxed = (level?.level ?? 0) >= (level?.cap ?? Infinity);

  return (
    <div
      className={[
        "group relative rounded-lg border bg-surface p-3.5 transition-colors duration-150",
        isCarry
          ? "border-gold/45 hover:border-gold/70"
          : "border-line hover:border-dim/45 hover:bg-surface-2/60",
      ].join(" ")}
    >
      {/* Carry marker */}
      {isCarry && (
        <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-gold/12 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gold">
          <Crown className="size-3" aria-hidden="true" />
          Carry
        </span>
      )}

      {/* Identity + POWER */}
      <div className="flex items-start gap-3">
        <HeroSprite
          hk={hk}
          db={db}
          size={46}
          className={isCarry ? "ring-1 ring-gold/50" : "ring-1 ring-line"}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[14px] font-semibold leading-tight text-text">
            {heroName(hk, db, locale)}
          </p>
          <p className="mt-0.5 text-[12px] font-body text-dim">
            {hero.cls ?? "—"} · Lv {level?.level ?? hero.level ?? "—"}
          </p>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-dim/80 tabular-nums">
              POWER
            </span>
            <span className="text-[17px] font-semibold leading-none text-gold tabular-nums">
              {fmt(hero.power)}
            </span>
            {ap > 0 && (
              <span
                title="Pontos de habilidade não usados"
                className="ml-auto inline-flex items-center gap-1 rounded bg-gold/12 px-1.5 py-0.5 text-[10px] font-medium text-gold tabular-nums"
              >
                <span className="size-1.5 rounded-full bg-gold" aria-hidden="true" />
                {ap} AP
              </span>
            )}
          </div>
        </div>
      </div>

      {/* DPS share bar (teal) */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] font-body text-dim">
          <span className="uppercase tracking-wider">DPS share</span>
          <span className="tabular-nums">{Math.round(share * 100)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/50">
          <div
            className="h-full rounded-full bg-teal transition-[width] duration-500"
            style={{ width: `${Math.max(2, Math.min(100, share * 100))}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex items-center gap-4 border-t border-line/60 pt-2.5 text-[12px]">
        <span className="inline-flex items-center gap-1.5 text-dim">
          <Swords className="size-3.5 text-teal" aria-hidden="true" />
          <span className="tabular-nums text-text">{fmtK(hero.dps)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-dim">
          <Shield className="size-3.5 text-dim" aria-hidden="true" />
          <span className="tabular-nums text-text">{fmtK(hero.ehp)}</span>
        </span>
        <span className="ml-auto text-right text-[11px] text-dim tabular-nums">
          {maxed ? (
            <span className="text-gold/80">MAX</span>
          ) : (
            <>
              +{fmtK(expToNext)} XP
              {eta != null && <span className="text-dim/70"> · {fmtDur(eta)}</span>}
            </>
          )}
        </span>
      </div>
    </div>
  );
}
