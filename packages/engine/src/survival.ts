// Survival / danger — port fiel de engine.js (~582-601, 813-819 goalPlan).
import type { GameDB, PlayerSaveData, HeroStat } from "./types";
import { ehp, maxPartyLevel } from "./stats";
import { clearTime, lastClearedKey } from "./farm";

export function stageDanger(db: GameDB, psd: PlayerSaveData, heroes: HeroStat[], D: number, stageKey: number | string) {
  const s = db.stages[String(stageKey)],
    threat = db.stageThreat[String(stageKey)];
  if (!s || !threat) return null;
  const partyEHP = heroes.reduce((a, h) => a + ehp(h.stats, s.lvl, threat.hit), 0);
  const incomingDps = threat.dps * Math.min(threat.perWave || 1, 4);
  const ct = clearTime(s, D);
  return {
    stageKey: String(stageKey),
    lvl: s.lvl,
    partyEHP,
    incomingDps,
    clearTime: ct,
    danger: (incomingDps * ct) / Math.max(1, partyEHP),
    elem: threat.elem,
  };
}

export function survival(
  db: GameDB,
  psd: PlayerSaveData,
  heroes: HeroStat[],
  D: number,
  pushKey: number | string,
  refKey?: number | string | null,
) {
  const push = stageDanger(db, psd, heroes, D, pushKey);
  if (!push) return null;
  const ref = refKey ? stageDanger(db, psd, heroes, D, refKey) : null;
  const readiness = ref && ref.danger > 0 ? ref.danger / push.danger : push.danger <= 1 ? 2 : 0.5;
  return {
    ...push,
    readiness,
    margin: readiness,
    refStage: ref ? ref.stageKey : null,
    rating: readiness >= 1 ? "comfortable" : readiness >= 0.6 ? "tight" : "risky",
    survivable: readiness >= 0.8,
  };
}

export function goalPlan(db: GameDB, psd: PlayerSaveData, heroes: HeroStat[], D: number, targetKey: number | string) {
  const s = db.stages[String(targetKey)];
  if (!s) return null;
  const refKey = lastClearedKey(db, psd);
  const sv = survival(db, psd, heroes, D, targetKey, refKey != null && db.stages[refKey] ? refKey : targetKey);
  return {
    stage: String(targetKey),
    label: s.label,
    level: s.lvl,
    levelGap: Math.max(0, s.lvl - maxPartyLevel(psd)),
    readiness: sv ? sv.readiness : null,
    rating: sv ? sv.rating : null,
    needsMorePower: sv ? sv.readiness < 0.8 : false,
  };
}
