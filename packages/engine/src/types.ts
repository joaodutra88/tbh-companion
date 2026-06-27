// Estrutura do save (note o typo "curreny" — vem assim do jogo, manter)
export interface PlayerSaveData {
  currenySaveDatas?: { Key: number; Quantity: number }[];
  commonSaveData: {
    arrangedHeroKey?: (number | null)[];
    currentStageKey: number | string;
    maxCompletedStage?: number;
    lastSavedTime?: number | string;
    ArrangedPetKey?: number;
  };
  heroSaveDatas?: HeroSave[];
  itemSaveDatas?: ItemSave[];
  RuneSaveData?: { RuneKey: number; Level: number }[];
  attributeSaveDatas?: { Key: number; Level: number }[];
  aggregateSaveDatas?: { Type: number; SubKey: number; Value: number }[];
  PetSaveData?: { PetKey: number; IsUnlock: boolean }[];
  stashSaveDatas?: StorageSlot[];
  inventorySaveDatas?: StorageSlot[];
  tradingStashSaveDatas?: StorageSlot[];
}

export interface HeroSave {
  heroKey: number; HeroLevel?: number; HeroExp?: number;
  AbilityPoint?: number; AllocatedHeroAbilityPoint?: number;
  equippedItemIds?: (number | string)[]; equippedSKillKey?: number[];
}

export interface ItemSave {
  UniqueId: number | string; ItemKey: number;
  EnchantData?: { StatModKey?: number; Tier?: number; Value?: number }[];
  EnchantCount?: number[]; IsBlocked?: boolean; IsChaotic?: boolean;
}

export interface StorageSlot { Index: number; ItemUniqueId?: number | string; IsUnLock?: boolean; IsUnlock?: boolean; }

// Estrutura do DB do jogo (todas as tabelas que o engine consome)
export interface GameDB {
  runes: Record<string, { ldk: number | string; max: number; name: string; prevReq?: number }>;
  runeLevels: Record<string, Record<string, { st: string; v: number; cost: number }>>;
  heroes: Record<string, { cls: string; mainW?: string; subW?: string; skillKey?: number | string } & Record<string, number | string | undefined>>;
  items: Record<string, { gt?: string; grade?: string; lvl?: number; type?: string; name?: string; icon?: string }>;
  gear: Record<string, { b1?: number; b2?: number; inh?: [string, string, number][] }>;
  gearTypes: Record<string, { b1s?: string; b1m?: string; b2s?: string; b2m?: string }>;
  statMods: Record<string, { st: string; mt: string }>;
  attributes: Record<string, { hero: number; atype: string; val: number; grp: number | string; max: number }>;
  attributeGroups: Record<string, number>;
  passives: Record<string, { st: string; mt: string; v: number }>;
  skills: Record<string, { slot?: string; act?: string; cd?: number; lvlKey?: number | string; delivery?: string; dmgType?: string; DamageType?: string }>;
  skillLevels: Record<string, Record<string, number>>;
  stages: Record<string, { lvl: number; label?: string; diff?: string; gold: number; exp: number; totalHP: number; waves: number }>;
  stageOrder: number[];
  stageThreat: Record<string, { hit: number; dps: number; perWave?: number; elem?: string }>;
  levels: number[];
  offlineRewards: Record<string, { gold: number; exp: number; kills: number }>;
  runeTree: { edges: [number, number][]; starts?: number[] };
  runeNodes: Record<string, { x: number; y: number; cat: string }>;
  runeBounds: unknown;
  boxDrops: Record<string, [number, number][]>;
  dropGroups: Record<string, number[]>;
  itemSell: Record<string, number>;
  itemCubeExp: Record<string, number>;
  gradeSlots: Record<string, { extra: number }>;
  affixRep: Record<string, { value: number; mod: string }>;
  synthesis: Record<string, { amount: number }>;
  grades: string[];
  pets: Record<string, { name?: string; statKey: number | string }>;
  petStats: Record<string, { st: string; v: number }[]>;
  locales?: string[];
}

export interface RecommendOpts {
  elapsedSec?: number; goldPerSec?: number; expPerSec?: number;
  clearSec?: number; clearSamples?: { clearSec: number; hp: number; waves: number }[];
}

// Tipos reais retornados pelos módulos do engine (Tasks 4-5), usados para tipar
// `Recommendation` sem `any`. Imports só-de-tipo: erasados em runtime, sem ciclo real.
import type { FarmResult } from "./farm";
import type { LevelInfo, XpForecast } from "./leveling";
import type { IdleInfo } from "./idle";
import type { RunePlan, RuneTreeStatus, RuneROIList, GoldPlan } from "./runes";
import type { GearAdvice, ApAdvice, EnchantAdvice, GearProgression } from "./gear";
import type { Survival, GoalPlan } from "./survival";
import type { PartyComp } from "./party";
import type { PetAdvice } from "./pets";
import type { AlchemyValue, SynthesisPlan } from "./inventory";
import type { Forecast } from "./misc";
import type { Params } from "./stats";

export interface Recommendation {
  meta: { party: number[]; gold: number; maxPartyLevel: number; currentStage: string;
          partyDPS: number; partySkillDps: number; partyEHP: number;
          carryHero: number | null; carryShare: number | null };
  heroes: HeroStat[];
  farm: FarmResult;
  level: LevelInfo[];
  idle: IdleInfo;
  runes: RunePlan;
  runeTree: RuneTreeStatus;
  gear: GearAdvice;
  survival: Survival; // Survival já inclui `| null`
  partyComp: PartyComp;
  enchant: EnchantAdvice;
  ap: ApAdvice;
  pets: PetAdvice;
  alchemy: AlchemyValue;
  gearProgression: GearProgression;
  runeROI: RuneROIList;
  goldPlan: GoldPlan;
  goal: GoalPlan; // GoalPlan já inclui `| null`
  synthesis: SynthesisPlan;
  xpForecast: XpForecast;
  forecast: Forecast;
  actions: Action[];
  coach: Action | null;
  params: Params;
}

export interface HeroStat {
  heroKey: number; cls?: string; level?: number;
  stats: Record<string, number>; dps: number; autoDps: number; skillDpsEst: number;
  ehp: number; power: number; delivery: string; stageLevel: number;
  contrib: Record<string, Record<string, number[]>>;
}

export interface Action { k: string; [extra: string]: unknown; }
