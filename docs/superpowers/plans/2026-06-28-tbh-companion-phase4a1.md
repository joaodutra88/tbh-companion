# TBH Companion — Fase 4a.1 (Auto-cal + Auto-farm) Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development. War-table design (Fase 3). Checkbox steps.

**Goal:** Auto-calibrar o farm pelos deltas do save no live-watch (sem digitar), idle real (elapsed do lastSavedTime), e destacar "deixa rolando aqui" / "estaciona offline aqui".

## Global Constraints
Node 20; TS strict, zero `any`; war-table utilities (no inline var()); PT-BR; save client-only. Engine NÃO muda (já aceita goldPerSec/expPerSec/elapsedSec). Tests determinísticos passam `{elapsedSec:0}` explícito; o APP não força elapsedSec. Não quebrar Fases 1-4a (72 web + 106 engine).

---

### Task 1: engine-bridge `measureSave` + elapsed real + context auto-calibração
**Files:** `apps/web/lib/engine-bridge.ts`, `apps/web/lib/recommendation-context.tsx`, tests.
**Interfaces:** Produces `measureSave(text): { gold:number; partyExp:number; stageKey:number|string }`; `runRecommend(text, opts?)` sem forçar elapsedSec; context live-watch auto-cal via deltas.

- [ ] **Step 1: `engine-bridge.ts`** — `runRecommend(text, opts?: RecommendOpts)` → `const db = await loadGameDB(); return recommend(db, parseSave(text), opts ?? {});` (REMOVER o `{elapsedSec:0}` forçado — agora o engine calcula elapsed do lastSavedTime quando opts não traz elapsedSec). Add `export async function measureSave(text: string): Promise<{ gold:number; partyExp:number; stageKey:number|string }>` — `const db=await loadGameDB(); const psd=parseSave(text); return { gold: gold(psd), partyExp: partyExp(db, psd), stageKey: psd.commonSaveData.currentStageKey };` (importar `gold`, `partyExp` de `@tbh/engine`).
- [ ] **Step 2: tests existentes que dependem de determinismo** — em `engine-bridge.test.ts`/`overview-smoke`/`farm-smoke` que chamam `runRecommend(getDemoSaveText())`, se algum assert depender de idle/elapsed=0, passar `{elapsedSec:0}` explícito. (A maioria assere POWER/DPS/coach — não muda. Rodar e ajustar só o que quebrar.)
- [ ] **Step 3: context auto-cal** — refs: `prevSnapshotRef: { gold,partyExp,stageKey,atMs } | null`, `autoOptsRef: RecommendOpts`. No callback do `watchSaveFile` (cada tick): `const m = await measureSave(text); const now = Date.now();` se `prev && prev.stageKey===m.stageKey && (now-prev.atMs)/1000` ∈ [3,1800]: `const dt=(now-prev.atMs)/1000; const dExp=m.partyExp-prev.partyExp; const dGold=m.gold-prev.gold; autoOptsRef.current = { ...(dExp>0?{expPerSec:dExp/dt}:{}) , ...(dGold>0?{goldPerSec:dGold/dt}:{}) };`. Sempre `prevSnapshotRef.current = { ...m, atMs: now };`. Recompute: `runRecommend(text, { ...autoOptsRef.current, ...(optsRef.current ?? {}) })` (manual sobrescreve auto). Limpar `prevSnapshotRef`/`autoOptsRef` em `demo()`/`connect()`/`disconnect()` e no topo de `watch()`. (`optsRef` = o ref de calibração manual já existente.)
  - **Date.now()** é permitido (runtime de browser). Tipar tudo; zero `any`.
- [ ] **Step 4: test context** — mock `measureSave`+`runRecommend`; capturar o `onChange` do `watchSaveFile` mockado; invocar 2× com mesma stageKey e gold/exp crescentes (controlar Δt via mock de Date.now OR aceitar wall-clock pequeno e usar valores que caiam na janela — preferir injetar/mocar `Date.now`); assert que o 2º `runRecommend` recebeu `expPerSec`/`goldPerSec` derivados. 1 caso negativo (stageKey diferente → sem auto opts).
- [ ] **Step 5:** `pnpm -F web test` + `typecheck` + `build` verdes. **Commit** `feat(web): live-watch auto-calibration (save deltas) + real idle elapsed`.

---

### Task 2: Farm pane — "deixa rolando" / "estaciona offline" + label auto-cal
**Files:** `apps/web/components/farm/*` (farm-pane / idle-section / novo "auto-farm" highlight), tests.
**Interfaces:** Consumes `rec.farm.recommend`, `rec.idle.bestPark`, `rec.farm.calSource`.

- [ ] **Step 1:** No topo do Farm pane, um bloco de **ação clara**: **"🔄 Deixa rolando aqui"** → `rec.farm.recommend` (nome do stage + gold/h+exp/h) com copy tipo "Deixe o auto-clear nesta fase pro melhor gold/exp por hora." E **"💤 Estaciona offline aqui"** → `rec.idle.bestPark` (se existir) com "Pra recompensa offline, pare nesta fase antes de fechar." (idle.bestPark pode ser undefined → esconder.)
- [ ] **Step 2:** Label de auto-cal: quando `rec.farm.calSource==='rate'`, mostrar "✓ auto-calibrado pela sua taxa (live)" no card recomendado (e manter os outros labels de calSource). 
- [ ] **Step 3:** A idle-section já mostra valores reais agora (vem do T1) — conferir que "Até o cap"/"Acumulado" renderizam o elapsed real e o coral quando no cap; ajustar copy se necessário.
- [ ] **Step 4:** jsdom smoke: Farm com demo rec mostra "Deixa rolando" com o nome do farm.recommend; se bestPark existir, mostra "Estaciona offline".
- [ ] **Step 5:** `pnpm -F web test` + `typecheck` + `build`. Dev: (screenshot opcional — a extensão estala no gamedata; usar read_page se preciso, não travar). **Commit** `feat(web): Farm auto-farm + park highlights + live auto-cal label`.

## Self-Review
Escopo §1-3 do spec → T1 (auto-cal + elapsed real) + T2 (highlights + label). Engine intacto. Tests determinísticos protegidos (elapsedSec:0 explícito). Manual>auto precedência. Zero any/war-table/PT-BR.

## Pós-merge (controller): merge → push (auto-deploy). Verificação ao vivo é limitada (extensão estala) — confiar em tests + deploy + read_page.
