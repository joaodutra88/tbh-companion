// Party composition — port fiel de engine.js (~603-615).
import type { GameDB, PlayerSaveData } from "./types";
import { party, heroSaveMap } from "./stats";

const num = (v: number | string | undefined): number => (typeof v === "number" ? v : 0);

export const ROLE: Record<string, string> = {
  Knight: "tank",
  Slayer: "bruiser",
  Priest: "support",
  Ranger: "dps",
  Hunter: "dps",
  Sorcerer: "caster",
};

const tankiness = (db: GameDB, hk: number | string): number => {
  const h = db.heroes[String(hk)];
  return num(h?.MaxHp) + num(h?.Armor) * 10;
};

export function partyComp(db: GameDB, psd: PlayerSaveData) {
  const fielded = party(psd),
    solo = fielded.length <= 1;
  const inParty = new Set(fielded),
    hsm = heroSaveMap(psd);
  const roles = Object.entries(db.heroes).map(([ks, h]) => {
    const hk = Number(ks);
    return {
      heroKey: hk,
      cls: h.cls,
      role: ROLE[h.cls] || "dps",
      fielded: inParty.has(hk),
      tank: tankiness(db, hk),
      level: hsm[hk]?.HeroLevel || 0,
    };
  });
  const hasFront = roles.some((r) => r.fielded && (r.role === "tank" || r.role === "bruiser" || r.role === "support"));
  const bench = roles.filter((r) => !r.fielded && (r.role === "tank" || r.role === "bruiser")).sort((a, b) => b.tank - a.tank);
  return { roles, hasFront, solo, recommendTank: !solo && !hasFront && bench[0] ? bench[0].heroKey : null };
}
