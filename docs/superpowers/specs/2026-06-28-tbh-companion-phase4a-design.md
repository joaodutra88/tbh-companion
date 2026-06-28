# TBH Companion — Fase 4a: Farm + Idle + Chests (Design Spec)

- **Data:** 2026-06-28
- **Status:** Aprovado em bloco (usuário: "escolhe recomendados, dale; ajeita depois")
- **Projeto:** `tbh-companion` — Fase 4 (Otimização), **parte 1 de 2** (4a). 4b = Runas + Gear.
- **Depende de:** Fases 1-3 (engine, market backend, UI core/Overview) — na `main`, deployadas.

> Prosa PT-BR; código inglês. UI PT-BR. Design = war-table da Fase 3 (tokens/utilities Tailwind). Save client-only.

## 1. Objetivo
Acender as abas de **"onde/quando jogar"**: **Farm** (otimizador de farm + idle/offline + calibração) e **Baús** (timers de auto-abertura). O engine já calcula `rec.farm` e `rec.idle`; falta o chests no output e a UI. Também estabelece a **navegação entre abas** (até agora só Overview tinha conteúdo).

**Não-objetivos (4b/depois):** Runas (árvore 197 nós) e Gear (comparador) = Fase 4b. Mercado = Fase 5. i18n/PWA/charts/a11y-polish = Fase 6.

## 2. Decisões (defaults recomendados)
| # | Decisão | Escolha |
|---|---|---|
| D1 | `chests` no engine | Adicionar `chests: chestPlan(db, psd, { farm })` ao retorno do `recommend()` (+ tipo + teste). Oráculo continua verde (adição de chave) |
| D2 | Navegação de abas | **Estado client-side** no shell (a `rec` já está no context; sem dados por-rota). Aba ativa renderiza seu pane. Ativar **Farm** + **Baús**; Runas/Gear seguem "em breve" |
| D3 | Idle | Dobrado dentro da aba **Farm** (seção offline/retorno), como o copilot |
| D4 | Calibração do farm | Input manual de **tempo de clear** (stage atual + 1 extra) → `context.recalibrate(opts)` re-roda `recommend(text, { clearSamples })`. O context guarda o último `saveText` p/ recomputar |
| D5 | Projeções | Mostrar, pro stage recomendado: gold e nível projetados em **1/3/5/8h** (via `goldPerSec` + engine `projectLevel`) |
| D6 | Design | War-table da Fase 3 (mesmos tokens/utilities, mono dourado pros números, teal/coral funcionais), PT-BR |

## 3. Mudanças no engine (`packages/engine`)
- `recommend()`: incluir `chests: chestPlan(db, psd, { farm })` no objeto de retorno; refinar o tipo `Recommendation.chests` (de `unknown`) pro retorno real de `chestPlan` (`ChestPlan`). Sem `any`. Teste: novo assert no suite — `rec.chests` existe e tem `dropCooldown` + `types` (3 tipos: normal/boss/act). Os 103 asserts existentes seguem verdes.

## 4. Mudanças no context (`apps/web/lib/recommendation-context.tsx`)
- Guardar o último `saveText: string | null` (de demo/connect/watch) no estado interno.
- `recalibrate(opts: RecommendOpts): Promise<void>` — re-roda `runRecommend(saveText, opts)` e atualiza `rec` (mantém source/db). Erro → status error com detalhe (padrão já estabelecido).
- Expor `recalibrate` no `useRecommendation()`. `runRecommend` passa a aceitar `opts` (já existe `RecommendOpts` no engine; hoje fixa `{elapsedSec:0}` — passar `{ elapsedSec:0, ...opts }`).

## 5. Componentes (apps/web)
- **Navegação:** `AppShell` recebe `activeTab` + `onTabChange` (ou o `/` gerencia o estado e passa o pane ativo). Abas habilitadas: Overview, Farm, Baús. As demais continuam `aria-disabled` "em breve". A aba ativa controla qual pane `/` renderiza (Overview | Farm | Chests). Mobile: tabs scrolláveis (já é).
- **Farm pane** (`components/farm/`):
  - **Recomendado:** card do stage recomendado (`rec.farm.recommend`): label/nome/nível, **gold/h** e **exp/h** (mono dourado/teal), clear time, badge se já está no melhor (`onBest`). Estado de calibração (`calibrated`/`calSource`: model/rate/clears/fit) com rótulo honesto.
  - **Tabela de stages** (`rec.farm.all`): linhas dos stages farmáveis, **ordenável** por gold/h, exp/h, densidade (exp/HP, gold/HP), clear time. Destacar o atual e o recomendado. Colunas em mono.
  - **Calibração:** input(s) de tempo de clear (segundos) do stage atual (+ opção de adicionar outro stage) → `recalibrate({ clearSamples: [...] })`. Texto honesto ("informe seu tempo de clear pra calibrar").
  - **Idle/Offline** (seção, de `rec.idle`): se `unlocked`, curva offline — full gold/exp no cap, **tempo até o cap (8h)** (`secsToCap`/`capHours`), acumulado atual, e **melhor stage pra estacionar** (`bestPark`). Se não unlocked, dica.
  - **Projeções:** pro stage recomendado, gold e nível em 1/3/5/8h (engine `projectLevel`/`goldPerSec`).
- **Chests pane** (`components/chests/`): de `rec.chests` — pros 3 tipos (normal/stage-boss/act-boss): cooldown de auto-abertura (base − redução das runas), capacidade, e se está `slowOpen`/`unlocked`. Janela de drop compartilhada (`dropCooldown` ~5min). Melhor stage pra loot de baú (`best`) com clears por janela. Texto honesto onde o engine rotula estimativa.

## 6. Fluxo de dados
```
context (rec + db + saveText)
  → AppShell activeTab → / renderiza pane ativo
  → Farm pane lê rec.farm + rec.idle; calibração → context.recalibrate(opts) → re-recommend → rec atualiza
  → Chests pane lê rec.chests
```
Tudo client-side; sem rede (o backend de mercado da Fase 2 não é usado aqui).

## 7. Testes
- **engine:** assert `rec.chests` presente + shape (dropCooldown, types[3]); 103 existentes verdes.
- **web (node):** helpers de formatação novos se houver (gold/h, exp/h) testados; um teste do context `recalibrate` (mock runRecommend → rec atualiza com novos opts).
- **web (jsdom/RTL):** smoke do Farm pane com o `rec` do demo — aparece o stage recomendado + gold/h; smoke do Chests pane — aparece ≥1 tipo de baú com cooldown.
- **build/visual:** `pnpm -F web build`; implementer screenshota Farm + Chests (demo) e auto-critica vs war-table; controller revisa ao vivo pós-merge.

## 8. Critérios de sucesso
- [ ] `recommend()` retorna `chests`; engine suite verde (103 + novo).
- [ ] Navegação: clicar Farm/Baús troca o pane; Overview segue funcionando; Runas/Gear "em breve".
- [ ] Farm (demo): stage recomendado com gold/h+exp/h, tabela ordenável, seção idle (tempo até cap + park), projeções; calibração re-roda e muda os números.
- [ ] Baús (demo): 3 tipos com cooldown/capacidade + janela de drop.
- [ ] `pnpm -F web test` + `typecheck` + `build` + CI verdes; zero `any`; deployado; visual war-table.

## 9. Riscos
| Risco | Mitigação |
|---|---|
| Adicionar `chests` quebrar o oráculo | É adição de chave; asserts existentes não mexem. Rodar o suite |
| `recalibrate` precisa do save mas context só tinha rec | Guardar `saveText` no context (D4) |
| `rec.farm.all` grande (muitos stages) | Tabela com scroll/virtualização leve se preciso; ordenar client-side |
| Navegação client-side vs rotas | Estado no shell é suficiente (app é save-gated, sem deep-link de conteúdo); rotas ficam pra depois se precisar |
| chestPlan exige opts (favKeys) | Passar `{ farm }` só; favoritos (★) são feature do Gear (4b) |
