# TBH Companion — Fase 4a.1: Auto-calibração + Auto-farm (Farm enhancement)

- **Data:** 2026-06-28 · **Status:** aprovado em bloco (autônomo) · Enhancement da Fase 4a (Farm). Depois: 4b (Runas+Gear).

## Contexto / motivação (pedido do usuário)
O save **não guarda** tempo de clear por fase (verificado: só `lastSavedTime`, `playTime`, `totalClears`). Mas dá pra **auto-calibrar sem digitar nada** medindo deltas do save no **live-watch**, e pra **recomendar onde deixar o farm rolando**. Objetivo do João: "deixar o bagulho rolando".

## Escopo
1. **Auto-calibração (live):** no live-watch, medir entre snapshots — Δexp da party / Δt (limpo, exp só sobe) e Δgold / Δt (quando positivo + mesma fase) — e passar como `goldPerSec`/`expPerSec` pro `recommend()` → calibra sozinho (`calSource='rate'`). Sem input manual.
2. **Idle real:** parar de forçar `elapsedSec:0` no app — deixar o engine calcular o elapsed pelo `lastSavedTime` → as células idle ("Até o cap"/"Acumulado") viram reais. (Testes mantêm `{elapsedSec:0}` pra determinismo.)
3. **Recomendação de auto-farm:** destacar na aba Farm **"🔄 Deixa rolando aqui"** (`farm.recommend` — auto-clear ativo) e **"💤 Estaciona offline aqui"** (`idle.bestPark`), em linguagem simples.

**Não-objetivos:** ler clear-time do save (impossível — não persiste); Runas/Gear (4b).

## Decisões (recomendados)
- **Sinais auto-cal:** exp/seg (sempre que Δexp>0) e gold/seg (só Δgold>0 + mesma `currentStageKey` + Δt de parede em [3s, 1800s]). Ignorar ticks fora disso (compra de runa, troca de fase, salto offline). Manual (clear-time) tem precedência (a cascata do `bestFarm` já usa clearSamples/clearSec antes de mgps).
- **Onde medir:** helper `measureSave(text) → { gold, partyExp, stageKey }` no engine-bridge (usa `gold`/`partyExp` exportados). Context guarda `prevSnapshotRef` + `autoOptsRef`.
- **Precedência de opts:** `runRecommend(text, { ...autoOpts, ...manualOpts })` (manual sobrescreve auto).
- **Label:** quando `rec.farm.calSource==='rate'` por auto, mostrar "auto-calibrado pela sua taxa (live)".

## Mudanças
- **`engine-bridge.ts`:** `runRecommend(text, opts?)` NÃO força mais `elapsedSec:0` (passa `{ ...opts }`; engine usa lastSavedTime). Tests passam `{elapsedSec:0}` explícito. + `measureSave(text): { gold:number, partyExp:number, stageKey:number|string }`.
- **`recommendation-context.tsx`:** live-watch tick: `m = measureSave(text)`; se `prev` e `prev.stageKey===m.stageKey` e Δt∈[3,1800]: `expPerSec = Δexp/Δt (se>0)`, `goldPerSec = Δgold/Δt (se Δgold>0)` → `autoOptsRef.current = { ...(expPerSec?{expPerSec}:{}) , ...(goldPerSec?{goldPerSec}:{}) }`. `prevSnapshotRef = { ...m, atMs }`. Recompute com `{ ...autoOptsRef.current, ...manualOptsRef.current }`. Limpar auto/prev em demo/connect/disconnect e ao iniciar watch. (manual = o optsRef já existente.)
- **Farm pane:** card/seção "Deixa rolando" (farm.recommend) + "Estaciona offline" (idle.bestPark) com copy simples; label de auto-cal quando ativo. Idle section já passa a mostrar valores reais (vem do T1).

## Testes
- engine-bridge `measureSave` (node): dado o demo save, retorna gold/partyExp/stageKey coerentes (>0).
- context: mock measureSave/runRecommend; simular 2 ticks de watch (mesma fase, Δt sano) → assert que o 2º recompute recebe `goldPerSec`/`expPerSec` derivados dos deltas. Ticks com fase diferente / Δgold≤0 → sem goldPerSec.
- jsdom smoke: Farm mostra o highlight "Deixa rolando" (farm.recommend) e "Estaciona offline" (bestPark).
- build/typecheck verdes; zero `any`.

## Critérios de sucesso
- [ ] App não força elapsedSec:0 → idle mostra elapsed real (tests determinísticos seguem 0).
- [ ] Live-watch: 2+ ticks na mesma fase → farm auto-calibra (`calSource='rate'`, label "auto (live)") sem input manual.
- [ ] Farm destaca "🔄 deixa rolando aqui" + "💤 estaciona offline aqui".
- [ ] `pnpm -F web test` + engine test + typecheck + build + CI verdes.

## Riscos
| Risco | Mitigação |
|---|---|
| gold é gasto → Δgold ruidoso | só usar Δgold>0 + mesma fase + Δt sano; exp/seg é o sinal limpo principal |
| salto offline / troca de fase polui o delta | guardas de stageKey + Δt window; resetar prev ao trocar source |
| elapsed real muda asserts | tests passam `{elapsedSec:0}` explícito; só o app usa o cálculo por lastSavedTime |
| Date.now() no engine | é runtime de browser (não Workflow) — ok |
