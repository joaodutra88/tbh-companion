# TBH Companion — Fase 3 (UI Core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. The UI task implementer should also lean on the frontend-design principles in the spec §2. Steps use checkbox (`- [ ]`).

**Goal:** Tornar `/` o app: shell com tema "war-table" + aba **Overview** funcional (coach card, party roster com sprites, faixa de meta), alimentada pelo save no client.

**Architecture:** `RecommendationProvider` (context, envolve save layer + engine-bridge) → componentes do Overview consomem `useRecommendation()`. Tema via CSS vars + Tailwind; fontes via `next/font`. Sprites de herói vendorizados em `public/game/`. Tudo client-side; save nunca sai do browser.

**Tech Stack:** Next.js App Router, React, TypeScript strict, Tailwind + shadcn/ui, next/font (Space Grotesk / Inter / JetBrains Mono), Vitest (+ jsdom/RTL p/ 1 smoke).

## Global Constraints
- **Node 20**; **TS strict**; **zero `any`** no que componentes/lib exportam.
- **UI em PT-BR**. Tema **dark-only** nesta fase. Save **só no client** (sem rede com o save).
- **Direção visual = spec §2** (war-table): cores `--bg #0E1320 / --surface #161D2E / --surface-2 #1E2740 / --line #2A3552 / --text #E6EAF2 / --dim #8A97B2 / --gold #E8B04B / --teal #46D6B8 / --coral #F2685C`; display **Space Grotesk**, body **Inter**, mono **JetBrains Mono** (números com `tabular-nums`); POWER em dourado/mono é a âncora.
- **Quality floor:** responsivo até mobile, `:focus-visible` visível, `prefers-reduced-motion` respeitado.
- **POWER da party = soma de `rec.heroes[].power`** (o `recommend().meta` só traz `partyDPS`/`partyEHP`/`gold`/`carryHero`/`carryShare`).
- `heroIcon(hk, db) = db.heroes[String(hk)]?.icon ?? ""` (já é `/game/...`, resolve direto; `<img onError>` esconde faltantes).
- Fonte de referência de UI/labels: `tbh-copilot/dashboard.html` (port das ideias pra React+PT-BR, NÃO copiar o HTML).
- Não quebrar os testes/endpoints das Fases 1-2.

## File Structure
```
apps/web/
├─ app/{layout.tsx (fonts+provider), page.tsx (shell+Overview), globals.css (tokens), lab/page.tsx (usa context)}
├─ components/
│  ├─ app-shell.tsx · connect-save.tsx
│  └─ overview/{coach-card,meta-strip,roster,hero-card,do-now}.tsx
├─ lib/{recommendation-context.tsx, action-text.ts(+test), format.ts(+test), overview-smoke.test.tsx}
└─ public/game/heroes/  (vendored sprites)
```

---

### Task 1: Tema + fontes + shell + vendorizar sprites

**Files:**
- Modify: `apps/web/app/globals.css`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/tailwind.config.ts` (se existir; Tailwind v4 usa `@theme` no css)
- Create: `apps/web/components/app-shell.tsx`
- Add: `apps/web/public/game/heroes/**` (vendored)

**Interfaces:**
- Produces: tokens CSS + fontes carregadas; `<AppShell>` (top bar + tab nav stubs + children slot); `/` renderiza o shell.

- [ ] **Step 1: Vendorizar sprites de herói.**
Run (Bash):
```bash
mkdir -p apps/web/public/game/heroes
cp -r "C:/Users/joao/Documents/01-projetos-2026/tbh-copilot/assets/game/heroes/." apps/web/public/game/heroes/
ls apps/web/public/game/heroes/portraits | head
```
Expected: portraits `Hero_101_*.png … Hero_601_*.png` presentes.

- [ ] **Step 2: Tokens em `globals.css`.** Definir as CSS vars do §2 em `:root`, aplicar `background:var(--bg); color:var(--text)` no `body`, e (Tailwind v4) expor via `@theme inline` os tokens como cores utilitárias (`--color-bg`, `--color-surface`, `--color-gold`, `--color-teal`, `--color-coral`, etc.) + font families. Garantir `@media (prefers-reduced-motion: reduce){ *{animation:none!important;transition:none!important} }` e estilos `:focus-visible`.

- [ ] **Step 3: Fontes em `layout.tsx`** via `next/font/google`:
```ts
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", weight: ["500","600","700"] });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["500","600","700"] });
// no <html className={`${display.variable} ${body.variable} ${mono.variable}`}> ; metadata title "TBH Companion"
```
Mapear `--font-display/body/mono` nas font-families do tema. (O `<RecommendationProvider>` entra na Task 2.)

- [ ] **Step 4: `AppShell`.** Top bar: logo "TBH **Companion**" (display), à direita um slot de status/save (preenchido pela Task 2 — por ora um espaço). Tab nav: `Overview` ativa + chips desabilitados `Farm · Runas · Gear · Loja · Vender · Histórico · Baús` com aria-disabled + título "em breve". `<main>` com `children`. Estilo war-table (surface, hairlines `--line`, gold no item ativo). Responsivo (tabs viram scroll horizontal no mobile).

- [ ] **Step 5: `/` (page.tsx)** renderiza `<AppShell>` com um placeholder do Overview por ora ("Conecte um save" — substituído na Task 2/3).

- [ ] **Step 6: Verificar.**
Run: `pnpm -F web build` → sucesso, `/` no route list.
Run: `pnpm -F web dev` e (se possível) tirar screenshot de `/` → tema dark war-table, fontes aplicadas, tabs visíveis. Auto-crítica vs §2.

- [ ] **Step 7: Commit**
```bash
git add apps/web
git commit -m "feat(web): war-table theme (tokens+fonts), AppShell with tab nav, vendor hero sprites"
```

---

### Task 2: RecommendationProvider (context) + ConnectSave

**Files:**
- Create: `apps/web/lib/recommendation-context.tsx`, `apps/web/components/connect-save.tsx`
- Modify: `apps/web/app/layout.tsx` (wrap com provider), `apps/web/app/page.tsx` (usar status/ConnectSave), `apps/web/app/lab/page.tsx` (migrar p/ o context — opcional mas preferível)

**Interfaces:**
- Consumes: `lib/save` (`connectViaPicker`, `watchSaveFile`, `loadDemoText`, `textToSave`), `lib/engine-bridge` (`runRecommend`).
- Produces: `RecommendationProvider`, `useRecommendation(): RecommendationState` (status/source/rec/error + connect/watch/demo/disconnect — shapes no spec §3.1).

- [ ] **Step 1: `recommendation-context.tsx`** — `createContext` + provider com `useState` p/ status/source/rec/error. `demo()`: `runRecommend(loadDemoText())`. `connect()`: `connectViaPicker()` → `runRecommend(text)`. `watch()`: `watchSaveFile(text => setRec(await runRecommend(text)))` guardando o stop handle p/ `disconnect()`. Tratar erros → `status:"error"` + mensagem em voz da interface. `"use client"`. `useRecommendation` lança se usado fora do provider.

- [ ] **Step 2: Wrap no `layout.tsx`** com `<RecommendationProvider>` (client boundary).

- [ ] **Step 3: `ConnectSave`** — card central (quando `status!=='ready'`): título "Conecte seu save", botões **Conectar save** (connect), **Demo** (demo), **Live-watch** (watch; só mostrar/ativar onde `showOpenFilePicker` existe), caminho `SaveFile_Live.es3 · AppData\LocalLow\TesseractStudio\TaskbarHero`, e `error` visível (voz da interface, ex.: "Não consegui ler o save — confira o arquivo e tente de novo."). Loading state.

- [ ] **Step 4: `/` usa o context** — se `status==='ready'` mostra o Overview (placeholder até Task 3); senão `<ConnectSave/>`. AppShell mostra o dot de status (idle/live/erro) + (quando ready) refresh/disconnect.

- [ ] **Step 5: Teste do context (node ok p/ a lógica pura).** Um teste leve: mockar `engine-bridge.runRecommend` + `lib/save.loadDemoText`, montar o provider, chamar `demo()`, asseverar `status` vai a `ready` e `rec` é setado. (Se exigir jsdom, usar `// @vitest-environment jsdom`.)

- [ ] **Step 6: Verificar.** `pnpm -F web test` (novos + existentes verdes), `pnpm -F web typecheck`, `pnpm -F web build`. Dev: clicar **Demo** → status ready (placeholder do Overview aparece).

- [ ] **Step 7: Commit**
```bash
git add apps/web
git commit -m "feat(web): RecommendationProvider context + ConnectSave (demo/picker/live-watch)"
```

---

### Task 3: Overview — helpers + componentes (coach/meta/roster/hero/do-now) + smoke

**Files:**
- Create: `apps/web/lib/format.ts` (+`format.test.ts`), `apps/web/lib/action-text.ts` (+`action-text.test.ts`), `apps/web/components/overview/{coach-card,meta-strip,roster,hero-card,do-now}.tsx`, `apps/web/lib/overview-smoke.test.tsx`
- Modify: `apps/web/app/page.tsx` (montar o Overview real)

**Interfaces:**
- Consumes: `useRecommendation()`, `@tbh/engine` types + `loadGameDB`/db (via bridge or context — expose the loaded `db` from the provider so components can resolve hero names/icons), `@tbh/game-data`.
- Produces: `format` (`fmt`, `fmtK`, `fmtDur`, `pct`, `heroIcon`), `actionText(a, db)`, e os componentes do Overview.

> **Nota:** o provider (Task 2) deve também expor o `db: GameDB` carregado (o `runRecommend` já faz `loadGameDB()` — guardar e expor no context), pra os componentes resolverem `db.heroes[hk].name/.icon` e `actionText` sem recarregar. Adicionar `db` ao `RecommendationState`.

- [ ] **Step 1: `format.ts` + test.** `fmt(n)` (inteiro com separador), `fmtK(n)` (1.2k/3.4M), `fmtDur(sec)` ("2h 13m"), `pct(x)` (0..1→%), `heroIcon(hk, db)`. Teste cada um (ex.: `fmtK(1234)→"1,2k"` ou `"1.2k"` — escolher e testar consistente; `fmtDur(8000)→"2h 13m"`).

- [ ] **Step 2: `action-text.ts` + test.** `actionText(a: Action, db: GameDB): string` mapeando todos os `k` pra PT-BR (lista no spec §3.3). Teste: cada `k` conhecido → string esperada com substituições (ex.: `{k:'farm_switch',to:'1301'}`→ contém "1301"); `k` desconhecido → fallback genérico não-vazio.

- [ ] **Step 3: `meta-strip.tsx`.** Recebe `rec`. POWER = `rec.heroes.reduce((s,h)=>s+h.power,0)` (mono, dourado, maior); DPS=`rec.meta.partyDPS`; EHP=`rec.meta.partyEHP`; Gold=`rec.meta.gold` (todos `fmt`/`fmtK`, `tabular-nums`). Layout "task bar" horizontal (4 células com label + valor), responsivo (2×2 no mobile).

- [ ] **Step 4: `coach-card.tsx` (signature).** Recebe `rec` + `db`. Sprite do carry (`heroIcon(rec.meta.carryHero, db)`), eyebrow "Próxima jogada", diretiva grande = `actionText(rec.coach, db)` (ou "Tudo otimizado por agora 👌" se `!rec.coach`). Destaque visual (gold accent, surface elevada). É o herói da tela — maior peso visual.

- [ ] **Step 5: `hero-card.tsx` + `roster.tsx`.** `roster` ordena `rec.heroes` por `power` desc e mapeia `hero-card`. `hero-card`: sprite (`heroIcon`), nome (`db.heroes[String(hk)].name` — pode ser objeto i18n; pegar `pt-BR` ou string), classe·`Lv {level}`, **POWER** (mono dourado, âncora), barra DPS share (largura = `h.dps/partyDPS*100`%, teal), DPS/EHP (`fmtK`, mono, com ícones), XP-to-next + ETA (de `rec.level.find(l=>l.heroKey===hk)`), ponto de AP se `level.ap>0`. Marcar o carry (`rec.meta.carryHero`). Hover sutil. (Hero sheet completo = Fase 4 — não nesta fase.)

- [ ] **Step 6: `do-now.tsx`.** `rec.actions` (já priorizado) → top ~8, cada um `actionText(a, db)` + ícone por `a.k`. Vazio → "—".

- [ ] **Step 7: Montar o Overview no `page.tsx`.** Quando `status==='ready'`: `<CoachCard/>` → `<MetaStrip/>` → `<Roster/>` → grid com `<DoNow/>` (e espaço p/ "resumo" futuro). Reveal sutil no load (respeitando reduced-motion).

- [ ] **Step 8: Smoke `overview-smoke.test.tsx`** (`// @vitest-environment jsdom`, `@testing-library/react`). Instalar `@testing-library/react` + `jsdom` (devDeps). Renderizar o Overview com um `rec` do demo (mockar `useRecommendation` p/ retornar `status:'ready'`, o `rec` real do `runRecommend(loadDemoText())` ou um fixture mínimo, e `db`). Asserir: aparece um número de POWER, o texto do coach, e ≥1 nome de herói.

- [ ] **Step 9: Verificar + auto-crítica visual.** `pnpm -F web test` (helpers + smoke + existentes), `typecheck`, `build`. Dev: **Demo** → Overview completo; **tirar screenshot** e auto-criticar vs §2 (coach é o herói? POWER em mono dourado? sprites aparecem? não parece template?) — ajustar e re-screenshot até ficar bom.

- [ ] **Step 10: Commit**
```bash
git add apps/web
git commit -m "feat(web): Overview — coach card, meta strip, party roster (sprites), do-now + helpers"
```

---

## Self-Review (cobertura do spec)
- Tema/fontes/§2 → Task 1. Shell+tabs → Task 1. Sprites vendor → Task 1. Context/estado §3.1 → Task 2. ConnectSave (demo/picker/live) → Task 2. `db` exposto p/ componentes → Task 3 nota. format/action-text §3.3 → Task 3. Coach/Meta/Roster/HeroCard/DoNow §4 → Task 3. POWER=Σ heroes.power → Task 3 Step 3. Save client-side → Task 2. Testes (helpers+smoke) → Task 3; quality floor (responsivo/focus/reduced-motion) → Task 1 §2. Deploy/CI → fora das tasks (controller mergeia → auto-deploy, igual fases anteriores).
- Placeholders: nenhum "TBD"; passos não-visuais (tokens, fonts, context, helpers) têm código/contrato concreto; passos visuais dão tokens + contrato de dados + direção §2 (o implementer aplica taste do frontend-design + screenshot/auto-crítica — apropriado p/ UI).
- Consistência: `useRecommendation()`/`RecommendationState` (com `db`) definidos na Task 2/3 e consumidos nos componentes; `heroIcon`/`actionText`/`fmt*` definidos na Task 3 e usados nos componentes; `recommend().meta` shape (sem POWER agregado) tratado explicitamente.

## Nota de verificação pós-merge (controller): mergear → push (auto-deploy Vercel) → screenshot do `/` ao vivo (demo) p/ confirmar o visual e mostrar ao usuário.
