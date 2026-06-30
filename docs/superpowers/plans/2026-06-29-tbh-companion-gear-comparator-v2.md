# TBH Companion — Gear Comparador v2 Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development. War-table design (frontend-design). Checkbox steps.

**Goal:** Comparador de slot v2: seletor de métrica (Poder/DPS/Defesa) + identidade completa do item (cor de raridade do jogo + nível + stats) + explicação da troca (destaque do stat da métrica + frase) + upgrades óbvios no grid. **Sem mudar o engine.** Spec: `docs/superpowers/specs/2026-06-29-tbh-companion-gear-comparator-v2.md`.

## Global Constraints
Node 20; TS strict, zero `any`; war-table tokens (EXCETO as cores de raridade do jogo — dado, isoladas num helper); UI/chrome PT-BR (nomes de gear EN); mono nos números; **engine intocado — oráculo 106 verde**. Não quebrar Fase 4b-ii nem os 194 testes. Verificação via tests/build (screenshot estala). Sequência T1→T2→T3.

## File Structure
`apps/web/lib/gear-stats.ts`(+test), `apps/web/lib/item-format.ts` (+`rarityStyle`), `apps/web/components/gear/{slot-compare,slot-grid,gear-pane}.tsx`.

---

### Task 1: Helpers — stats rotulados, cores de raridade, métricas
**Files:** `apps/web/lib/gear-stats.ts`(+test), `apps/web/lib/item-format.ts`.
**Interfaces:** `gearStatRows(db, key) → {statKey, label, value, mt, isPercent}[]`; `RARITY_COLOR: Record<grade,string>` + `rarityStyle(grade) → {color, className/style}`; `GEAR_METRICS` (`[{id:'power',label:'Poder',field:'dPower'},{id:'dps',label:'DPS',field:'dDps'},{id:'def',label:'Defesa',field:'dEhp'}]`); `metricTargets` (DPS→{AttackDamage,AttackSpeed,CriticalChance,CriticalDamage}, def→{MaxHp,Armor}) + `statDrivesMetric(statKey, metricId)` usando o mapa de target do engine.

- [ ] **Step 1:** `gear-stats.ts` — `gearStatRows(db, key)`: chama `gearStatLines(db, key)` (de `@tbh/engine`), rotula cada `stat` com `statLabel` (de `lib/stat-labels.ts`), marca percent vs flat pelo `mt` (`ADDITIVE`/percent vs `FLAT`). Retorna linhas prontas pra UI. Puro.
- [ ] **Step 2:** `gear-stats.ts` — `GEAR_METRICS` (3) + `metricTargets` + `statDrivesMetric(statKey, metricId)`: mapeia a stat key de gear ao seu target (espelhar o mapa `[target,modType]` de stats.ts:74 — AllHeroAttackDamage→AttackDamage etc.) e decide se aquele target pertence ao conjunto da métrica (DPS: AttackDamage/AttackSpeed/CriticalChance/CriticalDamage; Defesa: MaxHp/Armor; Poder: ambos). Confirme os targets lendo stats.ts.
- [ ] **Step 3:** `item-format.ts` — `RARITY_COLOR` (os 10 hexes do jogo, do spec) + `rarityStyle(grade)`: retorna a cor de raridade (style/CSS, não token) p/ o selo — borda + texto na cor da raridade. Mantém `gradeStyle` existente (não quebrar usos).
- [ ] **Step 4: testes** (`gear-stats.test.ts`, mirror stat-labels.test): `gearStatRows` rotula um gear real + marca percent/flat; `statDrivesMetric` (DPS↔AttackDamage true, DPS↔Armor false, Defesa↔Armor true); `rarityStyle` cobre as 10 grades com a cor certa.
- [ ] **Step 5:** `pnpm -F web test`+typecheck+build. **Commit** `feat(web): helpers de gear — stats rotulados, cores de raridade do jogo, métricas`.

---

### Task 2: SlotCompare v2 — métrica + stats + destaque + explicação
**Files:** `apps/web/components/gear/{slot-compare,gear-pane}.tsx`.
**Interfaces:** métrica (estado no GearPane, passada ao SlotCompare). Consome `gearStatRows`/`rarityStyle`/`GEAR_METRICS`/`statDrivesMetric` + `scoreOwnedCandidates` (já tem os 3 deltas) + `powerDelta`.

- [ ] **Step 1: seletor de métrica** — no `gear-pane.tsx`, estado `metric` ('power'|'dps'|'def'), default 'power'; um toggle (3 botões war-table, `aria-pressed`) no topo do comparador (ou do pane). Passar `metric` ao `<SlotCompare>`.
- [ ] **Step 2: ranking/destaque pela métrica** — em `slot-compare.tsx`: ordenar os candidatos owned por `c.delta[field]` da métrica (desc); o pill **MELHOR** vai pro melhor pela métrica (não mais só o best-by-power do engine); o número-título de cada item/candidato = o delta da métrica (enfatizado), com os outros 2 deltas menores ao lado.
- [ ] **Step 3: identidade + stats do item** — cada item (atual/best/candidato selecionado) mostra: selo de raridade (`rarityStyle`, cor do jogo) + nível + lista de **stats** (`gearStatRows`): "Label +valor" (ou "+valor%"). Os stats em que `statDrivesMetric(statKey, metric)` = true vêm **destacados** (font-semibold + text-teal); os outros normais.
- [ ] **Step 4: explicação da troca** — pro best/candidato vs atual: uma linha "Troca:" com a frase derivada dos deltas (`+X DPS` teal se ganho / `−Y EHP` coral se perda), focando a métrica escolhida mas mostrando o trade-off. (Opcional: diff de stat lines atual-vs-novo.)
- [ ] **Step 5: smoke + commit** — jsdom: trocar a métrica muda a ordem/destaque; um item mostra stats com cor de raridade; o stat da métrica tem o destaque; a frase de explicação renderiza. `pnpm -F web test`+typecheck+build. **Commit** `feat(web): comparador v2 — seletor de métrica + stats do item + raridade + explicação da troca`.

---

### Task 3: Upgrades óbvios no grid
**Files:** `apps/web/components/gear/{slot-grid,gear-pane}.tsx`.
**Interfaces:** `rec.gear.swaps` (heroKey+slot) = slots com upgrade.

- [ ] **Step 1:** em `slot-grid.tsx`, marcar a célula de cada slot que está em `rec.gear.swaps` (do herói selecionado) com um **badge chamativo "↑ upgrade"** (teal, canto) + realce de borda (ring teal). Não atropelar o estado selecionado.
- [ ] **Step 2:** em `gear-pane.tsx`, o header de upgrades (ex. "X upgrades") fica claro e **lista/aponta quais slots** (ou ao menos, clicar nele leva ao 1º slot com upgrade / eles brilham). Pro João ver "ó, são esses 4".
- [ ] **Step 3: smoke** — um slot com swap mostra o badge "↑ upgrade"; o contador bate com os swaps do herói. `pnpm -F web test`+typecheck+build. **Commit** `feat(web): grid de gear — marcar quais slots têm upgrade (badge + realce)`.

## Self-Review
Helpers → T1; comparador (métrica/stats/raridade/explicação) → T2; upgrades óbvios → T3. Engine intocado. War-table (+ raridade isolada). PT-BR-UI/EN-names/zero-any. Smokes por task.

## Pós-merge (controller): review final whole-branch (Opus) → merge `--no-ff` → push → deploy. Atualizar memória + ledger. João revisa depois.
