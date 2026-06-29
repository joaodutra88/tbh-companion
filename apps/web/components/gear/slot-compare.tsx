"use client";

import React, { useMemo } from "react";
import type { GameDB, GearAdvice, PlayerSaveData, Recommendation } from "@tbh/engine";
import { heroSaveMap, powerDelta, runeContrib, refStageLevel } from "@tbh/engine";
import { itemIcon, gearName, gradeStyle, gearTypeLabel } from "@/lib/item-format";
import { scoreOwnedCandidates } from "@/lib/gear-candidates";

type SlotResult = GearAdvice["slots"][number];

interface SlotCompareProps {
  rec: Recommendation;
  db: GameDB;
  psd: PlayerSaveData;
  heroKey: number;
  slotResult: SlotResult;
}

function formatDelta(v: number): { text: string; colorClass: string } {
  const rounded = Math.round(v);
  if (rounded > 0) return { text: `+${rounded.toLocaleString("pt-BR")}`, colorClass: "text-teal" };
  if (rounded < 0) return { text: rounded.toLocaleString("pt-BR"), colorClass: "text-coral" };
  return { text: "0", colorClass: "text-dim" };
}

export function SlotCompare({
  rec,
  db,
  psd,
  heroKey,
  slotResult,
}: SlotCompareProps): React.ReactElement {
  const computed = useMemo(() => {
    const hsm = heroSaveMap(psd);
    const hs = hsm[heroKey];
    if (!hs) return null;

    const rstats = runeContrib(db, psd);
    const sl = refStageLevel(db, psd);
    const curUid = ((hs.equippedItemIds ?? [])[slotResult.slot]) || 0;

    const bestDelta =
      slotResult.best != null
        ? powerDelta(db, hs, psd, slotResult.slot, slotResult.best.itemKey, rstats, sl)
        : null;

    const candidates = scoreOwnedCandidates(
      db,
      psd,
      hs,
      slotResult.slot,
      slotResult.gearType,
    );

    // Identify exactly the first non-equipped copy of the best item so only one
    // row gets the MELHOR pill (duplicates of the same itemKey are excluded).
    const best = slotResult.best;
    const bestCandidate =
      best != null
        ? candidates.find(
            (c) => String(c.itemKey) === String(best.itemKey) && c.uniqueId !== curUid,
          )
        : undefined;
    const bestUid: number | string | null = bestCandidate?.uniqueId ?? null;

    return { hs, bestDelta, candidates, curUid, bestUid };
  }, [db, psd, heroKey, slotResult]);

  const isRecommendedSwap = rec.gear.swaps.some(
    (s) => s.heroKey === heroKey && s.slot === slotResult.slot,
  );

  const slotLabel = gearTypeLabel(slotResult.gearType);

  return (
    <aside
      aria-label="Comparador de itens"
      className="flex w-full flex-col gap-4 rounded-xl border border-line bg-surface-2 p-4 md:w-80"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-dim">
          {slotLabel}
        </h3>
        {isRecommendedSwap && (
          <span className="rounded border border-teal/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-teal">
            trocar
          </span>
        )}
      </div>

      {/* Current item */}
      <section aria-label="Item atual">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-dim">
          Atual
        </p>
        {slotResult.current != null ? (
          <ItemRow item={slotResult.current} db={db} size="md" />
        ) : (
          <p className="text-[12px] text-dim/60">Slot vazio</p>
        )}
      </section>

      {/* Best in slot */}
      <section aria-label="Melhor item">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-dim">
          Melhor no slot
        </p>
        {slotResult.best != null ? (
          <div className="flex flex-col gap-2">
            <ItemRow item={slotResult.best} db={db} size="md" />
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-surface p-2">
              <DeltaCell label="ΔPOWER" value={slotResult.best.dPower} gold />
              {computed?.bestDelta != null ? (
                <>
                  <DeltaCell label="ΔDPS" value={computed.bestDelta.dDps} />
                  <DeltaCell label="ΔEHP" value={computed.bestDelta.dEhp} />
                </>
              ) : (
                <>
                  <DeltaCell label="ΔDPS" value={0} placeholder />
                  <DeltaCell label="ΔEHP" value={0} placeholder />
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[12px] font-medium text-teal">
            {slotResult.empty ? "Slot vazio — equipe um item primeiro" : "Já é o melhor"}
          </p>
        )}
      </section>

      {/* Owned candidates */}
      {computed != null && computed.candidates.length > 0 && (
        <section aria-label="Candidatos em posse">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-dim">
            Itens em posse
          </p>
          <div className="flex flex-col gap-1.5">
            {computed.candidates.map((c) => {
              const isEquipped = c.uniqueId === computed.curUid;
              const isBest = computed.bestUid != null && c.uniqueId === computed.bestUid;
              const dpow = formatDelta(c.delta.dPower);

              return (
                <div
                  key={String(c.uniqueId)}
                  className="flex items-center gap-2 rounded-lg border border-line bg-surface p-2"
                  data-candidate={c.itemKey}
                >
                  <CandidateIcon itemKey={c.itemKey} db={db} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-text">
                      {gearName(c.itemKey)}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                      <GradeBadge grade={db.items[c.itemKey]?.grade} />
                      {isEquipped && <Pill label="equipado" color="gold" />}
                      {isBest && <Pill label="melhor" color="teal" />}
                      {!isEquipped && !isBest && <Pill label="tenho" color="dim" />}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 font-mono text-[13px] font-bold tabular-nums ${dpow.colorClass}`}
                    data-dpow
                  >
                    {dpow.text}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* No candidates fallback */}
      {computed != null && computed.candidates.length === 0 && (
        <p className="text-[11px] text-dim/60">Nenhum item em posse para este slot.</p>
      )}
    </aside>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

type DecodedItem = NonNullable<SlotResult["current"]>;

function ItemRow({
  item,
  db,
  size,
}: {
  item: DecodedItem;
  db: GameDB;
  size: "md";
}): React.ReactElement {
  const icon = itemIcon(item.itemKey, db);
  const imgSize = size === "md" ? "size-10" : "size-8";

  return (
    <div className="flex items-center gap-2">
      {icon !== "" ? (
        <img
          src={icon}
          alt=""
          aria-hidden="true"
          className={`${imgSize} shrink-0 rounded object-contain`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className={`${imgSize} shrink-0 rounded bg-surface`} />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-text">{gearName(item.itemKey)}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <GradeBadge grade={item.grade} />
          {item.level != null && (
            <span className="font-mono text-[11px] tabular-nums text-dim">Lv.{item.level}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function CandidateIcon({
  itemKey,
  db,
}: {
  itemKey: number;
  db: GameDB;
}): React.ReactElement {
  const icon = itemIcon(itemKey, db);
  return icon !== "" ? (
    <img
      src={icon}
      alt=""
      aria-hidden="true"
      className="size-8 shrink-0 rounded object-contain"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  ) : (
    <div className="size-8 shrink-0 rounded bg-surface-2" />
  );
}

function GradeBadge({ grade }: { grade?: string }): React.ReactElement | null {
  if (!grade) return null;
  const gs = gradeStyle(grade);
  return <span className={gs.className}>{gs.label}</span>;
}

function Pill({
  label,
  color,
}: {
  label: string;
  color: "gold" | "teal" | "dim";
}): React.ReactElement {
  const cls =
    color === "gold"
      ? "border-gold/40 text-gold"
      : color === "teal"
        ? "border-teal/40 text-teal"
        : "border-line/60 text-dim";
  return (
    <span
      className={`rounded border px-1 py-0 text-[9px] font-semibold uppercase tracking-[0.1em] ${cls}`}
    >
      {label}
    </span>
  );
}

function DeltaCell({
  label,
  value,
  gold,
  placeholder,
}: {
  label: string;
  value: number;
  gold?: boolean;
  placeholder?: boolean;
}): React.ReactElement {
  if (placeholder === true) {
    return (
      <div className="flex flex-col items-center">
        <span className="text-[9px] uppercase tracking-[0.1em] text-dim">{label}</span>
        <span className="font-mono text-[12px] tabular-nums text-dim">—</span>
      </div>
    );
  }
  const d = formatDelta(value);
  return (
    <div className="flex flex-col items-center">
      <span className="text-[9px] uppercase tracking-[0.1em] text-dim">{label}</span>
      <span
        className={`font-mono tabular-nums ${gold === true ? "text-[14px] font-bold text-gold" : `text-[12px] ${d.colorClass}`}`}
        data-dpow
      >
        {gold === true && value > 0 ? `+${Math.round(value).toLocaleString("pt-BR")}` : d.text}
      </span>
    </div>
  );
}
