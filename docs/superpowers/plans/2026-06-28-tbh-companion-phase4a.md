# TBH Companion — Fase 4a (Farm + Idle + Chests) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. UI tasks apply the Phase-3 war-table design (frontend-design). Steps use checkbox (`- [ ]`).

**Goal:** Acender as abas **Farm** (otimizador + idle/offline + calibração) e **Baús** (timers), com navegação entre abas, consumindo `rec.farm`/`rec.idle`/`rec.chests`.

**Architecture:** Pequena adição no engine (`chests` no `recommend()`); context ganha `recalibrate(opts)` + guarda `saveText`; shell ganha navegação client-side; novos panes Farm/Chests consomem a `rec` do context. Tudo client-side.

**Tech Stack:** Next.js App Router, React, TS strict, Tailwind (war-table tokens), Vitest (+jsdom/RTL).

## Global Constraints
- **Node 20**; **TS strict**; **zero `any`** no exportado.
- Design = war-table da Fase 3: utilities dos tokens (`bg-surface`/`text-gold`/`text-teal`/`text-coral`/`text-dim`/`border-line`, `font-mono` p/ números com `tabular-nums`). PT-BR. Save client-only.
- Engine é port fiel; o oráculo de 103 asserts DEVE seguir verde. Mudança no engine é só ADITIVA (`chests`).
- Fonte de referência de shapes: `packages/engine/src/{farm,idle,chests}.ts` + `recommend.ts`. Fonte de ideias de UI: `tbh-copilot/dashboard.html` (Farm/Idle/Chests panes) — portar pra React+PT-BR, não copiar.
- Não quebrar Overview nem os testes/rotas das fases 1-3.

## File Structure
```
packages/engine/src/recommend.ts (add chests) · types.ts (Recommendation.chests)
apps/web/
├─ components/app-shell.tsx (activeTab/onTabChange) · app/page.tsx (tab state → pane)
├─ lib/recommendation-context.tsx (saveText + recalibrate)
├─ lib/format.ts (+ goldPerHour/expPerHour helpers if needed)
├─ components/farm/{farm-pane,stage-table,calibration,idle-section,projections}.tsx
└─ components/chests/chests-pane.tsx
```

---

### Task 1: engine — `chests` no `recommend()`
**Files:** `packages/engine/src/recommend.ts`, `packages/engine/src/types.ts`, `packages/engine/test/engine.test.ts`
**Interfaces:** Produces: `recommend()` retorna `chests: ChestPlan` (= `ReturnType<typeof chestPlan>`).

- [ ] **Step 1:** Em `recommend.ts`, importar `chestPlan` e adicionar ao objeto de retorno: `chests: chestPlan(db, psd, { farm })` (o `farm` já é calculado no recommend; passar ele). Posicionar perto de `idle`.
- [ ] **Step 2:** Em `types.ts`, trocar `chests`'s tipo (se hoje é `unknown` ou ausente em `Recommendation`) por `ChestPlan` — exportar `ChestPlan = ReturnType<typeof chestPlan>` de `chests.ts` e referenciar (type-only import, sem ciclo runtime). Zero `any`.
- [ ] **Step 3 (test, TDD):** adicionar ao `engine.test.ts` (no bloco que já roda `recommend`): `expect(rec.chests).toBeTruthy()`, `expect(rec.chests.dropCooldown).toBeGreaterThan(0)`, `expect(rec.chests.types.length).toBe(3)`. Rodar → deve passar (chestPlan já funciona). Confirmar 103 asserts antigos seguem verdes.
- [ ] **Step 4:** `pnpm -F @tbh/engine test` (104+ asserts verdes) + `pnpm -F @tbh/engine typecheck`.
- [ ] **Step 5: Commit** `feat(engine): include chests (chestPlan) in recommend() output`.

---

### Task 2: web — navegação de abas + context recalibrate + helpers
**Files:** `apps/web/components/app-shell.tsx`, `apps/web/app/page.tsx`, `apps/web/lib/recommendation-context.tsx`, `apps/web/lib/format.ts` (+test), `apps/web/lib/engine-bridge.ts`
**Interfaces:** Produces: shell controlado por `activeTab`; `useRecommendation()` ganha `recalibrate(opts)`; `runRecommend(text, opts?)`.

- [ ] **Step 1: navegação.** `AppShell` recebe props `activeTab: string` + `onTabChange(id: string)`. As abas habilitadas (Overview, Farm, Baús) viram botões com `onClick={()=>onTabChange(id)}` + `aria-selected={id===activeTab}`; as desabilitadas seguem "em breve". `app/page.tsx` (client): `const [tab,setTab]=useState("overview")`; quando `status==='ready'`, renderiza o pane conforme `tab` (`overview`→Overview, `farm`→FarmPane, `chests`→ChestsPane); passa `activeTab`/`onTabChange` ao shell. (Mapear id "baus"→Chests.)
- [ ] **Step 2: context.** Guardar `saveTextRef`/estado com o último texto de save (setado em demo/connect/watch). `runRecommend` (engine-bridge) passa a aceitar `opts?: RecommendOpts` → `recommend(db, parseSave(text), { elapsedSec:0, ...opts })`. Adicionar `recalibrate(opts: RecommendOpts)` ao context: se houver `saveText`, `setRec(await runRecommend(saveText, opts))` (mantém source/db; erro → status error com detalhe). Expor no `useRecommendation()`. `useCallback`.
- [ ] **Step 3: helpers.** Em `format.ts`, garantir/added `fmtPerHour(n)` (ex.: "12,3k/h") se útil; reusar `fmt`/`fmtK`/`fmtDur`/`pct`. Test dos novos.
- [ ] **Step 4:** `pnpm -F web test` (context recalibrate test: mock runRecommend, chamar recalibrate, rec atualiza) + `typecheck` + `build`. Dev: trocar de aba funciona (Overview↔Farm↔Baús placeholders por ora).
- [ ] **Step 5: Commit** `feat(web): client-side tab navigation + context recalibrate(opts) + helpers`.

---

### Task 3: web — Farm pane (recomendado + tabela + calibração + idle + projeções)
**Files:** `apps/web/components/farm/{farm-pane,stage-table,calibration,idle-section,projections}.tsx`, `apps/web/app/page.tsx` (montar FarmPane)
**Interfaces:** Consumes: `useRecommendation()` (`rec.farm`, `rec.idle`, `db`, `recalibrate`), engine `projectLevel` (de `@tbh/engine`).

`rec.farm` (FarmResult) tem: `current`, `recommend`, `frontier`, `onBest`, `calibrated`, `calSource`, `goldBonusPct`, `expBonusPct`, `partyLevel`, `all: rows[]` onde row = `{ key,label,lvl,diff,gold,exp,goldPerSec,expPerSec,goldPerHour,expPerHour,clearTime,fit,expDensity,goldDensity,totalHP,waves,cleared }`. `rec.idle` (IdleInfo): `{ unlocked,cap,capHours,fullGold,fullExp,accruedGold,accruedExp,secsToCap,goldBonus,expBonus,bestPark:{key,label,lvl,fullGold,fullExp} }`.

- [ ] **Step 1: `farm-pane.tsx`** — orquestra: card recomendado + tabela + calibração + idle + projeções. Card recomendado (`rec.farm.recommend`): nome do stage (label/`db.stages`), **gold/h** (dourado mono) + **exp/h** (teal mono), clear time, badge "já no melhor" se `onBest`; rótulo de calibração honesto por `calSource` ("modelo"/"pela sua taxa"/"pelos seus clears"). Bônus de gold/exp (`goldBonusPct`/`expBonusPct`).
- [ ] **Step 2: `stage-table.tsx`** — tabela de `rec.farm.all` (stages farmáveis): colunas label·lvl, gold/h, exp/h, clear time, densidade (exp/HP, gold/HP). Ordenável client-side (estado de sort) por gold/h (default), exp/h, densidade. Destacar `current` e `recommend`. Mono nos números, scroll vertical se grande.
- [ ] **Step 3: `calibration.tsx`** — input(s) de tempo de clear (segundos) do stage atual (`rec.farm.current`) + botão "calibrar" → `recalibrate({ clearSamples: [{ clearSec, hp: current.totalHP, waves: current.waves }] })`. Texto: "Informe seu tempo real de clear pra calibrar os números." Opção de adicionar um 2º stage (stretch). Loading enquanto recalibra.
- [ ] **Step 4: `idle-section.tsx`** — de `rec.idle`: se `unlocked`, mostrar full gold/exp no cap, **tempo até o cap** (`fmtDur(secsToCap)` / cap 8h), acumulado atual, e **melhor stage pra estacionar** (`bestPark`). Se `!unlocked`, dica curta. Coral se já bateu o cap.
- [ ] **Step 5: `projections.tsx`** — pro `rec.farm.recommend`: gold em 1/3/5/8h (`goldPerSec*h*3600`, `fmtK`) e nível projetado (`projectLevel(partyLevel, 0, recommend.expPerSec, recommend.lvl, h)`), mini-tabela.
- [ ] **Step 6:** montar `<FarmPane/>` no `page.tsx` quando `tab==='farm'`. Smoke jsdom: render FarmPane com demo rec → aparece o stage recomendado + um valor "/h".
- [ ] **Step 7:** `pnpm -F web test` + `typecheck` + `build`. Dev: screenshot do Farm (demo), auto-crítica war-table.
- [ ] **Step 8: Commit** `feat(web): Farm pane — optimizer, stage table, calibration, idle, projections`.

---

### Task 4: web — Chests pane
**Files:** `apps/web/components/chests/chests-pane.tsx`, `apps/web/app/page.tsx` (montar)
**Interfaces:** Consumes: `useRecommendation()` (`rec.chests`).

`rec.chests` (ChestPlan): `{ dropCooldown, types: [{ kind:'normal'|'boss'|'act', unlocked, cooldown, base, reduce, capacity, slowOpen, fillSec }], best:{ key,lvl,label,clearTime,clearsPerWindow }|null, source }`.

- [ ] **Step 1: `chests-pane.tsx`** — 3 cards (normal/stage-boss/act-boss): nome PT-BR ("Baú normal"/"Baú de chefe de fase"/"Baú de chefe de ato"), cooldown de auto-abertura (`fmtDur(cooldown)`, mostrar base−reduce), capacidade, status (unlocked/`slowOpen` → rótulo honesto). Janela de drop compartilhada (`dropCooldown`, ~5min, com nota de que é compartilhada/estimada). Se `best`, "melhor stage pra loot": label + clears por janela. Não-unlocked → dica.
- [ ] **Step 2:** montar `<ChestsPane/>` no `page.tsx` quando `tab==='chests'`. Smoke jsdom: render com demo rec → ≥1 card de baú com cooldown.
- [ ] **Step 3:** `pnpm -F web test` + `typecheck` + `build`. Dev: screenshot Baús (demo) + auto-crítica.
- [ ] **Step 4: Commit** `feat(web): Chests pane — auto-open timers + drop window`.

---

## Self-Review (cobertura)
- D1 chests engine → T1. D2 tab nav → T2. D3 idle dentro do Farm → T3 Step 4. D4 calibração/recalibrate/saveText → T2 Step 2 + T3 Step 3. D5 projeções → T3 Step 5. D6 design war-table → todas as tasks UI.
- Critérios: chests no recommend (T1), nav (T2), Farm completo (T3), Baús (T4), testes/typecheck/build. Deploy/CI = controller pós-merge.
- Placeholders: nenhum; engine/context com código concreto, panes com shapes exatos (FarmResult/IdleInfo/ChestPlan) + bindings + design direction.
- Consistência: `recalibrate`/`saveText` (T2) usados na calibração (T3); `rec.chests` (T1) consumido em T4; shapes do engine referenciados verbatim.

## Pós-merge (controller): merge → push (auto-deploy) → screenshot Farm + Baús ao vivo (demo) p/ mostrar ao usuário.
