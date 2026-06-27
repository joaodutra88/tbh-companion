# TBH Companion — Fase 1 (Fundação) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Montar o monorepo `tbh-companion` com o engine do TBH portado pra TypeScript (83 testes verdes), a camada de save no browser e uma página prova-de-vida deployada na Vercel.

**Architecture:** Monorepo pnpm + Turborepo. `packages/engine` (funções puras portadas do `engine.js`, recebe `GameDB` por injeção de dependência), `packages/game-data` (dados do jogo vendorizados + tipados), `apps/web` (Next.js App Router, client-first: decripta o save no browser, roda o engine, mostra o resultado). Save nunca sai do browser.

**Tech Stack:** pnpm, Turborepo, TypeScript (strict), Vitest, Next.js (App Router), React, Tailwind, shadcn/ui, GitHub Actions, Vercel.

## Global Constraints

- **Node:** 20 LTS (fixar em `.nvmrc` e `engines`; CI e Vercel em Node 20).
- **TypeScript:** `strict: true`. **Zero `any`** na API pública do engine (`packages/engine/src/index.ts` e tipos exportados). Onde a forma for incerta, usar `unknown` + narrowing.
- **Privacidade (trava dura):** o save é lido/decriptado **só no browser**; nenhum byte do save vai pra rede.
- **Engine = injeção de dependência:** o engine **não** lê globais (`window.TBH_DB`) nem importa `game-data`; o `GameDB` é sempre passado como parâmetro. `packages/engine` não tem dependência de runtime de `packages/game-data`.
- **Port fiel:** comportamento idêntico ao `engine.js` original. O oráculo são os 83 asserts; nenhum task de engine fecha sem os testes relevantes verdes.
- **Nomes de pacote:** `@tbh/engine`, `@tbh/game-data`, app `web`.
- **Fonte do port (referência de lógica):** `C:/Users/joao/Documents/01-projetos-2026/tbh-copilot/engine/engine.js`. Dados e fixture: `.../tbh-copilot/engine/{gamedata,gearnames,itemnames,materialfx,demo}.js`, `.../engine/fixtures/save_fixture.json`, `.../engine/test.cjs`.
- **Licença/atribuição:** MIT; creditar shigake (tbh-copilot) e lezards (giba-steam-market); disclaimer "fan project não-oficial".

---

## File Structure (decomposição)

```
tbh-companion/
├─ package.json · pnpm-workspace.yaml · turbo.json · tsconfig.base.json · .nvmrc · README.md · LICENSE
├─ .github/workflows/ci.yml
├─ packages/
│  ├─ engine/
│  │  ├─ package.json · tsconfig.json · vitest.config.ts
│  │  ├─ src/{types,stats,leveling,farm,idle,runes,gear,survival,party,pets,drops,chests,inventory,recommend,index}.ts
│  │  └─ test/{engine.test.ts, helpers.ts}
│  └─ game-data/
│     ├─ package.json · tsconfig.json · vitest.config.ts
│     ├─ scripts/vendor.mjs            # converte os IIFE do Co-pilot → JSON (one-shot)
│     ├─ src/{index,types-bridge}.ts
│     ├─ src/raw/{gamedata,gearnames,itemnames,materialfx}.json
│     ├─ src/raw/demo-save.json        # save decriptado da fixture (entrada do modo demo)
│     └─ test/game-data.test.ts
└─ apps/web/
   ├─ package.json · next.config.ts · tsconfig.json · tailwind.config.ts · postcss.config.mjs · components.json · vitest.config.ts
   ├─ app/{layout.tsx, page.tsx, globals.css, lab/page.tsx}
   ├─ lib/save/{decrypt.ts, decrypt.test.ts, connect.ts, demo.ts, index.ts}
   └─ lib/engine-bridge.ts             # loadGameDB() + runRecommend() helpers p/ a UI
```

Cada task abaixo termina num estado verificável. Tasks 4-6 (port) usam o `engine.js` original como fonte de lógica — traduzir fielmente pra TS com as assinaturas dadas; verde nos asserts = comportamento preservado.

---

### Task 1: Monorepo scaffold + tooling

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.nvmrc`
- Modify: `README.md`, `LICENSE` (já existe `.gitignore`)

**Interfaces:**
- Consumes: nada.
- Produces: workspace pnpm com Turborepo; `tsconfig.base.json` (strict) estendido por todos os pacotes; scripts raiz `pnpm test`/`pnpm typecheck`/`pnpm build` via turbo.

- [ ] **Step 1: Criar `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: Criar `.nvmrc`**

```
20
```

- [ ] **Step 3: Criar `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "noEmit": false
  }
}
```

- [ ] **Step 4: Criar `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

- [ ] **Step 5: Criar `package.json` raiz**

```json
{
  "name": "tbh-companion",
  "private": true,
  "packageManager": "pnpm@9",
  "engines": { "node": ">=20 <21" },
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "dev": "turbo run dev"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 6: Instalar e verificar**

Run: `pnpm install`
Expected: instala sem erro; cria `pnpm-lock.yaml`.

Run: `pnpm turbo run build`
Expected: "No tasks were executed" (nenhum pacote ainda) ou sucesso vazio — sem erro de config.

- [ ] **Step 7: README + LICENSE**

`README.md`: o que é (companion web do TBH unindo tbh-copilot + giba), status "Fase 1 — fundação", créditos a **shigake** e **lezards**, disclaimer "projeto de fã não-oficial, sem vínculo com a Valve nem com os criadores do TBH".
`LICENSE`: MIT no nome do projeto + bloco "Portions derived from tbh-copilot (© shigake, MIT) and giba-steam-market (© lezards, MIT)".

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm + turborepo monorepo (Node 20, TS strict)"
```

---

### Task 2: `packages/engine` skeleton + contratos de tipo

**Files:**
- Create: `packages/engine/package.json`, `packages/engine/tsconfig.json`, `packages/engine/src/types.ts`, `packages/engine/src/index.ts`

**Interfaces:**
- Consumes: `tsconfig.base.json`.
- Produces: tipos `GameDB`, `PlayerSaveData`, `Recommendation`, `RecommendOpts` (importados por game-data e apps/web); pacote `@tbh/engine` que typechecka.

- [ ] **Step 1: `packages/engine/package.json`**

```json
{
  "name": "@tbh/engine",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "typescript": "^5.6.0",
    "@tbh/game-data": "workspace:*"
  }
}
```

> `@tbh/game-data` é **devDependency** (só os testes do engine usam o DB real; o runtime do engine recebe o DB por parâmetro).

- [ ] **Step 2: `packages/engine/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: `src/types.ts` — contratos**

Definir as interfaces abaixo (campos exatos vêm do uso no `engine.js`; tipar os aninhados conforme necessário, **sem `any`**, usando `Record<string, ...>` e `unknown`+narrowing onde a forma variar). Estrutura mínima obrigatória:

```ts
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
  attributes: Record<string, { hero: number; atype: string; val: number; grp: number | string }>;
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
// Tipar conforme o retorno real de recommend() (ver Task 6). Começar amplo e refinar:
export interface Recommendation {
  meta: { party: number[]; gold: number; maxPartyLevel: number; currentStage: string;
          partyDPS: number; partySkillDps: number; partyEHP: number;
          carryHero: number | null; carryShare: number | null };
  heroes: HeroStat[];
  farm: unknown; level: unknown[]; idle: unknown; runes: unknown; runeTree: unknown;
  gear: unknown; survival: unknown; partyComp: unknown; enchant: unknown; ap: unknown;
  pets: unknown; alchemy: unknown; gearProgression: unknown; runeROI: unknown;
  goldPlan: unknown; goal: unknown; synthesis: unknown; xpForecast: unknown; forecast: unknown;
  actions: Action[]; coach: Action | null; params: Record<string, unknown>;
}
export interface HeroStat {
  heroKey: number; cls?: string; level?: number;
  stats: Record<string, number>; dps: number; autoDps: number; skillDpsEst: number;
  ehp: number; power: number; delivery: string; stageLevel: number;
  contrib: Record<string, Record<string, number[]>>;
}
export interface Action { k: string; [extra: string]: unknown; }
```

> Os campos `unknown` em `Recommendation` são refinados na Task 6 conforme o retorno real. Não usar `any`.

- [ ] **Step 4: `src/index.ts`**

```ts
export * from "./types";
// funções são re-exportadas nas tasks seguintes
```

- [ ] **Step 5: Typecheck**

Run: `pnpm -F @tbh/engine typecheck`
Expected: PASS (sem erros).

- [ ] **Step 6: Commit**

```bash
git add packages/engine
git commit -m "feat(engine): package skeleton + GameDB/PlayerSaveData/Recommendation contracts"
```

---

### Task 3: `packages/game-data` — vendorizar dados + loader tipado

**Files:**
- Create: `packages/game-data/package.json`, `tsconfig.json`, `vitest.config.ts`, `scripts/vendor.mjs`, `src/index.ts`, `src/raw/{gamedata,gearnames,itemnames,materialfx}.json`, `src/raw/demo-save.json`, `test/game-data.test.ts`

**Interfaces:**
- Consumes: `GameDB` (tipo, de `@tbh/engine`).
- Produces: `loadGameDB(): Promise<GameDB>` (dynamic import do blob grande), `getDemoSaveText(): string` (texto decriptado da fixture p/ o modo demo), tabelas auxiliares `gearNames`/`itemNames`/`materialFx`.

- [ ] **Step 1: `package.json`**

```json
{
  "name": "@tbh/game-data",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts", "./raw/gamedata.json": "./src/raw/gamedata.json" },
  "scripts": {
    "vendor": "node scripts/vendor.mjs",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": { "vitest": "^2.1.0", "typescript": "^5.6.0", "@tbh/engine": "workspace:*" }
}
```

- [ ] **Step 2: `tsconfig.json`** (igual ao engine: estende base, `noEmit`, inclui `src`/`test`).

- [ ] **Step 3: `scripts/vendor.mjs` — conversão one-shot dos IIFE → JSON**

Carrega cada arquivo IIFE do Co-pilot com um global falso e despeja o objeto como JSON. Caminho do Co-pilot fixo (ajustar se mover).

```js
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const CP = "C:/Users/joao/Documents/01-projetos-2026/tbh-copilot/engine";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "raw");
mkdirSync(OUT, { recursive: true });

function loadGlobal(file, prop) {
  const code = readFileSync(join(CP, file), "utf8");
  const sandbox = { module: { exports: {} }, exports: {}, require: () => ({}) };
  sandbox.globalThis = sandbox; sandbox.window = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  const val = sandbox[prop] ?? sandbox.module.exports?.[prop] ?? sandbox.module.exports;
  if (!val) throw new Error(`não achei ${prop} em ${file}`);
  return val;
}

writeFileSync(join(OUT, "gamedata.json"), JSON.stringify(loadGlobal("gamedata.js", "TBH_DB")));
writeFileSync(join(OUT, "gearnames.json"), JSON.stringify(loadGlobal("gearnames.js", "TBH_GEARNAMES")));
writeFileSync(join(OUT, "itemnames.json"), JSON.stringify(loadGlobal("itemnames.js", "TBH_ITEMNAMES")));
writeFileSync(join(OUT, "materialfx.json"), JSON.stringify(loadGlobal("materialfx.js", "TBH_MATFX")));

// demo save = texto decriptado da fixture (entrada do modo demo, exercita o engine)
const fx = JSON.parse(readFileSync(join(CP, "fixtures", "save_fixture.json"), "utf8"));
writeFileSync(join(OUT, "demo-save.json"), JSON.stringify({ playerSaveData: fx.PlayerSaveData.value }));
console.log("vendor: ok");
```

- [ ] **Step 4: Rodar a vendorização**

Run: `pnpm -F @tbh/game-data vendor`
Expected: cria `src/raw/{gamedata,gearnames,itemnames,materialfx}.json` e `demo-save.json`; log "vendor: ok".

- [ ] **Step 5: `src/index.ts` — loader tipado**

```ts
import type { GameDB } from "@tbh/engine";
import demoSave from "./raw/demo-save.json";

let cached: GameDB | null = null;
export async function loadGameDB(): Promise<GameDB> {
  if (cached) return cached;
  const mod = await import("./raw/gamedata.json");
  cached = (mod.default ?? mod) as unknown as GameDB;
  return cached;
}
export function getDemoSaveText(): string {
  return (demoSave as { playerSaveData: string }).playerSaveData;
}
export { default as gearNames } from "./raw/gearnames.json";
export { default as itemNames } from "./raw/itemnames.json";
export { default as materialFx } from "./raw/materialfx.json";
```

- [ ] **Step 6: `test/game-data.test.ts` — sanity dos dados**

```ts
import { describe, it, expect } from "vitest";
import { loadGameDB, getDemoSaveText } from "../src/index";

describe("game-data", () => {
  it("carrega o GameDB com as tabelas-chave", async () => {
    const db = await loadGameDB();
    expect(Object.keys(db.stages).length).toBeGreaterThan(10);
    expect(Array.isArray(db.stageOrder)).toBe(true);
    expect(Array.isArray(db.levels)).toBe(true);
    expect(db.levels.length).toBeGreaterThan(0);
    expect(Object.keys(db.runes).length).toBeGreaterThan(0);
  });
  it("expõe o save de demo como texto parseável", () => {
    const txt = getDemoSaveText();
    expect(typeof txt).toBe("string");
    expect(txt.length).toBeGreaterThan(100);
  });
});
```

- [ ] **Step 7: Rodar testes**

Run: `pnpm -F @tbh/game-data test`
Expected: 2 testes PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/game-data
git commit -m "feat(game-data): vendor TBH game data as typed JSON + demo save + loader"
```

---

### Task 4: Engine port — núcleo de stats/combate

**Files:**
- Create: `packages/engine/src/stats.ts`
- Modify: `packages/engine/src/index.ts`
- Test: `packages/engine/test/engine.test.ts` (criado parcialmente aqui; completado na Task 6)

**Fonte:** `tbh-copilot/engine/engine.js` linhas ~9-208.

**Interfaces:**
- Consumes: `GameDB`, `PlayerSaveData`, `HeroSave`, `HeroStat` (de `./types`).
- Produces (todas recebem `db: GameDB` como 1º ou 2º param conforme o caso — injeção de dependência):
  - `PARAMS` (constante), `GOLD_KEY`, `BASE_STATS`, `RUNE_MAP`
  - `parseSave(raw: string): PlayerSaveData`
  - `gold(psd): number`, `party(psd): number[]`, `heroSaveMap(psd)`, `itemSaveMap(psd)`, `maxPartyLevel(psd): number`
  - `runeContrib(db, psd): Record<string, number>`
  - `gearStatLines(db, gearKey): [string, string, number][]`
  - `collect(db, heroSave, psd, runeStats)`, `aggregate(c): Record<string, number>`
  - `dps(s)`, `ehp(s, sl, dmg)`, `power(...)`, `mitigation(armor, sl, dmg)`
  - `heroStats(db, heroSave, psd, runeStats?, stageLevel?): HeroStat`
  - `powerDelta(db, heroSave, psd, slot, newGearKey, runeStats?, stageLevel?)`

- [ ] **Step 1: Portar `stats.ts`** — traduzir fielmente da fonte (linhas 9-208): `PARAMS`, constantes, `parseSave`, helpers de save (`gold`/`party`/`heroSaveMap`/`itemSaveMap`/`maxPartyLevel`), `runeContrib`, `gearStatLines`, `collect`, `aggregate`, helpers de combate (`atkPerSec`/`critChance`/`critMult`/`avgHit`/`dmgMult`/`dps`/`dpsOf`), `mitigation`/`mitigMult`/`ehp`/`power`, DPS de skill (`skillLevelOf`/`skillDpsEst`/`effDpsOf`/`effPower`), `refStageLevel`/`refDamage`, `heroStats`, `powerDelta`. Substituir todo acesso a `DB` por `db` (parâmetro). Tipar com os contratos da Task 2.

- [ ] **Step 2: Re-exportar em `index.ts`**

```ts
export * from "./types";
export * from "./stats";
```

- [ ] **Step 3: Smoke test (subconjunto do oráculo)** — criar `test/engine.test.ts` com o setup + 4 asserts de POWER:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { loadGameDB, getDemoSaveText } from "@tbh/game-data";
import type { GameDB } from "../src/types";
import { parseSave, heroStats, runeContrib, party, heroSaveMap } from "../src/index";

let db: GameDB; let psd: ReturnType<typeof parseSave>;
const approxPct = (got: number, want: number, tolPct: number) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(Math.abs(want) * tolPct / 100);

beforeAll(async () => { db = await loadGameDB(); psd = parseSave(getDemoSaveText()); });

describe("stats core (POWER @ stage level 23)", () => {
  it("hero POWERs batem com o oráculo", () => {
    const hsm = heroSaveMap(psd); const rc = runeContrib(db, psd);
    const p = (hk: number) => heroStats(db, hsm[hk], psd, rc).power;
    approxPct(p(201), 307, 10);
    approxPct(p(401), 579, 10);
    approxPct(p(301), 405, 10);
    expect(party(psd)).toContain(201);
  });
});
```

- [ ] **Step 4: Rodar**

Run: `pnpm -F @tbh/engine test`
Expected: 1 teste PASS (3 asserts de POWER dentro de ±10%).

- [ ] **Step 5: Commit**

```bash
git add packages/engine
git commit -m "feat(engine): port stat/combat core to TS (DI of GameDB), POWER smoke green"
```

---

### Task 5: Engine port — módulos de domínio

**Files:**
- Create: `packages/engine/src/{leveling,farm,idle,runes,gear,survival,party,pets,drops,chests,inventory}.ts`
- Modify: `packages/engine/src/index.ts`

**Fonte:** `engine.js` linhas ~210-835 (tudo menos `recommend`/`buildActions`).

**Interfaces:**
- Consumes: tudo da Task 4 + `GameDB`.
- Produces (todas com `db` injetado): `cumXP`, `expToNext`, `partyExp`, `levelInfo`, `projectLevel`, `xpForecast` · `fitFactor`, `fitClearModel`, `stageRates`, `bestFarm`, `bestParkStage`, `stageUnlocked`, `lastClearedKey` · `offlineBonuses`, `offlineUnlocked`, `idleInfo` · `runeParent`(builder), `runeReq`, `ownedRuneLevels`, `runeUnlocked`, `runePartyPowerDelta`, `runePlan`, `runeTreeStatus`, `runeROI`, `goldPlan` · `decodeItem`, `slotGearType`, `gearAdvisor`, `apAdvisor`, `enchantAdvisor` · `stageDanger`, `survival` · `partyComp` · `petAdvisor` · `dropBands`, `dropStages`, `favFarm`, `bandOfLevel` · `chestInfo`, `chestPlan` · `inventory`, `storageGrid` · `goalPlan`, `forecast`, `ticksToUnix`, `alchemyValue`, `synthesisPlan`, `gearProgression`, `totalClears`, `aggVal`.

> Atenção: estruturas montadas no module-load do original (`runeParent`, `cumXP`) dependiam de `DB`. No port, transformá-las em funções que recebem `db` (ex.: `runeParent(db)`) ou builders memoizados por `db`. `cumXP` vira `cumXP(db)`.

- [ ] **Step 1: Portar os módulos** — um arquivo por grupo (ver File Structure), traduzindo fielmente da fonte e injetando `db`. Agrupar por domínio: `leveling.ts`, `farm.ts`, `idle.ts`, `runes.ts`, `gear.ts`, `survival.ts`, `party.ts`, `pets.ts`, `drops.ts`, `chests.ts`, `inventory.ts`.

- [ ] **Step 2: Re-exportar todos em `index.ts`**

```ts
export * from "./types"; export * from "./stats"; export * from "./leveling";
export * from "./farm"; export * from "./idle"; export * from "./runes";
export * from "./gear"; export * from "./survival"; export * from "./party";
export * from "./pets"; export * from "./drops"; export * from "./chests";
export * from "./inventory";
```

- [ ] **Step 3: Typecheck**

Run: `pnpm -F @tbh/engine typecheck`
Expected: PASS.

- [ ] **Step 4: Smoke de farm (oráculo parcial)** — adicionar ao `engine.test.ts`:

```ts
import { bestFarm, runeContrib as rc2, heroStats as hs2, party as p2, heroSaveMap as hsm2 } from "../src/index";
it("bestFarm calibra e recomenda um stage farmável", () => {
  const hsm = hsm2(psd); const rcv = rc2(db, psd);
  const heroes = p2(psd).map(hk => hs2(db, hsm[hk], psd, rcv));
  const D = heroes.reduce((a, h) => a + h.dps, 0);
  const f = bestFarm(db, psd, D, {});
  expect(f.recommend).toBeTruthy();
  expect(typeof f.recommend.goldPerSec).toBe("number");
});
```

Run: `pnpm -F @tbh/engine test`
Expected: testes PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine
git commit -m "feat(engine): port domain modules (farm/runes/gear/idle/chests/drops/...) to TS"
```

---

### Task 6: Engine — `recommend()` + porta os 83 testes (oráculo completo)

**Files:**
- Create: `packages/engine/src/recommend.ts`, `packages/engine/test/helpers.ts`
- Modify: `packages/engine/src/index.ts`, `packages/engine/test/engine.test.ts`, `packages/engine/src/types.ts` (refinar `Recommendation`)

**Fonte:** `engine.js` linhas ~836-918 (`recommend`, `buildActions`); asserts em `engine/test.cjs`.

**Interfaces:**
- Consumes: tudo das Tasks 4-5.
- Produces: `recommend(db: GameDB, psd: PlayerSaveData, opts?: RecommendOpts): Recommendation`, `buildActions(...)`. **Nota de assinatura:** padronizar `db` como 1º parâmetro de `recommend` (consistente com o resto do engine). A UI e os testes chamam `recommend(db, psd, opts)`.

- [ ] **Step 1: Portar `recommend.ts`** — traduzir `recommend` + `buildActions` da fonte, com `db` injetado. Montar o objeto de retorno idêntico ao original (mesmas chaves). Refinar os campos `unknown` de `Recommendation` em `types.ts` conforme os tipos reais retornados (ex.: `farm: FarmResult`, `idle: IdleInfo`), tipando os sub-objetos sem `any`.

- [ ] **Step 2: Re-exportar**

```ts
export * from "./recommend";
```

- [ ] **Step 3: `test/helpers.ts` — helpers do oráculo (espelham test.cjs)**

```ts
import { expect } from "vitest";
export const approxPct = (got: number, want: number, tolPct: number, label: string) =>
  expect(Math.abs(got - want), label).toBeLessThanOrEqual(Math.abs(want) * tolPct / 100);
export const eq = <T>(got: T, want: T, label: string) => expect(got, label).toStrictEqual(want);
export const ok = (cond: boolean, label: string) => expect(cond, label).toBe(true);
```

- [ ] **Step 4: Portar os 83 asserts** — em `engine.test.ts`, replicar **todos** os asserts do `engine/test.cjs` (mapear `approx`→`approxPct`, `eq`→`eq`, `ok`→`ok`), chamando `recommend(db, psd, { elapsedSec: 0 })`. Agrupar em `describe` por seção (power, farm, runes, gear, idle, chests, etc.), uma `it` por assert ou por grupo coeso. Copiar os valores esperados verbatim da fonte.

- [ ] **Step 5: Rodar o oráculo completo**

Run: `pnpm -F @tbh/engine test`
Expected: **83/83 asserts PASS** (todos os `it` verdes).

- [ ] **Step 6: Typecheck final do engine**

Run: `pnpm -F @tbh/engine typecheck`
Expected: PASS, zero `any` na API pública.

- [ ] **Step 7: Commit**

```bash
git add packages/engine
git commit -m "feat(engine): port recommend()+buildActions; 83-assert oracle suite green"
```

---

### Task 7: `apps/web` — scaffold Next.js + camada de save

**Files:**
- Create: `apps/web/{package.json,next.config.ts,tsconfig.json,tailwind.config.ts,postcss.config.mjs,components.json}`, `apps/web/app/{layout.tsx,page.tsx,globals.css}`, `apps/web/lib/save/{decrypt.ts,decrypt.test.ts,connect.ts,demo.ts,index.ts}`, `apps/web/vitest.config.ts`

**Interfaces:**
- Consumes: `@tbh/engine` (`parseSave`, tipos), `@tbh/game-data` (`getDemoSaveText`).
- Produces: `decryptSave(buf: ArrayBuffer): Promise<string>`, `connectViaPicker(): Promise<string>`, `watchSaveFile(onChange): Promise<() => void>` (FSA), `loadDemoText(): string`, `readSave(source): Promise<PlayerSaveData>`.

- [ ] **Step 1: Scaffold do Next.js** — criar `apps/web` com Next.js (App Router) + Tailwind + shadcn/ui.

Run: `pnpm create next-app@latest apps/web --ts --app --tailwind --eslint --src-dir=false --import-alias "@/*" --use-pnpm --no-turbopack`
Depois: `cd apps/web && pnpm dlx shadcn@latest init -d`
Expected: app criado; `apps/web/components.json` existe; Tailwind configurado.

- [ ] **Step 2: Ligar workspaces** — em `apps/web/package.json`, adicionar deps:

```json
"dependencies": { "@tbh/engine": "workspace:*", "@tbh/game-data": "workspace:*", "next": "...", "react": "...", "react-dom": "..." }
```

Run (na raiz): `pnpm install`
Expected: linka os pacotes do workspace.

- [ ] **Step 3: `lib/save/decrypt.ts` — Web Crypto (porta da fonte `dashboard.html`)**

```ts
const PASSWORD = "emuMqG3bLYJ938ZDCfieWJ"; // chave ES3 pública do jogo

export async function decryptSave(buf: ArrayBuffer): Promise<string> {
  const b = new Uint8Array(buf);
  const iv = b.slice(0, 16);
  const ct = b.slice(16);
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(PASSWORD), { name: "PBKDF2" }, false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: iv, iterations: 100, hash: "SHA-1" },
    base, { name: "AES-CBC", length: 128 }, false, ["decrypt"],
  );
  const out = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, ct));
  return new TextDecoder().decode(out);
}

// helper de teste: cifra com o MESMO esquema (round-trip), não usado em produção
export async function encryptSaveForTest(plaintext: string): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(PASSWORD), { name: "PBKDF2" }, false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: iv, iterations: 100, hash: "SHA-1" },
    base, { name: "AES-CBC", length: 128 }, false, ["encrypt"],
  );
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, new TextEncoder().encode(plaintext)));
  const out = new Uint8Array(16 + ct.length); out.set(iv, 0); out.set(ct, 16);
  return out.buffer;
}
```

- [ ] **Step 4: `lib/save/decrypt.test.ts` — round-trip**

```ts
import { describe, it, expect } from "vitest";
import { decryptSave, encryptSaveForTest } from "./decrypt";

describe("decryptSave", () => {
  it("faz round-trip (encrypt→decrypt) preservando o texto", async () => {
    const plain = JSON.stringify({ hello: "tbh", n: 12345678901234567 });
    const buf = await encryptSaveForTest(plain);
    expect(await decryptSave(buf)).toBe(plain);
  });
});
```

> Nota: roda em ambiente com Web Crypto. Em `apps/web/vitest.config.ts` usar `environment: "jsdom"` ou `node` (Node 20 tem `crypto.subtle` global). Preferir `node`.

- [ ] **Step 5: `lib/save/demo.ts`, `connect.ts`, `index.ts`**

`demo.ts`:
```ts
import { getDemoSaveText } from "@tbh/game-data";
export function loadDemoText(): string { return getDemoSaveText(); }
```

`connect.ts` — picker + File System Access live-watch:
```ts
import { decryptSave } from "./decrypt";

export async function connectViaPicker(): Promise<string> {
  const [handle] = await (window as any).showOpenFilePicker?.() ?? [];
  if (handle) { const file = await handle.getFile(); return decryptSave(await file.arrayBuffer()); }
  // fallback <input type=file>
  return new Promise((resolve, reject) => {
    const input = document.createElement("input"); input.type = "file";
    input.onchange = async () => { const f = input.files?.[0]; if (!f) return reject(new Error("sem arquivo"));
      resolve(await decryptSave(await f.arrayBuffer())); };
    input.click();
  });
}

// live-watch: re-lê quando o mtime do arquivo muda (Chrome/Edge). Retorna stop().
export async function watchSaveFile(onChange: (text: string) => void): Promise<() => void> {
  const picker = (window as any).showOpenFilePicker;
  if (!picker) throw new Error("File System Access não suportado neste browser");
  const [handle] = await picker();
  let last = 0, stopped = false;
  const tick = async () => {
    if (stopped) return;
    try { const file = await handle.getFile();
      if (file.lastModified !== last) { last = file.lastModified; onChange(await decryptSave(await file.arrayBuffer())); } }
    catch { /* arquivo temporariamente indisponível durante o save do jogo */ }
    if (!stopped) setTimeout(tick, 2000);
  };
  tick();
  return () => { stopped = true; };
}
```

`index.ts`:
```ts
import { parseSave } from "@tbh/engine";
import type { PlayerSaveData } from "@tbh/engine";
export * from "./decrypt"; export * from "./connect"; export * from "./demo";
export function textToSave(text: string): PlayerSaveData { return parseSave(text); }
```

- [ ] **Step 6: Build + testes do app**

Run: `pnpm -F web test`
Expected: round-trip PASS.

Run: `pnpm -F web build`
Expected: build do Next.js sucesso.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): scaffold Next.js (App Router, Tailwind, shadcn) + client-side save layer"
```

---

### Task 8: `/lab` — página prova-de-vida

**Files:**
- Create: `apps/web/lib/engine-bridge.ts`, `apps/web/app/lab/page.tsx`
- Test: `apps/web/lib/engine-bridge.test.ts`

**Interfaces:**
- Consumes: `@tbh/engine` (`recommend`), `@tbh/game-data` (`loadGameDB`), `lib/save`.
- Produces: `runRecommend(text: string): Promise<Recommendation>` (bridge); a página `/lab`.

- [ ] **Step 1: `lib/engine-bridge.ts`**

```ts
import { loadGameDB } from "@tbh/game-data";
import { recommend, parseSave, type Recommendation } from "@tbh/engine";
export async function runRecommend(text: string): Promise<Recommendation> {
  const db = await loadGameDB();
  return recommend(db, parseSave(text), { elapsedSec: 0 });
}
```

- [ ] **Step 2: `lib/engine-bridge.test.ts` — prova a cadeia que a página usa**

```ts
import { describe, it, expect } from "vitest";
import { getDemoSaveText } from "@tbh/game-data";
import { runRecommend } from "./engine-bridge";

describe("engine-bridge", () => {
  it("demo save → recommend() com coach e party DPS", async () => {
    const r = await runRecommend(getDemoSaveText());
    expect(r.meta.partyDPS).toBeGreaterThan(0);
    expect(r.coach).not.toBeNull();
    expect(r.heroes.length).toBeGreaterThan(0);
  });
});
```

Run: `pnpm -F web test`
Expected: PASS.

- [ ] **Step 3: `app/lab/page.tsx`** — client component:

```tsx
"use client";
import { useState } from "react";
import { connectViaPicker, watchSaveFile, loadDemoText } from "@/lib/save";
import { runRecommend } from "@/lib/engine-bridge";
import type { Recommendation } from "@tbh/engine";

export default function Lab() {
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [err, setErr] = useState<string>("");
  const load = async (text: string) => { try { setErr(""); setRec(await runRecommend(text)); } catch (e) { setErr(String(e)); } };
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>TBH Companion — /lab (prova-de-vida)</h1>
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <button onClick={() => load(loadDemoText())}>Demo</button>
        <button onClick={async () => load(await connectViaPicker())}>Conectar save</button>
        <button onClick={() => watchSaveFile(load).catch((e) => setErr(String(e)))}>Live-watch</button>
      </div>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      {rec && (
        <section>
          <p><b>Party DPS:</b> {Math.round(rec.meta.partyDPS)} · <b>EHP:</b> {Math.round(rec.meta.partyEHP)} · <b>Gold:</b> {rec.meta.gold}</p>
          <p><b>Coach:</b> {rec.coach ? rec.coach.k : "—"}</p>
          <ul>{rec.heroes.map((h) => <li key={h.heroKey}>#{h.heroKey} {h.cls} L{h.level} · POWER {Math.round(h.power)} · DPS {Math.round(h.dps)}</li>)}</ul>
          <details><summary>JSON cru</summary>
            <pre style={{ maxHeight: 400, overflow: "auto", fontSize: 11 }}>{JSON.stringify(rec, null, 2)}</pre>
          </details>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Build**

Run: `pnpm -F web build`
Expected: build sucesso; rota `/lab` presente.

- [ ] **Step 5: Verificação manual (dev)**

Run: `pnpm -F web dev` e abrir `http://localhost:3000/lab` → clicar **Demo** → ver Party DPS/EHP/coach/roster e o JSON cru.
Expected: números reais aparecem (mesmos do oráculo, ~DPS 967).

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): /lab proof-of-life — connect save, run engine, show numbers + JSON"
```

---

### Task 9: CI (GitHub Actions) + Vercel + publicação

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: tudo. Produces: CI verde + deploy Vercel + repo público.

- [ ] **Step 1: `.github/workflows/ci.yml`**

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
```

- [ ] **Step 2: Verificar CI localmente (mesmos comandos)**

Run: `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test`
Expected: typecheck PASS; **83 asserts do engine + testes de game-data/web PASS**.

- [ ] **Step 3: Commit**

```bash
git add .github
git commit -m "ci: run typecheck + vitest on push (Node 20)"
```

- [ ] **Step 4: Criar repo público no GitHub (o usuário autentica)**

> Requer `gh auth login` rodado pelo João. Confirmar identidade pessoal (`joaodutra88`).

Run: `gh repo create tbh-companion --public --source=. --remote=origin --push`
Expected: repo criado e `main` enviada.

- [ ] **Step 5: Conectar Vercel (o usuário autentica)**

> Importar o repo na Vercel (dashboard ou `vercel` CLI). Root do projeto Next: `apps/web`. Build command padrão do Next; install na raiz (`pnpm install`). Framework: Next.js. Node 20.

Expected: deploy automático; URL viva.

- [ ] **Step 6: Verificação final na URL da Vercel**

Abrir `<url>/lab` → **Demo** mostra os números; **Conectar save** com um `.es3` real decripta e calcula; **Live-watch** atualiza ao mudar o save (Chrome/Edge).
Expected: todos os critérios de sucesso da Fase 1 atendidos.

---

## Self-Review (cobertura do spec)

- **D1 repo/GitHub público/Vercel** → Tasks 1, 9. **D2 MIT+créditos** → Task 1 (README/LICENSE). **D3 pnpm+Turbo+TS strict** → Task 1. **D4 App Router client-first** → Tasks 7, 8. **D5 engine no browser + DB code-split** → Task 3 (dynamic import) + Task 8 (browser). **D6 port fiel + 83 testes** → Tasks 4-6. **D7 vendar dados + tipar** → Task 3. **D8 save completo (picker+live-watch+demo)** → Task 7. **D9 prova-de-vida** → Task 8. **D10 CI+deploy** → Task 9. **D11 Tailwind+shadcn** → Task 7.
- **Critérios de sucesso:** `pnpm test` 83 verdes (Task 6); `/lab` na Vercel demo/picker/live-watch (Tasks 8-9); CI verde (Task 9); TS strict sem `any` (Tasks 2,6); README/LICENSE (Task 1). ✔ todos cobertos.
- **Placeholders:** nenhum "TBD"/"TODO"; código real nos passos de código novo; passos de port referenciam a fonte exata (faithful port) + oráculo de verificação.
- **Consistência de tipos:** `recommend(db, psd, opts)` (db 1º) usado igual em Tasks 6, 8; `loadGameDB`/`getDemoSaveText` definidos na Task 3 e consumidos nas Tasks 4,6,8; `decryptSave`/`connectViaPicker`/`watchSaveFile` definidos na Task 7 e usados na Task 8.

> **Observação de granularidade:** o port do engine (Tasks 4-6) é inerentemente acoplado (os 83 testes são integração contra a fixture), então a verificação sobe em rampa: smoke de POWER (T4) → smoke de farm (T5) → oráculo completo 83/83 (T6). Isso é intencional, não um placeholder.
</content>
