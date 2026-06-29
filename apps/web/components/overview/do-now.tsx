"use client";

import React from "react";
import {
  Sparkles,
  Route,
  TrendingUp,
  Swords,
  Shield,
  Hammer,
  Gem,
  Anvil,
  PawPrint,
  Flame,
  CircleDot,
  type LucideIcon,
} from "lucide-react";
import type { GameDB, Recommendation } from "@tbh/engine";
import { actionText } from "@/lib/action-text";
import { useEntityLocale } from "@/lib/entity-locale";

// ── DoNow ─────────────────────────────────────────────────────────────────────
// The engine's prioritized action list (top ~8), each with a type icon. The coach
// card already promotes the #1 move; this is the rest of the checklist.

interface DoNowProps {
  rec: Recommendation;
  db: GameDB | null;
}

interface IconSpec {
  Icon: LucideIcon;
  color: string;
}

const ICONS: Record<string, IconSpec> = {
  rune_almostfree: { Icon: Sparkles, color: "text-gold" },
  farm_switch: { Icon: Route, color: "text-teal" },
  farm_push: { Icon: TrendingUp, color: "text-teal" },
  rune_dps_path: { Icon: Swords, color: "text-teal" },
  party_tank: { Icon: Shield, color: "text-dim" },
  gear_swap: { Icon: Hammer, color: "text-gold" },
  gear_enchant: { Icon: Sparkles, color: "text-gold" },
  gear_jewelry: { Icon: Gem, color: "text-gold" },
  synthesis: { Icon: Anvil, color: "text-dim" },
  pet_swap: { Icon: PawPrint, color: "text-dim" },
  fire_protection: { Icon: Flame, color: "text-coral" },
};

function iconFor(k: string): IconSpec {
  return ICONS[k] ?? { Icon: CircleDot, color: "text-dim" };
}

const MAX_ITEMS = 8;

export function DoNow({ rec, db }: DoNowProps) {
  const { locale } = useEntityLocale();
  const actions = rec.actions.slice(0, MAX_ITEMS);

  return (
    <section
      aria-label="Faça agora"
      className="rounded-lg border border-line bg-surface p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <CircleDot className="size-3.5 text-dim" aria-hidden="true" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-dim">
          Faça agora
        </h2>
      </div>

      {actions.length === 0 ? (
        <p className="py-4 text-center text-[14px] text-dim">—</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {actions.map((a, i) => {
            const { Icon, color } = iconFor(a.k);
            return (
              <li
                key={`${a.k}-${i}`}
                className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface-2/70"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-2">
                  <Icon className={`size-3.5 ${color}`} aria-hidden="true" />
                </span>
                <span className="text-[13px] font-body leading-snug text-text">
                  {actionText(a, db, locale)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
