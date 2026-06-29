# TBH Companion — Fase 4b-i.2 (Acessibilidade, shadcn & Polês) Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development. War-table design (frontend-design). Checkbox steps.

**Goal:** Fechar os 6 críticos de a11y + quick wins do relatório, adotar shadcn Tabs/Select/Tooltip (mapeados pros tokens), e uma camada de beleza (profundidade/ritmo/feedback). **Sem mudar o engine.** Fonte: `docs/superpowers/reviews/2026-06-29-frontend-uiux-audit.md`.

## Global Constraints
Node 20; TS strict, zero `any`; war-table tokens (sem look default do shadcn — theming explícito); UI/chrome PT-BR (nomes de entidade seguem o seletor já existente); mono nos números; `prefers-reduced-motion` respeitado; save client-only; **engine intocado**. Não quebrar Fases 1-4b-i.1 nem os 139 testes existentes. Verificação via tests/build (screenshot estala). Next 16: se topar API nova, ler `node_modules/next/dist/docs` antes.

## File Structure
Ver spec. Sequência: T1 (a11y+quick wins) → T2 (shadcn) → T3 (beleza). T1 e T2 ambos tocam `app-shell.tsx` → sequenciais (T1 põe h1/hide-nav, T2 troca a nav por Tabs).

---

### Task 1: Acessibilidade + quick wins (sem shadcn)
**Files:** `app/globals.css`, `components/app-shell.tsx`, `components/connect-save.tsx`, `components/overview/{hero-card,do-now}.tsx`, `components/farm/{farm-pane,calibration}.tsx`, `components/runes/{rune-tree,rune-legend,runes-pane,rune-panels}.tsx`, `lib/action-text.ts`. (+ smoke tests)
**Interfaces:** mudanças de markup/CSS/ARIA; sem novas deps.

- [ ] **Step 1: cursor + contraste (globals.css + sweep):** em `globals.css`, `@layer base { button:not(:disabled), [role="button"], a[href] { cursor: pointer } }`. Varrer `text-dim/50`,`/60`,`/70` (e outros tokens com opacity que reprovam contraste em conteúdo informativo) → `text-dim` puro (ou token adequado). NÃO mexer em opacity puramente decorativa (glows, watermarks).
- [ ] **Step 2: heading + nav-gate (app-shell):** logo do top-bar vira `<h1>` (font-display, mesma aparência). **Esconder a `<nav>` de abas quando `status!=='ready'`** — exige o app-shell saber o status (passar via prop do `page.tsx`/provider). Enquanto não-ready, só o ConnectSave aparece (sem nav clicável que mostra conteúdo vazio).
- [ ] **Step 3: estados/roles:** `connect-save.tsx` — `<Loader2 className="animate-spin">` no CTA durante loading + `role="alert"` no bloco de erro. `hero-card.tsx` — barra de DPS-share vira `role="progressbar"` + `aria-valuenow/min=0/max=100/aria-label`. `rune-legend.tsx` — slider de orçamento ganha `aria-valuetext` (ex. "até 12.500 gold"). `rune-tree.tsx` — `<title>` SVG dentro do `<g>` de cada nó (nome localizado da runa) pra tooltip nativo + AT.
- [ ] **Step 4: empty/edge + ícones + cópia:** empty states úteis em `do-now.tsx` (nada a fazer → ✓ + msg) e `stage-table.tsx`/`farm-pane.tsx` (lista vazia → msg). `farm-pane.tsx` AutoFarmHighlights: quando `!bestPark`, container vira `block` (não grid 2-col com buraco). Emojis estruturais → Lucide: `🔄`→`RefreshCw`, `💤`→`Moon` (farm-pane), remover `👌` de `action-text.ts`. "ver na árvore" → "Ver na árvore" (rune-panels/runes-pane). `animation-delay` inline → utility `[animation-delay:Nms]`.
- [ ] **Step 5: smoke** (jsdom): nav some quando status!=ready (e aparece quando ready); CTA conectar mostra spinner em loading; barra DPS tem `role="progressbar"`; nó de runa tem `<title>`; bloco de erro tem `role="alert"`. `pnpm -F web test`+typecheck+build. **Commit** `feat(web): a11y + quick wins (h1, contraste, cursor, roles ARIA, estados, emoji→lucide)`.

---

### Task 2: shadcn primitivos (Tabs/Select/Tooltip) mapeados pros tokens
**Files:** `components/ui/{tabs,select,tooltip}.tsx` (shadcn), `components/app-shell.tsx` (Tabs), `components/farm/calibration.tsx` (Select), `components/language-select.tsx` (Select), e os sites de info-só-em-`title` (Tooltip). (+ smoke)
**Interfaces:** primitivos Radix com a11y nativa; pele war-table.

- [ ] **Step 1: instalar/themar:** adicionar os 3 primitivos shadcn (Tabs, Select, Tooltip) — via CLI ou copiando os componentes — em `components/ui/`. **Themar nos tokens war-table** (bg-surface/surface-2, border-line, text/dim/gold; radius/sombra do sistema). Confirmar que o app já tem o setup shadcn (importa `shadcn/tailwind.css` + tem `Button`); seguir o mesmo padrão. Zero classes do look default.
- [ ] **Step 2: Tabs:** a nav de `app-shell.tsx` vira `<Tabs value={activeTab} onValueChange={onTabChange}>` com `<TabsList>`/`<TabsTrigger>` (mantendo underline gold + "em breve" `disabled`) e o conteúdo via `<TabsContent>` (preservando o estado/render atual por aba). Resolve role=tablist/tab/tabpanel + aria-controls + roving tabindex. Não mudar a aparência.
- [ ] **Step 3: Select:** o `<select>` nativo do 2º stage em `calibration.tsx` e o `<LanguageSelect>` viram shadcn `Select` (nome acessível + dropdown dark themado). Manter o texto das opções (`stageOptionText`; 16 idiomas).
- [ ] **Step 4: Tooltip:** envolver com `<Tooltip>` a info que hoje só vive em `title`/hover — abas "em breve" (app-shell), e métricas tipo AP/EHP/densidade/"calibrado pelos seus clears" onde houver `title`. Acessível por hover + foco + touch. Não poluir; só onde agrega.
- [ ] **Step 5: smoke** (jsdom): nav renderiza `role="tablist"` + `role="tab"` + um `role="tabpanel"`; trocar de aba via Tabs muda o conteúdo; Select da calibração tem nome acessível (`aria-label`/label). `pnpm -F web test`+typecheck+build. **Commit** `feat(web): adotar shadcn Tabs/Select/Tooltip mapeados pros tokens war-table`.

---

### Task 3: Beleza — densidade, teclado da árvore, microinterações
**Files:** `components/farm/{stage-table,calibration}.tsx`, `components/runes/rune-tree.tsx`, e auditoria de glow nos cards. (+ smoke)
**Interfaces:** polimento visual + teclado; sem novas deps além do T2.

- [ ] **Step 1: StageTable densidade:** zebra striping sutil (`odd:bg-surface-2/30`) nas linhas; garantir header `sticky top-0` (reforçar se já tem) com fundo opaco. Preservar os realces de linha melhor/atual.
- [ ] **Step 2: teclado da árvore de runas:** `rune-tree.tsx` — trocar `role="img"` por `role="application"` (ou `group` com label); tornar focáveis (roving `tabIndex`) os nós **acionáveis** (recommended/almostfree/owned — não os 197) + `onKeyDown` (Enter/Espaço = selecionar); skip-link "Pular a árvore de runas". Preservar onClick/onSelect e a perf (React.memo).
- [ ] **Step 3: microinteração de calibração:** `calibration.tsx` — ao calibrar com sucesso, feedback curto "Calibrado!" em teal (ex. um estado que aparece ~2s), respeitando `prefers-reduced-motion` (sem animação se setado). Fecha o loop de feedback.
- [ ] **Step 4: glow contido:** auditar que só `CoachCard` (overview) e `RecommendedCard` (farm) usam o glow/gradient "herói"; se algum card de contexto vazou o tratamento, reduzir. (Pode ser no-op se já estiver contido — documentar.)
- [ ] **Step 5: smoke** (jsdom): StageTable tem linhas com a classe de zebra; um nó acionável da árvore tem `tabIndex`/`onKeyDown` (focável) e Enter seleciona; calibração mostra o feedback de sucesso após calibrar. `pnpm -F web test`+typecheck+build. **Commit** `feat(web): polês — zebra/sticky na tabela, teclado na árvore de runas, feedback de calibração`.

## Self-Review
Frente 1 a11y/quick wins → T1; shadcn Tabs/Select/Tooltip → T2; beleza/teclado/microinteração → T3. Engine intocado. War-table/PT-BR-UI/zero-any/reduced-motion. Smokes por task. 139 testes existentes continuam verdes.

## Pós-merge (controller): review final whole-branch (Opus) → merge `--no-ff` → push → deploy. Atualizar memória + ledger. João revisa depois e ajeita o que achar necessário.
