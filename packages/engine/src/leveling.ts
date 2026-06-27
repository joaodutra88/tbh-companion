// Leveling / XP — port fiel de engine.js (~210-222, 238-251, 617-622).
// `cumXP` era construído no module-load a partir de DB; aqui vira função `cumXP(db)`
// memoizada por-db (WeakMap), preservando o comportamento idêntico.
import type { GameDB, PlayerSaveData, HeroSave } from "./types";
import { heroSaveMap, party } from "./stats";
import { fitFactor } from "./farm";

export interface LevelInfo {
  heroKey: number;
  level: number;
  cap: number;
  heroExp: number;
  expToNext: number;
  pct: number;
  ap: number;
  etaSec: number | null;
}

const cumXPCache = new WeakMap<GameDB, number[]>();
/** Soma cumulativa de XP por nível (cum[0]=0). Builder memoizado por-db. */
export function cumXP(db: GameDB): number[] {
  const cached = cumXPCache.get(db);
  if (cached) return cached;
  const cum = [0];
  for (let i = 0; i < db.levels.length; i++) cum.push(cum[i]! + (db.levels[i] || 0));
  cumXPCache.set(db, cum);
  return cum;
}

export function expToNext(db: GameDB, level: number, heroExp?: number): number {
  const inc = db.levels[level - 1] || 0;
  return Math.max(0, inc - (heroExp || 0));
}

export function partyExp(db: GameDB, psd: PlayerSaveData): number {
  const hsm = heroSaveMap(psd);
  const cum = cumXP(db);
  let t = 0;
  for (const k of party(psd)) {
    const h = hsm[k];
    if (h) t += (cum[(h.HeroLevel || 1) - 1] || 0) + (h.HeroExp || 0);
  }
  return t;
}

export function levelInfo(db: GameDB, heroSave: HeroSave, eps?: number): LevelInfo {
  const L = heroSave.HeroLevel || 1,
    cap = 100,
    maxed = L >= cap;
  const need = maxed ? 0 : expToNext(db, L, heroSave.HeroExp || 0);
  const incr = db.levels[L - 1] || 0;
  const e = eps ?? 0;
  return {
    heroKey: heroSave.heroKey,
    level: L,
    cap,
    heroExp: heroSave.HeroExp || 0,
    expToNext: Math.round(need),
    pct: maxed ? 1 : incr ? Math.min(1, (heroSave.HeroExp || 0) / incr) : 1,
    ap: heroSave.AbilityPoint || 0,
    etaSec: maxed || !(e > 0) ? null : need / e,
  };
}

export function projectLevel(
  db: GameDB,
  startLevel: number,
  startExp: number | undefined,
  expPerSec: number,
  stageLvl: number,
  hours: number,
): number {
  if (!(expPerSec > 0)) return startLevel;
  const f0 = fitFactor(startLevel, stageLvl) || 1e-6;
  let L = startLevel,
    eil = startExp || 0,
    t = 0;
  const cap = hours * 3600;
  while (t < cap) {
    const rate = (expPerSec * fitFactor(L, stageLvl)) / f0;
    if (!(rate > 0)) break;
    const inc = db.levels[L - 1];
    if (!inc) break;
    const tl = (inc - eil) / rate;
    if (t + tl <= cap) {
      t += tl;
      L++;
      eil = 0;
      if (L > 200) break;
    } else {
      eil += rate * (cap - t);
      t = cap;
    }
  }
  const last = db.levels[L - 1];
  return L + (last ? eil / last : 0);
}

export function xpForecast(db: GameDB, psd: PlayerSaveData, eps?: number) {
  const hsm = heroSaveMap(psd);
  const e = eps ?? 0;
  const xpTo = (L: number, prog: number, target: number): number => {
    if (target <= L) return 0;
    let xp = (db.levels[L - 1] || 0) - prog;
    for (let l = L + 1; l < target; l++) xp += db.levels[l - 1] || 0;
    return Math.max(0, xp);
  };
  return party(psd).map((hk) => {
    const hs = hsm[hk],
      L = hs?.HeroLevel || 1,
      prog = hs?.HeroExp || 0;
    return {
      heroKey: hk,
      level: L,
      targets: [20, 30, 50, 100]
        .filter((t) => t > L)
        .map((t) => {
          const xp = xpTo(L, prog, t);
          return { level: t, xp, etaSec: e > 0 ? xp / e : null };
        }),
    };
  });
}

export type XpForecast = ReturnType<typeof xpForecast>;
