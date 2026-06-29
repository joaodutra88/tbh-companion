# TBH Companion — Fase 4b-ii (Gear) Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development. War-table design (frontend-design). Checkbox steps.

**Goal:** Aba **Gear** — comparador por herói→slot (atual vs best-in-slot + candidatos owned ranqueados por `powerDelta`). **O engine JÁ tem a lógica** (`rec.gear`/`powerDelta`/swaps) → UI + vendorizar ícones + helper de nomes; **ZERO lógica nova de engine**. Fonte: `docs/superpowers/research/2026-06-29-gear-domain-map.md` (leia antes).

## Global Constraints
Node 20; TS strict, zero `any`; war-table tokens; UI/chrome PT-BR (nomes de gear em EN via `gearNames`); mono nos números; save client-only; **engine intocado — oráculo 106 asserts continua verde**. Não quebrar Fases 1-4b-i.2 nem os 150 testes. Verificação via tests/build (screenshot estala). Next 16: API nova → ler `node_modules/next/dist/docs`.

## File Structure
`apps/web/public/game/{gear,items}/**` (assets), `apps/web/lib/item-format.ts`(+test), `apps/web/components/gear/{gear-pane,slot-grid,slot-compare}.tsx`, `apps/web/components/app-shell.tsx` (destravar aba), `apps/web/app/page.tsx` (montar), e (T3) expor `powerDelta`/`psd` pro comparador. Sequência T1→T2→T3.

---

### Task 1: Vendorizar ícones + helpers de item
**Files:** `apps/web/public/game/{gear,items}/**` (copiar), `apps/web/lib/item-format.ts`(+test).
**Interfaces:** `itemIcon(k, db): string`, `gearName(k): string`, `gradeStyle(grade): {label, className/badge}`.

- [ ] **Step 1: vendorizar** — copiar `tbh-copilot/assets/game/gear/**` e `tbh-copilot/assets/game/items/**` → `apps/web/public/game/gear/**` e `apps/web/public/game/items/**`, **preservando as subpastas** (gear/sword, gear/staff, items/materials, items/boxes...). Confirmar contagem (~396 gear + ~121 items = ~517). (Pode usar shell — é cópia de assets.)
- [ ] **Step 2: `lib/item-format.ts`** —
  - `itemIcon(k, db)`: retorna `db.items[String(k)]?.icon ?? ""` (path já é `/game/...`; espelha `heroIcon` de format.ts:82). `""` quando ausente (caller esconde `<img>`).
  - `gearName(k)`: nome EN via o export `gearNames` de `@tbh/game-data` (confirmar o nome do export; itemKey→"Long Sword"); fallback `Item #${k}`.
  - `gradeStyle(grade)`: mapeia as 10 grades (COMMON,UNCOMMON,RARE,LEGENDARY,IMMORTAL,ARCANA,BEYOND,CELESTIAL,DIVINE,COSMIC) → um badge/cor war-table escalando (o ícone NÃO distingue grade). Cores on-palette (dim→text→gold→teal→coral ou tons; documentar a rampa).
  - Puros. Unit-test: itemIcon resolve/ausente; gearName mapeia + fallback; gradeStyle cobre as 10 grades.
- [ ] **Step 3:** `pnpm -F web test`+typecheck+build. **Commit** `feat(web): vendorizar ícones de gear/itens (517) + item-format (itemIcon/gearName/gradeStyle)`.

---

### Task 2: GearPane — destravar aba + hero picker + slot grid
**Files:** `apps/web/components/app-shell.tsx`, `apps/web/app/page.tsx`, `apps/web/components/gear/{gear-pane,slot-grid}.tsx`.
**Interfaces:** `<GearPane rec db />`; estado de herói + slot selecionados mora no GearPane.

- [ ] **Step 1: destravar aba** — em `app-shell.tsx`, mudar a tab `gear` de `disabled:true` → `false` (o painel `keepMounted` é criado automático pelo map de abas habilitadas). Em `app/page.tsx`, renderizar `<GearPane rec={rec} db={db}/>` quando `activeTab==='gear'` (espelhar como runes-pane é montado).
- [ ] **Step 2: hero picker** (`gear-pane.tsx` ou `gear/hero-picker`) — lista a party (`rec.meta.party` ou equivalente) com `heroIcon`/`heroName` (format.ts:82,89); clicar seleciona o herói (estado) e **reseta o slot selecionado**. Herói default = o primeiro/carry.
- [ ] **Step 3: slot grid** (`slot-grid.tsx`) — os 10 slots do herói selecionado a partir de `rec.gear.slots` filtrado por `heroKey`. Cada célula: ícone do `current` (via `itemIcon`) + badge de grade (`gradeStyle`) + nível; célula vazia (sem item) e selecionada (borda war-table) distintas. Labels de slot PT-BR (Elmo/Armadura/Luvas/Botas/Amuleto/Brinco/Anel/Bracelete + as 2 armas por `gearType`). **Joia = só-inherent** (não assumir gearType). Clicar numa célula seleciona o slot (abre o comparador do T3 — placeholder ok aqui).
- [ ] **Step 4: smoke** (jsdom): aba Gear navegável; hero picker troca herói; grid mostra 10 slots com o item atual do demo. `pnpm -F web test`+typecheck+build. **Commit** `feat(web): aba Gear — hero picker + grid de 10 slots (item atual + grade)`.

---

### Task 3: Comparador do slot (atual vs best + candidatos owned)
**Files:** `apps/web/components/gear/slot-compare.tsx`, wire no `gear-pane.tsx`; expor `powerDelta` + `psd`/heroSave pro comparador (via context/engine-bridge — SEM lógica nova de engine, só plumbing/query).
**Interfaces:** dado (heroKey, slot) → comparador.

- [ ] **Step 1: plumbing** — garantir que o comparador tem acesso a `db`, `psd` (parsed save) e `powerDelta` (export de `@tbh/engine`). Se o context/engine-bridge ainda não expõe `psd`, expor (parse uma vez; **não** muda lógica de engine). Resolver o `heroSave` do herói selecionado (de `psd...heroSaveDatas`).
- [ ] **Step 2: atual vs best** (`slot-compare.tsx`) — do `rec.gear.slots[selected]`: mostrar o item **atual** (ícone/nome/grade/nv + stats principais) e o **best-in-slot** (`.best`, com `dPower`); exibir **ΔPOWER** (destaque) + **ΔDPS/ΔEHP** (secundários) via os campos do `PowerDelta`. Se `swaps` recomenda esse slot, realçar "trocar".
- [ ] **Step 3: candidatos owned** — enumerar os itens que o jogador POSSUI compatíveis com o slot (filtrar `psd...itemSaveDatas` pelo `gearType` do slot; armas só do mesmo gearType, armadura/joia livre), pontuar cada um com `powerDelta(db, heroSave, psd, slot, itemKey)`, ordenar por `dPower` desc. Lista com ícone+nome+grade + ΔPOWER + pills **EQUIPADO / MELHOR / TENHO**. (Query pura — extrair um helper testável se ficar grande.)
- [ ] **Step 4: smoke** (jsdom): selecionar um slot com item mostra atual vs best (ΔPOWER renderiza); ≥1 candidato owned aparece ranqueado (com o demo save). `pnpm -F web test`+typecheck+build. **Commit** `feat(web): comparador de slot — atual vs best + candidatos owned por powerDelta`.

## Self-Review
Ícones+helpers → T1; aba+picker+grid → T2; comparador → T3. Engine intocado (só `powerDelta`/`rec.gear` já existentes). War-table/PT-BR-UI(nomes EN)/zero-any. Smokes por task. Joia = só-inherent. Grade por badge (ícone não distingue).

## Pós-merge (controller): review final whole-branch (Opus) → merge `--no-ff` → push → deploy. Atualizar memória + ledger. João revisa depois.
