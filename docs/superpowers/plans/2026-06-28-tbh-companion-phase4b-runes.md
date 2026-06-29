# TBH Companion — Fase 4b-i (Runas) Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development. War-table design (frontend-design). Checkbox steps.

**Goal:** Aba **Runas** — árvore interativa de 197 nós (SVG, pan/zoom/fit, status colors, filtro de categoria, dps-path, slider de orçamento) + painéis (recomendadas + plano de gasto). Sem mudança no engine.

## Global Constraints
Node 20; TS strict, zero `any`; war-table utilities (no inline var() exceto valores dinâmicos: transform de pan/zoom, posições x/y); PT-BR; mono nos números; save client-only. Dados de `rec.runeTree`/`rec.runes`/`rec.runeROI`/`rec.goldPlan` (shapes no spec). Não quebrar Fases 1-4a.1.

## File Structure
`apps/web/components/runes/{runes-pane,rune-tree,rune-detail,rune-legend,rune-panels}.tsx` + `lib/rune-colors.ts` (statusColor) + `app/page.tsx` (montar) + `app-shell.tsx` (habilitar aba Runas).

---

### Task 1: árvore SVG (render + pan/zoom/fit) + status colors + habilitar aba
**Files:** `apps/web/lib/rune-colors.ts`(+test), `apps/web/components/runes/rune-tree.tsx`, `apps/web/components/runes/runes-pane.tsx`, `apps/web/app/page.tsx`, `apps/web/components/app-shell.tsx`
**Interfaces:** Produces `statusColor(status): {fill,stroke,...}`; `<RuneTree nodes edges bounds firstDpsPath selectedKey onSelect budget? activeCat? />` (render-only this task; budget/cat applied in T2 — accept the props but a basic render is fine); `<RunesPane/>`.

- [ ] **Step 1:** `lib/rune-colors.ts` — `statusColor(status: RuneStatus)` → war-table colors per status (recommended=gold, almostfree=gold ring, owned=teal, maxed=teal-dim, available=neutral, locked=dim, skip=coral-dim). Pure; unit-test each status maps to a defined color.
- [ ] **Step 2:** `rune-tree.tsx` — `<svg viewBox="{minX} {minY} {w} {h}">` (w=maxX−minX, h=maxY−minY from bounds) with an inner `<g style={{transform: pan/zoom}}>`. Render `edges.map(([a,b]) => <line x1=nodes[a].x ...>)` (dim; dps-path edges — both endpoints `onDpsPath` — highlighted). Render nodes: `Object.entries(nodes).map(([key,n]) => <circle cx={n.x} cy={n.y} r=… fill={statusColor(n.status)} ...>)` + almostfree ring + important glow + onDpsPath outline + selected emphasis. Pan (pointer drag), zoom (wheel + buttons + / − / fit), fit = reset to viewBox. Respect `prefers-reduced-motion` (no smooth transitions when set). Performance: don't re-render all nodes on hover (CSS hover or local state); memoize node list.
- [ ] **Step 3:** `runes-pane.tsx` — render `<RuneTree>` with `rec.runeTree.{nodes,edges,bounds,firstDpsPath}`; manage `selectedKey` state (detail/legend come in T2/T3 — placeholder ok). Mount in `page.tsx` for `tab==='runas'`. In `app-shell.tsx`, ENABLE the "Runas" tab (move it from disabled to an active `onTabChange` button, like Farm/Baús).
- [ ] **Step 4: smoke** (jsdom): render `<RunesPane>` with demo rec → the `<svg>` contains ~197 `<circle>` and ≥100 `<line>`.
- [ ] **Step 5:** `pnpm -F web test` + `typecheck` + `build`. (Screenshot may stall — verify via read_page/build, don't loop.) **Commit** `feat(web): interactive rune tree (SVG render, pan/zoom, status colors) + enable Runas tab`.

---

### Task 2: interações — detalhe + filtro de categoria + dps-path + slider de orçamento
**Files:** `apps/web/components/runes/{rune-detail,rune-legend}.tsx`, wire into `runes-pane.tsx`/`rune-tree.tsx`
**Interfaces:** Consumes the tree + `rec.runeTree.nodes`. Produces detail panel, category filter, budget slider, dps-path emphasis.

- [ ] **Step 1:** `rune-detail.tsx` — given selected node (`nodes[selectedKey]`), show: nome, categoria, status (com cor), nível/max, custo (mono), stat (`st`)+`value`, ΔPOWER (`dPower`), tempo de farm (`fmtDur(farmSeconds)`). Empty → "passe o mouse ou clique num nó".
- [ ] **Step 2:** hover/click no nó (rune-tree) → `onSelect(key)`; hover → preview no detail (ou click-to-pin). Keep perf (no full re-render).
- [ ] **Step 3:** `rune-legend.tsx` — chips das 6 categorias (`combat/gold/qol/exp/loot/offline`) com contagem; selecionar → `activeCat`; o tree esmaece nós com `cat !== activeCat` (dim opacity). "Todas" reseta. + legenda de status (cores → significado).
- [ ] **Step 4:** slider de orçamento ("habilitar até X gold", 0..maxNodeCost, default = `rec.runes.gold`) → o tree realça nós com `cost ≤ budget` (e/ou esmaece os acima). Client-side, sem re-rodar engine.
- [ ] **Step 5:** dps-path: realçar `onDpsPath` nós + arestas (já parcialmente no T1; finalizar) e um toggle/legenda "caminho de DPS".
- [ ] **Step 6: smoke**: selecionar um nó popula o detalhe; ativar uma categoria aplica o dim (via classe/atributo verificável). `pnpm -F web test`+typecheck+build. **Commit** `feat(web): rune tree interactions — detail, category filter, dps-path, budget slider`.

---

### Task 3: painéis — recomendadas + plano de gasto
**Files:** `apps/web/components/runes/rune-panels.tsx`, wire into `runes-pane.tsx`
**Interfaces:** Consumes `rec.runes` (almostFree), `rec.runeROI`, `rec.goldPlan`, `rec.runes.firstDpsPath`.

- [ ] **Step 1:** "Recomendadas" — lista de `rec.runes.almostFree` (mais baratas: nome, custo, stat) + top ~6 de `rec.runeROI` (combat por `perGold`: nome, ΔPOWER, custo, perGold). Clicar numa → seleciona o nó na árvore (`onSelect`).
- [ ] **Step 2:** "Plano de gasto" — `rec.goldPlan`: cart de runas dentro do gold atual (nome, custo, ΔPOWER), `totalCost`, `totalPower`. Caminho de DPS: `rec.runes.firstDpsPath` (alvo + custo total) com botão "ver na árvore".
- [ ] **Step 3:** montar no `runes-pane` (layout: árvore grande + painel lateral; responsivo: empilha no mobile). smoke: ≥1 recomendada + o plano renderizam.
- [ ] **Step 4:** `pnpm -F web test`+typecheck+build. **Commit** `feat(web): rune panels — recommended runes + spending plan`.

## Self-Review
Árvore/pan-zoom/status → T1; detalhe/filtro/dps/orçamento → T2; painéis → T3. Engine intacto. Aba habilitada (T1). War-table/PT-BR/zero-any. Smokes por task.

## Pós-merge (controller): merge → push (auto-deploy). Verificação ao vivo limitada (extensão estala no gamedata) — tests + read_page.
