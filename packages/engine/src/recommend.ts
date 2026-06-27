// recommend() + buildActions() — capstone do engine TBH.
// Port fiel de tbh-copilot/engine/engine.js (~836-907). Mudança de assinatura vs.
// o original: `db: GameDB` é o 1º parâmetro de `recommend` (consistente com o resto
// do engine), e é threaded em cada helper que toca o DB (bestFarm(db, …), runePlan(db, …), …).
import type { GameDB, PlayerSaveData, RecommendOpts, Recommendation, Action, HeroStat } from "./types";
import { PARAMS, runeContrib, heroSaveMap, refStageLevel, party, heroStats, gold, maxPartyLevel } from "./stats";
import { bestFarm, bestParkStage, lastClearedKey, type FarmResult } from "./farm";
import { levelInfo, xpForecast } from "./leveling";
import { idleInfo, type IdleInfo } from "./idle";
import { runePlan, runeTreeStatus, runeROI, goldPlan, type RunePlan } from "./runes";
import { gearAdvisor, enchantAdvisor, apAdvisor, gearProgression, type GearAdvice, type EnchantAdvice } from "./gear";
import { survival, goalPlan } from "./survival";
import { partyComp, type PartyComp } from "./party";
import { petAdvisor, type PetAdvice } from "./pets";
import { alchemyValue, synthesisPlan, type SynthesisPlan } from "./inventory";
import { forecast, ticksToUnix } from "./misc";

/** Entrada de `buildActions`: o subconjunto do recommend() que alimenta o coach. */
export interface BuildActionsInput {
  farm: FarmResult;
  runes: RunePlan;
  gear: GearAdvice;
  idle: IdleInfo;
  heroes: HeroStat[];
  carry: HeroStat | null;
  comp: PartyComp;
  enchant: EnchantAdvice;
  pets: PetAdvice;
  synth: SynthesisPlan;
}

export function buildActions(x: BuildActionsInput): Action[] {
  const a: Action[] = [];
  if (x.runes.almostFree.length)
    a.push({ k: "rune_almostfree", n: x.runes.almostFree.length, items: x.runes.almostFree.slice(0, 4).map((r) => r.key) });
  if (x.farm.recommend && x.farm.current && x.farm.recommend.key !== x.farm.current.key)
    a.push({ k: "farm_switch", from: x.farm.current.key, to: x.farm.recommend.key });
  else if (x.farm.push) a.push({ k: "farm_push", to: x.farm.push.key, lvl: x.farm.push.lvl });
  // Beginner hint for the fire wall: stages 3-6..3-9 (lvl 28-31) deal fire damage. Only
  // warn while the frontier is approaching or inside that band — a player who already
  // cleared past it obviously survived and the hint would just be noise.
  {
    const fr = x.farm;
    const reach = Math.max((fr.current && fr.current.lvl) || 0, (fr.frontier && fr.frontier.lvl) || 0);
    if (reach >= 26 && reach <= 31 && x.heroes.length) {
      let front: HeroStat | null = null;
      for (const h of x.heroes) if (!front || (h.ehp || 0) > (front.ehp || 0)) front = h;
      const st: Record<string, number> = (front && front.stats) || {};
      const res = (st.FireResistance || 0) + (st.AllElementalResistance || 0);
      if (res < 30) a.push({ k: "fire_protection", lvl: reach, res: Math.round(res), hero: front ? front.heroKey : null });
    }
  }
  if (x.runes.firstDpsPath) a.push({ k: "rune_dps_path", target: x.runes.firstDpsPath.target, cost: x.runes.firstDpsPath.totalCost });
  if (x.comp && x.comp.recommendTank) a.push({ k: "party_tank", hero: x.comp.recommendTank });
  if (x.enchant && x.enchant.totalOpen > 0) a.push({ k: "gear_enchant", n: x.enchant.totalOpen });
  if (x.gear.swaps.length) a.push({ k: "gear_swap", n: x.gear.swaps.length });
  if (x.gear.emptyJewelry.length) a.push({ k: "gear_jewelry", n: x.gear.emptyJewelry.length });
  const s0 = x.synth[0];
  if (x.synth.length && s0) a.push({ k: "synthesis", grade: s0.grade, n: s0.fuses });
  if (x.pets && x.pets.bestGold && x.pets.arranged !== x.pets.bestGold.petKey) a.push({ k: "pet_swap", pet: x.pets.bestGold.petKey });
  return a;
}

export function recommend(db: GameDB, psd: PlayerSaveData, opts?: RecommendOpts): Recommendation {
  const o = opts ?? {};
  const rstats = runeContrib(db, psd);
  const hsm = heroSaveMap(psd);
  const refSL = refStageLevel(db, psd);
  const heroes: HeroStat[] = party(psd)
    .map((hk) => {
      const hs = hsm[hk];
      return hs ? heroStats(db, hs, psd, rstats, refSL) : null;
    })
    .filter((h): h is HeroStat => h != null);
  const D = heroes.reduce((acc, h) => acc + h.dps, 0);
  const partySkillDps = heroes.reduce((acc, h) => acc + (h.skillDpsEst || 0), 0);
  const partyEHP = heroes.length ? Math.min(...heroes.map((h) => h.ehp)) : 0;
  const farm = bestFarm(db, psd, D, {
    heroes,
    measuredGoldPerSec: o.goldPerSec,
    measuredExpPerSec: o.expPerSec,
    measuredClearSec: o.clearSec,
    clearSamples: o.clearSamples,
  });
  const epsCur = farm.current ? farm.current.expPerSec : farm.bestExp ? farm.bestExp.expPerSec : 0;
  const gpsCur = farm.current ? farm.current.goldPerSec : farm.bestGold ? farm.bestGold.goldPerSec : 0;
  const level = party(psd).map((hk) => levelInfo(db, hsm[hk]!, epsCur));
  const elapsed =
    o.elapsedSec != null
      ? o.elapsedSec
      : psd.commonSaveData.lastSavedTime
        ? Date.now() / 1000 - ticksToUnix(psd.commonSaveData.lastSavedTime)
        : null;
  const idle = idleInfo(db, psd, elapsed);
  idle.bestPark = bestParkStage(db, psd, D);

  const runes = runePlan(db, psd, o.goldPerSec, refSL);
  const runeTree = runeTreeStatus(db, psd, o.goldPerSec, refSL);
  const gear = gearAdvisor(db, psd, refSL);
  const pushKey = farm.push ? farm.push.key : farm.frontier ? farm.frontier.key : null;
  const refKey = lastClearedKey(db, psd);
  const surv = pushKey
    ? survival(db, psd, heroes, D, pushKey, refKey != null && db.stages[refKey] ? refKey : null)
    : null;
  const comp = partyComp(db, psd);
  const enchant = enchantAdvisor(db, psd, refSL);
  const ap = apAdvisor(db, psd, refSL);
  const pets = petAdvisor(db, psd);
  const alchemy = alchemyValue(db, psd);
  const gearProg = gearProgression(db, psd, farm.frontier ? farm.frontier.lvl : refSL);
  const roi = runeROI(db, psd, o.goldPerSec, refSL);
  const goldShop = goldPlan(db, psd, o.goldPerSec, refSL);
  const goal = farm.push ? goalPlan(db, psd, heroes, D, farm.push.key) : null;
  const synth = synthesisPlan(db, psd);
  const xp = xpForecast(db, psd, epsCur);
  const fc = forecast(psd, level, idle, gpsCur);
  const carry = heroes.slice().sort((aa, bb) => bb.dps - aa.dps)[0] || null;
  const actions = buildActions({ farm, runes, gear, idle, heroes, carry, comp, enchant, pets, synth });
  return {
    meta: {
      party: party(psd),
      gold: gold(psd),
      maxPartyLevel: maxPartyLevel(psd),
      currentStage: String(psd.commonSaveData.currentStageKey),
      partyDPS: D,
      partySkillDps,
      partyEHP,
      carryHero: carry ? carry.heroKey : null,
      carryShare: carry && D ? carry.dps / D : null,
    },
    heroes,
    farm,
    level,
    idle,
    runes,
    runeTree,
    gear,
    survival: surv,
    partyComp: comp,
    enchant,
    ap,
    pets,
    alchemy,
    gearProgression: gearProg,
    runeROI: roi,
    goldPlan: goldShop,
    goal,
    synthesis: synth,
    xpForecast: xp,
    forecast: fc,
    actions,
    coach: actions[0] || null,
    params: PARAMS,
  };
}
