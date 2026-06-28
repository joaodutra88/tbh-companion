# TBH Companion — Fase 3: UI Core (Design Spec)

- **Data:** 2026-06-28
- **Status:** Aprovado em bloco (usuário: "escolhe recomendados, dale; ajeita depois") → pronto p/ writing-plans
- **Projeto:** `tbh-companion` (Fase 3 de 6)
- **Depende de:** Fases 1 (engine+save) e 2 (market backend) — concluídas, deployadas.

> Prosa PT-BR; código em inglês. **UI em PT-BR** (público BR; i18n real fica pra Fase 6).

---

## 1. Objetivo
Transformar `/` no **app de verdade**: um shell com tema próprio + a aba **Overview** funcional — o **coach card** (próxima jogada), a **party roster** com sprites, e a **faixa de meta** (POWER/DPS/EHP/gold). É a primeira fase visual; o visual importa.

**Não-objetivos (fases futuras):** abas Farm/Runas/Gear (Fase 4); telas de mercado/sell (Fase 5, consome o backend da Fase 2); i18n 16 idiomas, PWA, charts, notificações, toggle de tema (Fase 6). A conversão US$→R$ do orderbook é da Fase 5 (decidido).

---

## 2. Direção visual — "Mesa de estratégia" (war-table)

Subject: *TBH: Task Bar Hero*, idle-RPG de fantasia. O app é o **centro de comando** do jogador — lê o save e aponta a jogada ótima. Tom: fantasia escura + instrumentação de dados (não o preto-chapado+verde-ácido genérico de IA).

### Tokens (CSS vars em `globals.css`, mapeados no Tailwind)
**Cor** (6 base + 3 funcionais):
- `--bg` `#0E1320` (indigo-slate profundo — base) · `--surface` `#161D2E` (cards) · `--surface-2` `#1E2740` · `--line` `#2A3552` (hairlines)
- `--text` `#E6EAF2` · `--dim` `#8A97B2`
- `--gold` `#E8B04B` (POWER / gold / accent primário — a moeda do jogo) · `--teal` `#46D6B8` (DPS) · `--coral` `#F2685C` (risco / EHP baixo / alerta)

**Tipografia** (via `next/font`):
- Display: **Space Grotesk** (títulos, logo, headings — caráter, restrito)
- Body: **Inter** (texto, labels)
- Data/Mono: **JetBrains Mono** (POWER, DPS, EHP, gold, ETAs — números viram telemetria) ← assinatura content-driven
- Escala: display 28-40px/600-700; body 14-15px/400-500; mono 13-22px/500-600 tabular-nums.

**Signature (o que o app é lembrado):**
1. **Coach card = briefing da próxima jogada** — herói carry (sprite) + a diretiva ("Troque pro stage X" / "Compre a runa Y") em destaque. É a razão de existir do app, então é o herói da tela.
2. **POWER em mono dourado** ancorando cada card de herói (a métrica-rei do jogo).
3. **Faixa de meta estilo "task bar"** — nó sutil ao nome do jogo (*Task Bar*): barra horizontal de status com POWER/DPS/EHP/gold.

**Quality floor:** responsivo até mobile, foco de teclado visível, `prefers-reduced-motion` respeitado. Dark-only nesta fase. Motion: discreto (reveal no load do Overview, hover nos cards) — nada de excesso.

---

## 3. Arquitetura

```
apps/web/
├─ app/
│  ├─ layout.tsx          # fonts (next/font) + <RecommendationProvider> + metadata
│  ├─ page.tsx            # `/` = AppShell + Overview (substitui o stub)
│  ├─ globals.css         # tokens (CSS vars) + base dark
│  └─ lab/page.tsx        # mantido (debug); passa a usar o context
├─ components/
│  ├─ app-shell.tsx       # top bar (logo + status + save controls) + tab nav + main
│  ├─ connect-save.tsx    # gate/empty-state + controles (Conectar / Demo / Live-watch)
│  ├─ overview/
│  │  ├─ coach-card.tsx   # SIGNATURE: briefing da próxima jogada (carry + diretiva)
│  │  ├─ meta-strip.tsx   # POWER/DPS/EHP/gold (mono) — "task bar"
│  │  ├─ roster.tsx       # grid de HeroRosterCard
│  │  ├─ hero-card.tsx    # sprite, nome, classe·lvl, POWER, DPS share, DPS/EHP, XP/ETA, AP
│  │  └─ do-now.tsx       # lista priorizada de recommend().actions
│  └─ ui/                 # shadcn components conforme necessário (card, button, badge, tooltip, progress)
├─ lib/
│  ├─ recommendation-context.tsx  # RecommendationProvider + useRecommendation()
│  ├─ action-text.ts      # recommend().actions[].k → string PT-BR (+ test)
│  ├─ format.ts           # fmt/fmtK/fmtDur/heroIcon helpers (+ test)
│  └─ save/, steam/, engine-bridge.ts  # (já existem)
└─ public/game/heroes/    # sprites vendorizados (de tbh-copilot/assets/game/heroes/)
```

### 3.1 Estado — `RecommendationProvider` (React context)
Encapsula save + engine. Expõe `useRecommendation()`:
```ts
interface RecommendationState {
  status: "idle" | "loading" | "ready" | "error";
  source: "demo" | "file" | "live" | null;
  rec: Recommendation | null;
  error: string | null;
  connect(): Promise<void>;   // picker → decrypt → recommend
  watch(): Promise<void>;     // File System Access live-watch
  demo(): Promise<void>;      // bundled demo save
  disconnect(): void;
}
```
Internamente usa `lib/save` (`connectViaPicker`/`watchSaveFile`/`loadDemoText` + `textToSave`) e `engine-bridge.runRecommend`. O save vive só na memória do client (privacidade). `/lab` e o Overview consomem o mesmo context.

### 3.2 Assets
Vendorizar `tbh-copilot/assets/game/heroes/` → `apps/web/public/game/heroes/`. Como `db.heroes[key].icon` já é `/game/heroes/portraits/Hero_<k>_<n>.png`, o `heroIcon(hk, db) = db.heroes[String(hk)]?.icon ?? ""` resolve direto como URL pública (Next serve `public/` na raiz). `<img onError>` esconde o que faltar. (Sprites de gear/itens/boss = Fases 4-5.)

### 3.3 action-text (coach / do-now)
`actionText(a: Action, db: GameDB): string` mapeia cada `a.k` pra PT-BR, espelhando o `actionText` do copilot (`dashboard.html`) mas em PT-BR e tipado. Ex.: `rune_almostfree`→"{n} runa(s) quase de graça", `farm_switch`→"Troque pro stage {to}", `farm_push`→"Tente o stage {to} (lv {lvl})", `rune_dps_path`→"Caminho de DPS: runa {target} (~{cost} gold)", `party_tank`→"Bote {hero} de frente", `gear_swap`→"{n} troca(s) de equip valem POWER", `gear_enchant`→"{n} slot(s) de encante abertos", `gear_jewelry`→"{n} joia(s) faltando", `synthesis`→"Fundir {n}× grade {grade}", `pet_swap`→"Troque o pet ativo", `fire_protection`→"Resistência a fogo baixa ({hero})". `coach` = `actionText(rec.coach)`.

---

## 4. Componentes (cada um com responsabilidade única)
- **AppShell** — topo: logo "TBH **Companion**", dot de status (idle/live/erro) + texto, controles de save (quando conectado: refresh/disconnect). Nav de abas: **Overview** ativa; Farm/Runes/Gear/Shop/Sell/History/Chests como chips desabilitados "em breve". Slot de conteúdo.
- **ConnectSave** — quando `status!=='ready'`: card central "Conecte seu save" com **Conectar save** (picker), **Demo**, e **Live-watch** (Chrome/Edge); caminho do save (`SaveFile_Live.es3 · AppData\LocalLow\TesseractStudio\TaskbarHero`); erros em voz da interface.
- **CoachCard** (signature) — `rec.coach`: sprite do carry (`rec.meta.carryHero`), label "Próxima jogada", a diretiva (`actionText(rec.coach)`), e (se houver) um detalhe curto. Vazio → "Tudo otimizado por agora 👌".
- **MetaStrip** — **POWER da party = soma de `rec.heroes[].power`** (o `recommend().meta` NÃO traz POWER agregado — só DPS/EHP/gold; POWER é por-herói), DPS = `rec.meta.partyDPS`, EHP = `rec.meta.partyEHP`, Gold = `rec.meta.gold`. Tudo em mono; POWER em dourado, maior.
- **Roster** + **HeroCard** — `rec.heroes` ordenado por POWER desc: sprite (`heroIcon`), nome (`db.heroes[hk].name` PT-BR) + classe·lvl, **POWER** (mono, dourado), barra de DPS share (teal, % do `partyDPS`), DPS/EHP (mono), XP-to-next + ETA (`rec.level`/`rec.xpForecast`), ponto de AP não-gasto se houver. Carry recebe marcador.
- **DoNowList** — `rec.actions` (já priorizado pelo engine) → `actionText` cada, ícone por tipo, top ~8.

## 5. Fluxo de dados
```
ConnectSave (demo/picker/live) → RecommendationProvider
  → lib/save (decrypt/parse) + engine-bridge.runRecommend(text)  [client]
  → rec: Recommendation  → context
  → Overview (CoachCard / MetaStrip / Roster / DoNow) lê via useRecommendation()
```
Save 100% no client. Sprites de `public/game/`. Nada de rede com o save.

## 6. Testes
- **Vitest (node):** `action-text.test.ts` (cada `k` → string PT-BR correta, com substituições), `format.test.ts` (fmtK/fmtDur/heroIcon).
- **Vitest + jsdom + @testing-library/react** (setup leve nesta fase): 1 smoke do Overview — renderiza com o `rec` do demo (via provider/mock) e asserta que aparecem POWER (número), o texto do coach, e os nomes dos heróis. Config: `environment: 'jsdom'` para `*.tsx` tests (ou um segundo projeto vitest); instalar `@testing-library/react` + `jsdom`.
- **Build/visual:** `pnpm -F web build` verde; o implementer tira screenshot do Overview (demo) e auto-critica contra a direção visual (§2) — ajusta antes de finalizar.

## 7. Critérios de sucesso (verificáveis)
- [ ] `/` renderiza o shell com o tema war-table (fonts Space Grotesk/Inter/JetBrains Mono carregadas; paleta aplicada).
- [ ] Empty-state pede save; **Demo** popula o Overview: coach briefing, meta strip com números reais (~POWER/DPS 967 do fixture), roster com **sprites**, do-now com ações.
- [ ] **Conectar save** (picker) decripta e popula; **Live-watch** atualiza (Chrome/Edge).
- [ ] Responsivo (mobile), foco de teclado visível, reduced-motion respeitado.
- [ ] `pnpm -F web test` (helpers + smoke) + `typecheck` + `build` + CI verdes; zero `any` no que componentes/lib exportam.
- [ ] Deployado; o Overview ao vivo não parece template (direção visual aplicada).

## 8. Riscos & mitigação
| Risco | Mitigação |
|---|---|
| Setup RTL/jsdom atrita com o vitest node atual | Usar projeto/condição por extensão (`*.tsx`→jsdom) ou `// @vitest-environment jsdom` no topo do smoke; manter os testes node existentes intactos |
| Sprites faltando p/ algum heroKey | `<img onError>` esconde; nome/POWER continuam |
| `rec.meta` não ter um POWER de party agregado | usar soma de `rec.heroes[].power` se `meta` não trouxer; confirmar no shape real do `recommend()` |
| UI "template" | seguir §2 à risca; screenshot + auto-crítica do implementer; controller revisa ao vivo |
| Next 16 + next/font + 3 famílias | usar `next/font/google` (Space_Grotesk, Inter, JetBrains_Mono) com CSS vars |

## 9. Roadmap (contexto) — 4 Otimização · 5 Mercado (consome Fase 2 + converte US$→R$) · 6 Polimento (i18n/PWA/charts/tema/notif).
