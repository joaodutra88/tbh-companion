# TBH Companion — Fase 4b-i.1 (Clareza de combate) Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development. War-table design (frontend-design). Checkbox steps.

**Goal:** Fechar o gap de clareza nas abas vivas: (1) dificuldade visível em todo lugar, (2) ícones de runa no nó, (3) recomendação de runa liderando, (4) `statLabel()` PT-BR. **Sem mudar a lógica/saída numérica do engine** — só reexpor `icon` (aditivo) + UI.

## Global Constraints
Node 20; TS strict, zero `any`; war-table utilities (sem inline var() exceto valores dinâmicos: x/y, transform, href); PT-BR; mono nos números; save client-only. **Oráculo do engine (106 asserts) tem que continuar verde.** Não quebrar Fases 1-4b-i. Imagens de runa já vendorizadas em `apps/web/public/game/runes/` (39 PNGs). Verificação ao vivo limitada (extensão estala no gamedata) → tests + read_page, não screenshot.

## File Structure
`apps/web/lib/stage-format.ts`(+test), `apps/web/components/stage-name.tsx`, `apps/web/lib/stat-labels.ts`(+test), `packages/engine/src/{types,runes}.ts`, `apps/web/components/runes/{rune-tree,runes-pane,rune-panels,rune-detail}.tsx`, `apps/web/components/farm/{farm-pane,stage-table,calibration}.tsx`, `apps/web/components/chests/chests-pane.tsx`.

---

### Task 1: Dificuldade visível em todo lugar
**Files:** `apps/web/lib/stage-format.ts`(+test), `apps/web/components/stage-name.tsx`, e wire em `farm/{farm-pane,stage-table,calibration}.tsx` + `chests/chests-pane.tsx`.
**Interfaces:** Produz `DIFF_LABEL: Record<string,string>` (NORMAL→Normal, NIGHTMARE→Pesadelo, HELL→Inferno, TORMENT→Tormento), `DIFF_ORDER`, `diffTone(diff)` (classe Tailwind por tier, só tokens dim/text/gold/coral), `stageOptionText(db, key)` → ex. `"Tormento · 3-9 (nv 95)"`; `<StageName db stageKey showLevel? />` e variante via props diretas (label/diff/lvl).

- [ ] **Step 1:** `lib/stage-format.ts` — mapas + `diffTone()` + `stageOptionText(db, key)` (lê `db.stages[key].{diff,label,lvl}`; tolera `diff` ausente → sem selo). Puro. Unit-test: labels PT-BR corretos, `stageOptionText` inclui a dificuldade, fallback sem diff.
- [ ] **Step 2:** `components/stage-name.tsx` — `<StageName>` que renderiza `<selo diff (diffTone)> <label> <nv X opcional>`. Aceita `{db, stageKey}` (resolve do db) OU `{label, diff, lvl}` diretos. Selo = chip compacto uppercase com o nome PT-BR.
- [ ] **Step 3:** Wire no Farm — `farm-pane.tsx`: `RecommendedCard` (o `Stage {name}` + `nível`) e `AutoFarmHighlights` (deixa rolando / estaciona offline) passam a usar `<StageName>`. `stage-table.tsx`: a célula "Stage" usa `<StageName>` (selo + label + nv) no lugar de `name` + `nv {lvl}`.
- [ ] **Step 4:** Wire na calibração — `calibration.tsx`: o rótulo do stage primário usa `<StageName>`; o `<select>` do 2º stage fica mais largo (não `w-20`) e cada `<option>` usa `stageOptionText(db, r.key)` (dificuldade+label+nv). Baús — `chests-pane.tsx`: "melhor stage pra loot" usa `<StageName>`.
- [ ] **Step 5: smoke** (jsdom): `<StageName>` mostra o label da dificuldade; uma `<option>` da calibração contém o texto da dificuldade. `pnpm -F web test` + typecheck + build. **Commit** `feat(web): mostrar dificuldade (Normal/Pesadelo/Inferno/Tormento) em todo stage nomeado`.

---

### Task 2: Runas — religar o ícone (engine) + desenhar no nó
**Files:** `packages/engine/src/types.ts`, `packages/engine/src/runes.ts`, `apps/web/components/runes/rune-tree.tsx`.
**Interfaces:** `runeNodes` e `RuneTreeNode` ganham `icon?: string`; `runeTreeStatus()` propaga `icon: pos.icon`. Nó da árvore desenha `<image>` clipado.

- [ ] **Step 1:** `types.ts` — `runeNodes: Record<string, { x:number; y:number; cat:string; icon?:string }>` (linha ~50) e adicionar `icon?: string` à interface/tipo do `RuneTreeNode` (o nó de saída de `runeTreeStatus`, ~linha 162). Confirmar lendo o arquivo.
- [ ] **Step 2:** `runes.ts` — em `runeTreeStatus()` (onde monta `base = { x, y, cat, level }`, ~linha 191), incluir `icon: pos.icon`. ADITIVO — não mexer em status/cost/dPower/etc.
- [ ] **Step 3:** rodar o **oráculo do engine** (`pnpm -F @tbh/engine test`, 106 asserts) — TEM que continuar verde (icon é aditivo). Se quebrar, parar e investigar (não seguir).
- [ ] **Step 4:** `rune-tree.tsx` — no `RuneNodeEl`, se `n.icon`, desenhar `<image href={n.icon} x={-14} y={-14} width={28} height={28} clipPath=…>` (clip circular r≈NODE_R) ENTRE o corpo do círculo e os anéis — corpo colorido por status fica de fundo, anéis (almostfree/dps/important/selected) por cima. `onError`/sem icon → mantém só o círculo atual (fallback). Manter `React.memo`/hover CSS.
- [ ] **Step 5: smoke** (jsdom): com o demo rec, a árvore renderiza ≥1 `<image>` (nós com ícone). `pnpm -F web test` + engine test + typecheck + build. **Commit** `feat(engine,web): reexpor icon da runa e desenhar no nó da árvore`.

---

### Task 3: Runas — recomendação liderando + statLabel + ícones nos painéis
**Files:** `apps/web/lib/stat-labels.ts`(+test), `apps/web/components/runes/{runes-pane,rune-panels,rune-detail}.tsx`.
**Interfaces:** `statLabel(key: string): string` PT-BR (fallback = a própria key). Card "Próxima runa recomendada" no topo do RunesPane. Ícones (de `rec.runeTree.nodes[key].icon`) nas listas/detalhe.

- [ ] **Step 1:** `lib/stat-labels.ts` — `statLabel(key)` com mapa PT-BR pras stat keys conhecidas (as 39 dos PNGs + as de combate/percent). Fallback gracioso = key crua. Puro, unit-test (algumas keys + fallback).
- [ ] **Step 2:** usar `statLabel()` onde hoje mostra `st` cru: `rune-detail.tsx` (campo "Efeito") e `rune-panels.tsx` (a coluna de stat das "mais baratas").
- [ ] **Step 3:** ícones nos painéis — em `rune-panels.tsx` (listas recomendadas/cart) e `rune-detail.tsx`, mostrar o ícone da runa (`rec.runeTree.nodes[String(key)]?.icon`, `<img>` pequeno com onError→some). Sem quebrar layout/truncate.
- [ ] **Step 4:** `runes-pane.tsx` — card **"Próxima runa recomendada"** largo no topo (acima da árvore/legenda): escolhe a melhor compra agora — prioridade `goldPlan.cart[0]` → top `runeROI[0]` (combate) → `almostFree[0]`. Mostra ícone + nome (localized) + efeito (statLabel) + custo + ΔPOWER + botão "ver na árvore" (`setSelectedKey`). Estilo no padrão do CoachCard (gold-accent, war-table). Some se não houver recomendação.
- [ ] **Step 5: smoke** (jsdom): `statLabel` mapeia; o card "Próxima runa recomendada" renderiza nome+custo com o demo. `pnpm -F web test` + typecheck + build. **Commit** `feat(web): runas — card "próxima runa", statLabel PT-BR e ícones nos painéis`.

## Self-Review
Dificuldade → T1 (`<StageName>` em Farm+calibração+Baús). Ícones engine+nó → T2 (oráculo verde). Recomendação liderando + statLabel + ícones nos painéis → T3. Engine só aditivo. War-table/PT-BR/zero-any. Smokes por task.

## Pós-merge (controller): review final whole-branch → merge `--no-ff` → push (auto-deploy Vercel). Verificação ao vivo limitada (extensão estala no gamedata) — tests + read_page. Atualizar a memória project_tbh-companion + o ledger `.superpowers/sdd/progress.md`.
