// Oráculo completo do engine TBH — port verbatim de tbh-copilot/engine/test.cjs (todos os
// asserts, valores esperados copiados da fonte). Mapeamento: approx→approxPct, eq→eq, ok→ok.
// Chama recommend(db, psd, { elapsedSec: 0 }) uma vez (beforeAll) e afirma contra o resultado.
import { describe, it, beforeAll } from "vitest";
import { loadGameDB, getDemoSaveText } from "@tbh/game-data";
import type { GameDB, HeroStat, Recommendation } from "../src/types";
import type { LevelInfo } from "../src/leveling";
import {
  parseSave,
  recommend,
  heroStats,
  mitigation,
  gold,
  powerDelta,
  dropBands,
  dropStages,
  favFarm,
  inventory,
  storageGrid,
  chestInfo,
  chestPlan,
  OFFLINE_GOLD_RUNES,
  OFFLINE_EXP_RUNES,
  OFFLINE_UNLOCK_RUNE,
} from "../src/index";
import { approxPct, eq, ok } from "./helpers";

let db: GameDB;
let psd: ReturnType<typeof parseSave>;
let r: Recommendation;

// Accessors tipados (substituem byHero/byLvl do oráculo sob noUncheckedIndexedAccess).
const H = (hk: number): HeroStat => {
  const h = r.heroes.find((x) => x.heroKey === hk);
  if (!h) throw new Error(`hero ${hk} ausente em r.heroes`);
  return h;
};
const L = (hk: number): LevelInfo => {
  const l = r.level.find((x) => x.heroKey === hk);
  if (!l) throw new Error(`level ${hk} ausente em r.level`);
  return l;
};

beforeAll(async () => {
  db = await loadGameDB();
  psd = parseSave(getDemoSaveText());
  r = recommend(db, psd, { elapsedSec: 0 });
});

describe("power (corrected stage-dependent armor formula @ stage level 23)", () => {
  it("hero POWER + party DPS + carry", () => {
    approxPct(H(201).power, 307, 10, "Ranger 201 POWER");
    approxPct(H(401).power, 579, 10, "Priest 401 POWER");
    // Sorcerer e partyDPS corrigidos pelo fix do dano elemental (dmgMult /100→/1000): o
    // Sorcerer (caster AOE elemental) era super-avaliado. 405→~334, partyDPS 967→~852.
    // Valores antigos herdados do copilot com o bug; escala /1000 confirmada in-game.
    approxPct(H(301).power, 334, 10, "Sorcerer 301 POWER (elemental /1000)");
    approxPct(r.meta.partyDPS, 852, 10, "party DPS (elemental /1000)");
    eq(r.meta.carryHero, 201, "damage carry = Ranger 201");
    ok((r.meta.carryShare ?? 0) > 0.4, "carry share > 40% (Ranger is the plurality carry; correct crit ends the old fake monopoly)");
    approxPct(H(201).stats.AttackSpeed ?? 0, 245, 5, "Ranger AttackSpeed (raw)");
  });
  it("Ranger crit is a sane fraction", () => {
    ok((H(201).stats.CriticalChance ?? 0) / 1000 < 1, "Ranger crit is a sane fraction, not capped at 100%");
    ok(Math.abs((H(201).stats.CriticalChance ?? 0) / 1000 - 0.0972) < 0.01, "Ranger crit ~9.7% (raw 97.2)");
  });
});

describe("leveling", () => {
  it("XP to next + cap", () => {
    eq(L(201).expToNext, 5549195, "201 XP to next");
    eq(L(401).expToNext, 3970760, "401 XP to next");
    eq(L(301).expToNext, 3926742, "301 XP to next");
    ok(L(201).cap === 100, "level cap 100");
  });
});

describe("idle", () => {
  it("offline rewards", () => {
    ok(r.idle.unlocked, "offline unlocked (rune 11001)");
    eq(r.idle.stageLevel, 23, "parked stage level 23");
    eq(r.idle.fullGold, 134400, "full-window gold");
    eq(r.idle.fullExp, 1723200, "full-window exp");
    ok(r.idle.bestPark != null, "best park stage computed");
  });
});

describe("runes", () => {
  it("almost-free list + first DPS path", () => {
    const afKeys = r.runes.almostFree.map((x) => x.key);
    ok(Array.isArray(afKeys), "almost-free list computed (none affordable at this save state)");
    ok(r.runes.almostFree.every((x) => x.cost <= r.runes.afThreshold), "all almost-free within threshold");
    const fdp = r.runes.firstDpsPath;
    ok(!!fdp && fdp.target === 413, "first DPS path targets the next DPS rune");
    approxPct(fdp!.totalCost, 530000, 5, "path-cost to the DPS rune");
    const rTgt = fdp!.steps.find((x) => x.key === fdp!.target);
    ok(!!rTgt && /AttackDamage/.test(rTgt.st), "DPS-path target is an attack-damage rune");
  });
});

describe("gear", () => {
  it("swaps + jewelry + weapon type", () => {
    eq(r.gear.swaps.length, 1, "one worthwhile gear swap at this save state");
    eq(r.gear.emptyJewelry.length, 12, "empty jewelry slots (4/hero × 3)");
    const rangerWeapon = r.gear.slots.find((s) => s.heroKey === 201 && s.slot === 0);
    ok(!!rangerWeapon && !!rangerWeapon.current && rangerWeapon.current.gearType === "BOW", "Ranger main weapon is a BOW");
  });
});

describe("farm (forward-only)", () => {
  it("recommend / push / frontier invariants", () => {
    const cur = r.farm.current;
    const rec = r.farm.recommend;
    const push = r.farm.push;
    const front = r.farm.frontier;
    ok(!!rec, "farm recommendation exists");
    ok(!cur || rec!.idx >= cur.idx, "recommendation is not below current stage");
    ok(!push || (front != null && push.idx === front.idx), "push is the next stage to clear (the frontier)");
    ok(front != null && front.idx >= (cur ? cur.idx : 0), "frontier ≥ current");
  });
});

describe("rune tree", () => {
  it("nodes / edges / status / coords / categories", () => {
    const rt = r.runeTree;
    const nodeCount = Object.keys(rt.nodes).length;
    ok(nodeCount === 197, `tree has 197 nodes (got ${nodeCount})`);
    ok(!!rt.bounds && !!rt.edges && rt.edges.length > 100, "tree has bounds + edges");
    const nodes = Object.values(rt.nodes);
    ok(nodes.some((n) => n.status === "owned"), "some nodes owned");
    ok(nodes.some((n) => n.status === "locked"), "some nodes locked");
    ok(nodes.every((n) => typeof n.x === "number" && typeof n.y === "number"), "every node has x/y coords");
    ok(nodes.some((n) => n.cat === "combat") && nodes.some((n) => n.cat === "gold"), "categories assigned");
  });
});

describe("party comp + survival", () => {
  it("front-line + tank rec + survival sim", () => {
    ok(!!r.partyComp && r.partyComp.hasFront === true, "Priest counts as the front-line (heals/sustains)");
    eq(r.partyComp.recommendTank, null, "no tank pushed when a Priest already fronts the party");
    ok(r.partyComp.roles.length === 6, "all 6 heroes classified");
    ok(r.partyComp.roles.find((x) => x.heroKey === 101)?.role === "tank", "Knight classified as tank");
    ok(!r.actions.some((a) => a.k === "party_tank"), "no tank recommendation when the Priest fronts the party");
    const surv = r.survival;
    ok(!!surv && !!surv.stageKey && typeof surv.margin === "number", "survival sim computed for push stage");
    ok(["comfortable", "tight", "risky"].includes(surv!.rating), "survival rating valid");
    ok(!!db.stageThreat["1206"] && db.stageThreat["1206"]!.hit > 0, "stage threat data present");
  });
});

describe("enchant advisor", () => {
  it("open affix slots + action", () => {
    ok(!!r.enchant && r.enchant.totalOpen > 30, `enchant advisor finds open affix slots (got ${r.enchant && r.enchant.totalOpen})`);
    ok(r.enchant.perHero.every((h) => h.open > 0 && !!h.stat && typeof h.dPower === "number"), "per-hero enchant has open slots + stat + ΔPOWER");
    ok(r.actions.some((a) => a.k === "gear_enchant"), "gear_enchant action present");
  });
});

describe("AP advisor", () => {
  it("recommends a node per hero with unspent AP", () => {
    ok(r.ap.length >= 1 && r.ap.every((a) => (a.ap ?? 0) >= 1 && !!a.best), "AP advisor recommends a node for each hero with unspent AP");
  });
});

describe("armor mitigation", () => {
  it("mitigation drops at higher stage + incoming damage", () => {
    const rs = (psd.heroSaveDatas ?? []).find((h) => h.heroKey === 201)!;
    const st201 = heroStats(db, rs, psd, undefined, 18).stats;
    ok(mitigation(st201.Armor ?? 0, 50, 300) < mitigation(st201.Armor ?? 0, 18, 0), "armor mitigation drops at higher stage + incoming damage");
  });
});

describe("economy + planners", () => {
  it("alchemy / gearProgression / pets / runeROI / goldPlan / goal / synthesis / xp / forecast", () => {
    ok(!!r.alchemy && r.alchemy.sellGold > 0, `alchemy value of loose gear (got ${r.alchemy && r.alchemy.sellGold}g)`);
    ok(!!r.gearProgression && r.gearProgression.gap > 0 && r.gearProgression.advice === "push_for_drops", "gear is below frontier push for drops");
    ok(!!r.pets && r.pets.unlocked.length > 0 && !!r.pets.bestGold, "pet advisor finds unlocked pets + best for gold");
    ok(!!r.runeROI && r.runeROI.length > 0 && (r.runeROI[0]?.perGold ?? 0) > 0, "rune ROI ranking present");
    ok(!!r.goldPlan && Array.isArray(r.goldPlan.cart), "gold-spend cart computed");
    ok(!!(r.goal && typeof r.goal.levelGap === "number" && r.goal.rating), "reverse goal planner for push stage");
    ok(Array.isArray(r.synthesis), "synthesis plan computed");
    const xp201 = r.xpForecast.find((x) => x.heroKey === 201);
    const t100 = xp201?.targets.find((t) => t.level === 100);
    ok(!!xp201 && !!t100 && t100.xp > 1e9, "XP forecast to L100 (~40B XP)");
    ok(!!r.forecast && Array.isArray(r.forecast.nextLevel), "forecast/timeline computed");
  });
});

describe("skill DPS", () => {
  it("per-hero + party skill DPS", () => {
    ok(r.heroes.every((h) => typeof h.skillDpsEst === "number"), "per-hero skill-DPS estimate present");
    ok(H(201).skillDpsEst < H(201).dps, "skill-DPS is a minor add vs the carry auto-attack (kept separate)");
    ok(typeof r.meta.partySkillDps === "number", "party skill-DPS total in meta");
  });
});

describe("data integrity (hardcoded keys vs DB)", () => {
  it("offline rune keys + skip status + fire hint", () => {
    const grantsOf = (k: number | string): string[] => {
      const rd = db.runes[k];
      const rl = rd ? db.runeLevels[rd.ldk] : null;
      return rl ? Object.values(rl).filter(Boolean).map((x) => x.st) : [];
    };
    const offlineChecks: [number[], string][] = [
      [OFFLINE_GOLD_RUNES, "OfflineRewardGoldPercent"],
      [OFFLINE_EXP_RUNES, "OfflineRewardExpPercent"],
    ];
    for (const [keys, st] of offlineChecks) {
      ok(keys.every((k) => !!db.runes[k]), `${st} rune keys all exist in the DB`);
      ok(keys.every((k) => grantsOf(k).includes(st)), `${st} rune keys all grant that stat`);
    }
    ok(grantsOf(OFFLINE_UNLOCK_RUNE).includes("UnlockOfflineReward"), "offline unlock rune key grants UnlockOfflineReward");
    const skipNodes = Object.values(r.runeTree.nodes).filter((n) => n.status === "skip");
    ok(skipNodes.every((n) => (n.cost ?? 0) > gold(psd)), "no skip-status rune is actually affordable (skip is relative to gold)");
    ok(r.actions.some((a) => a.k === "fire_protection"), "fire hint present while facing the fire maps");
  });
});

describe("drop finder", () => {
  it("bands / stages / favFarm", () => {
    const bowEntry = Object.entries(db.items).find(([, v]) => v.gt === "BOW" && v.lvl === 15 && v.grade === "COMMON");
    ok(!!bowEntry, "a lv15 COMMON bow exists in the DB");
    const bowKey = Number(bowEntry![0]);
    const bands15 = dropBands(db, bowKey);
    ok(bands15.some((b) => b.band === 15), "lv15 bow drops from the Lv15 box band");
    ok(bands15.every((b) => b.chance > 0 && b.chance < 1), "drop chances are sane fractions");
    const dStages = dropStages(db, bowKey, psd);
    ok(dStages.length > 0 && dStages.every((x) => !!db.stages[x.key]), "drop stages resolve to real stages");
    ok(dStages.some((x) => x.unlocked) || dStages.every((x) => !x.unlocked), "unlocked flag computed");
    const ffm = favFarm(db, psd, [bowKey]);
    ok(Array.isArray(ffm), "favFarm computes");
    if (ffm.length) ok(ffm[0]!.favs.length >= 1 && ffm[0]!.score > 0, "favFarm top stage carries the favorite");
  });
});

describe("inventory / stash", () => {
  it("locations / grades / types / grid", () => {
    const inv = inventory(db, psd);
    ok(inv.length === (psd.itemSaveDatas ?? []).length, `inventory returns every item instance (${inv.length})`);
    ok(inv.every((i) => ["equipped", "stash", "inventory", "trading", "loose"].includes(i.loc)), "every item has a valid location");
    ok(inv.filter((i) => i.loc === "equipped").length > 0, "some items resolve as equipped");
    ok(inv.filter((i) => i.loc === "stash").length > 0, "some items resolve to the stash");
    ok(inv.filter((i) => i.grade === "LEGENDARY").length > 0, "grade filter has legendaries to find");
    ok(inv.filter((i) => i.type === "GEAR").length > 0 && inv.filter((i) => i.type === "MATERIAL").length > 0, "both gear and materials present");
    ok(inv.every((i) => i.level == null || (i.level >= 1 && i.level <= 100)), "item levels are sane");
    const equippedSlots = inv.filter((i) => i.loc === "equipped");
    ok(equippedSlots.every((i) => i.hero != null && i.slot != null), "equipped items carry their hero + slot");
    const grid = storageGrid(psd, "stash");
    ok(grid.length > 0, `stash grid has slots (${grid.length})`);
    ok(grid.every((s, i) => s.slot === i), "stash grid slots are contiguous in Index order");
    ok(grid.some((s) => !!s.uid) && grid.some((s) => !s.uid), "stash grid has both filled and empty slots");
    ok(grid.filter((s) => s.uid).length === inv.filter((i) => i.loc === "stash").length, "filled stash slots match the stash item count");
  });
});

describe("chest timers", () => {
  it("auto-open base / cooldown / capacity", () => {
    const ch = chestInfo(db, psd);
    ok(!!(ch.normal && ch.boss && ch.act), "chestInfo returns all three chest types");
    ok(ch.normal.unlocked && ch.normal.base === 300, "normal chest base auto-open is 300s when unlocked");
    ok(ch.boss.base === 600 && ch.act.base === 60, "boss/act chest base cooldowns read from the save");
    ok(ch.normal.cooldown === ch.normal.base - ch.normal.reduce, "effective cooldown = base minus rune reduction");
    ok(ch.normal.cooldown <= ch.normal.base && ch.normal.cooldown >= 1, "effective cooldown is sane");
    ok(ch.normal.capacity >= 0 && Number.isFinite(ch.normal.capacity), "chest capacity from runes is a number");
  });
});

describe("chest planner", () => {
  it("drop cadence / types / best / wishlist routing", () => {
    const cp = chestPlan(db, psd, { farm: r.farm, favKeys: [] });
    ok(cp.dropCooldown === 300, "shared field-drop cooldown is ~5 min (300s)");
    ok(cp.types.length === 3, "chestPlan returns the three chest types");
    const cpN = cp.types.find((t) => t.kind === "normal")!;
    const cpB = cp.types.find((t) => t.kind === "boss")!;
    const cpA = cp.types.find((t) => t.kind === "act")!;
    ok(cpN.fillSec === null, "an auto-opened type faster than the drop cadence never fills (fillSec null)");
    ok(cpB.slowOpen === true, "boss auto-open (600s) is slower than the 300s drop cadence -> flagged slowOpen");
    ok(!cpA.unlocked && cpA.fillSec === cpA.capacity * cp.dropCooldown, "a locked (no auto-open) type fills at capacity x drop cadence");
    ok(!!cp.best && cp.source === "recommend", "with no wishlist the best chest stage falls back to the farm recommend");
    ok(cp.best!.clearsPerWindow === cp.dropCooldown / cp.best!.clearTime!, "clears-per-window = drop cooldown / real clear time");
    const favItem = inventory(db, psd).find((i) => i.key && i.grade);
    const favKey = favItem ? favItem.key : null;
    const cpFav = chestPlan(db, psd, { farm: r.farm, favKeys: favKey ? [favKey] : [] });
    ok(!favKey || (cpFav.source === "wishlist" && (cpFav.best?.favCount ?? 0) >= 1), "a starred gear key routes the best chest stage to the wishlist farm");
  });
});

describe("power delta (gear)", () => {
  it("weapon swap raises POWER, leaves EHP unchanged", () => {
    const rangerSave = (psd.heroSaveDatas ?? []).find((h) => h.heroKey === 201)!;
    const d = powerDelta(db, rangerSave, psd, 0, 314141);
    // Valor corrigido: 314141 tem `AttackSpeed MULTIPLICATIVE 160`. O copilot original (e o
    // oráculo herdado dele) escalava MULTIPLICATIVE por /100 → ×2,6 → dPower inflado (>1000).
    // A escala correta do jogo é /1000 → ×1,16, e o swap sobe POWER ~601. Esta asserção
    // diverge do copilot DE PROPÓSITO (copilot estava errado aqui — ver o fix do divisor em
    // stats.ts `aggregate`, confirmado pelo tooltip in-game: MULTIPLICATIVE 171 = +17,1%).
    approxPct(d.dPower, 601, 5, `swapping Ranger bow->314141 raises POWER by ${Math.round(d.dPower * 100) / 100} (~601, divisor /1000 corrigido)`);
    ok(Math.abs(d.dEhp) < 1, "pure weapon swap leaves EHP unchanged");
  });
});

describe("recommend() includes chests", () => {
  it("chests field is populated on the Recommendation result", () => {
    ok(!!r.chests, "r.chests is truthy");
    ok(r.chests.dropCooldown > 0, "r.chests.dropCooldown > 0");
    ok(r.chests.types.length === 3, "r.chests.types.length === 3");
  });
});
