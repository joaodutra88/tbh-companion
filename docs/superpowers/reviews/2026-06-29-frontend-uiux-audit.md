# Auditoria de UI/UX — TBH Companion (tema "war-table")

> Data: 2026-06-29 · Escopo: shell/navegação, Overview, Farm, Baús, Runas + oportunidades shadcn/ui cross-cutting.
> Síntese de 6 auditorias de área, deduplicada e priorizada por impacto real no jogador.

## (a) Resumo executivo

A base está sólida: tokens semânticos sem hex cru, `:focus-visible` global em gold, `prefers-reduced-motion` resetado globalmente, `tabular-nums`/JetBrains Mono em todos os números e identidade war-table coesa. Os problemas reais são de **acessibilidade** (hierarquia de headings, padrão ARIA de tabs incompleto, árvore de runas mouse-only, contraste de texto `dim` com opacidade reduzida) e de **consistência de interação** (botões sem `cursor-pointer` por causa do Preflight do Tailwind v4, CTAs hand-rolled ignorando o `Button` do design system, emojis usados como ícones, informação escondida só em `title`). Nenhum exige reescrita — são correções cirúrgicas que cabem no sistema atual, várias delas one-liners globais. As melhores alavancas: adotar 3-4 primitivos do shadcn/ui (Tabs, Select, Tooltip, Skeleton/ScrollArea) e fechar os loops de feedback (loading, sucesso de calibração, empty states).

## (b) Achados por prioridade

### CRITICAL

#### C1 — Hierarquia de headings quebrada (sem `<h1>`, seções-chave como `<span>`/`<p>`)
- **Área:** transversal (Shell, Overview, Farm, Runas) · **Categoria:** Acessibilidade
- **Onde:** `app-shell.tsx:49` (logo como `<span>`), `overview/coach-card.tsx:67` ("Próxima jogada" como `<span>`), `farm/farm-pane.tsx:109` (nome do stage recomendado como `<p>`), `runes/rune-panels.tsx:58,91` (sub-títulos como `<p>`)
- **Problema:** o documento não tem `<h1>` — o logo "TBH Companion" é um `<span>`. Além disso, os elementos mais importantes de cada aba (o CTA do CoachCard, o nome do stage recomendado) não são headings, enquanto seções secundárias usam `<h2>`. Quem navega por headings (atalho H no leitor de tela) pula a ação principal e cai direto no secundário.
- **Recomendação:** promover o logo a `<h1>` mantendo as classes atuais (`font-display font-semibold text-[18px]`), ou um `<h1 className="sr-only">TBH Companion</h1>`. Promover "Próxima jogada" e o nome do stage a `<h2>` (mesmas classes visuais). Padronizar os sub-títulos das listas de Runas como `<h3>`. Mudança puramente de tag, zero impacto visual.

#### C2 — Texto com opacidade reduzida (`dim/50`–`dim/70`) reprova contraste WCAG AA
- **Área:** transversal (Shell, Farm, Baús) · **Categoria:** Acessibilidade
- **Onde:** `connect-save.tsx:59,69`; `farm/stage-table.tsx:100-103`; `farm/projections.tsx:41`; `farm/idle-section.tsx:81`; `chests/chests-pane.tsx:129`
- **Problema:** `dim` (#8A97B2) já passa com folga em opacidade cheia (~5.7:1 sobre surface), mas os modificadores `/50`/`/60`/`/70` derrubam o contraste para ~2.7–3.9:1 — abaixo do mínimo de 4.5:1 (WCAG 1.4.3). Afeta conteúdo informativo real: caminho do save, "(Chrome/Edge)", contagem de stages, hint de ordenação, subtítulo de projeções, label de cap, "estimada pelo servidor".
- **Recomendação:** remover os modificadores de opacidade — usar `text-dim` puro. Onde for genuinamente decorativo, marcar `aria-hidden="true"` em vez de reduzir contraste. Para hierarquia visual de menor peso, preferir `text-[10px] uppercase tracking-wider` em vez de abaixar a opacidade.

#### C3 — Padrão ARIA de tabs incompleto (sem `tabpanel`/`aria-controls`/`id`/roving tabindex)
- **Área:** Shell/navegação · **Categoria:** Acessibilidade · **[shadcn: Tabs]**
- **Onde:** `app-shell.tsx:63-86` + `page.tsx:86-93`
- **Problema:** os botões têm `role="tab"` e `aria-selected`, mas não há `id` nos tabs, nem `aria-controls`, e o `<main>` que renderiza o conteúdo não tem `role="tabpanel"`/`aria-labelledby`. A tríade tablist > tab[aria-controls] > tabpanel[aria-labelledby] do ARIA APG não se fecha; AT não navega da aba para o painel. Falta também roving tabindex (todas as abas estão no tab stop) e navegação por setas.
- **Recomendação:** dar `id="tab-{id}"` a cada botão; envolver o children do `<main>` em `<div role="tabpanel" id="panel-{activeTab}" aria-labelledby="tab-{activeTab}" tabIndex={0}>`; adicionar `aria-controls`. Roving tabindex (ativa=0, demais=-1) + setas. **Atalho recomendado:** adotar o primitivo `Tabs` do shadcn/ui (Radix), que entrega isso de graça — com a ressalva de mapear para o padrão atual de `border-b-gold`.

#### C4 — Árvore de runas inteira é mouse-only (`role="img"` no SVG + nós sem teclado)
- **Área:** Runas · **Categoria:** Acessibilidade
- **Onde:** `runes/rune-tree.tsx:335` (`<svg role="img">`) e `runes/rune-tree.tsx:91-157` (`RuneNodeEl`)
- **Problema:** dois bugs que se somam. (1) `role="img"` no `<svg>` faz todos os descendentes virarem presentational pelo spec ARIA — os `role="button"`/`aria-label` dos 197 nós são ignorados pela árvore de acessibilidade. (2) Mesmo sem isso, os nós não têm `tabIndex` nem `onKeyDown`. Resultado: nenhum nó é alcançável/acionável por teclado.
- **Recomendação:** trocar `role="img"` por `role="application" aria-label="Árvore de runas"` (preserva os roles dos filhos). Implementar roving tabindex no subconjunto acionável (`recommended`/`almostfree`): só o nó focado tem `tabIndex=0`, demais `-1`; `onKeyDown` com Enter/Space chamando `handleClick` e setas para mover. **Mitigação imediata barata:** um skip-link "Ir para o painel de nós recomendados" acima da árvore — o `RunePanels` já seleciona nós via `onSelect`, então é um caminho de teclado alternativo já existente.

#### C5 — Barra de DPS share sem `role="progressbar"`
- **Área:** Overview (HeroCard) · **Categoria:** Acessibilidade
- **Onde:** `overview/hero-card.tsx:127-133`
- **Problema:** a barra é um `<div>` colorido sem semântica — sem `role`, `aria-valuenow/min/max` ou `aria-label`. Para o leitor de tela o elemento não existe; o "38%" textual fica solto sem contexto.
- **Recomendação:** no `<div>` externo (trilho): `role="progressbar" aria-valuenow={Math.round(share*100)} aria-valuemin={0} aria-valuemax={100} aria-label="DPS share"`. O preenchimento interno fica sem role.

#### C6 — `<select>` do 2º stage de calibração sem nome acessível (e nativo quebra o tema dark)
- **Área:** Farm (Calibration) · **Categoria:** Acessibilidade + Consistência · **[shadcn: Select]**
- **Onde:** `farm/calibration.tsx:104-137` (select + input secundários)
- **Problema:** quando `showExtra` é true, o `<select>` e o `<input>` de tempo ficam num `<div>` genérico sem `<label>` associado nem `aria-label`. AT anuncia "combobox"/"campo de texto vazio" sem contexto (o placeholder "2º stage…" não é label e some ao selecionar). Bônus: é o único controle de seleção nativo do app — no Win11 dark o chrome do dropdown fica claro, com scrollbar do OS e contraste invertido.
- **Recomendação:** mínimo a11y — `aria-label="Segundo stage para calibração"` no `<select>` e `htmlFor`/`id` no input de tempo, com `ref.focus()` ao abrir. **Solução completa:** migrar para o `Select` do shadcn/ui (Radix) — o `shadcn/tailwind.css` já está importado e os tokens (`--popover`, `--border`) já existem, então herda o tema dark imediatamente e resolve label + visual de uma vez.

### IMPORTANT

#### I1 — CTAs hand-rolled ignoram o `Button` do design system
- **Área:** transversal (ConnectSave, Farm, Runas) · **Categoria:** Consistência · **[Button — já existe em `ui/button.tsx`]**
- **Onde:** `connect-save.tsx:31-61`; `farm/calibration.tsx:150-158`; `farm/farm-pane.tsx:150-157`; `runes/rune-panels.tsx:204-210`
- **Problema:** existe um `Button` (base-ui + CVA com `focus-visible:ring-3 ring-ring/50`, `disabled:pointer-events-none`, variants default/outline/secondary) que nunca é usado fora de si mesmo. Todas as CTAs principais são `<button>` cru. Consequência: focus ring, hover e disabled divergem entre telas, e melhorias futuras no DS não propagam.
- **Recomendação:** migrar progressivamente — Conectar save → `variant="default"`; Demo → `variant="secondary"`; Live-watch → `variant="outline"`; Calibrar → `variant="default"`; "ver na árvore" → `variant="outline" size="sm"`. Ganha de graça `disabled:pointer-events-none` e o ring consistente.

#### I2 — Botões sem `cursor-pointer` (Preflight do Tailwind v4 reseta para `default`)
- **Área:** transversal (Runas, Farm) · **Categoria:** Interação
- **Onde:** `runes/rune-legend.tsx:44,126` (Chip, DPS toggle); `runes/rune-tree.tsx:167` (ZoomBtn); `runes/rune-panels.tsx:64,99,204`; `farm/calibration.tsx:141,150`
- **Problema:** o Tailwind v4 Preflight define `button { cursor: default }`. Quase todos os botões clicáveis mostram cursor de seta no hover — especialmente confuso nos chips de categoria, que parecem tags/links clicáveis mas não sinalizam.
- **Recomendação:** **one-liner global** em `globals.css`: `@layer base { button:not(:disabled) { cursor: pointer } }`. Resolve todos de uma vez e mantém o `disabled:cursor-not-allowed` onde aplicável. (Se migrar para o `Button` do DS — I1 — esses casos vêm junto.)

#### I3 — Informação crítica revelada só via atributo `title` (hover)
- **Área:** transversal (Overview, Shell, Farm, Baús) · **Categoria:** Acessibilidade · **[shadcn: Tooltip]**
- **Onde:** `overview/hero-card.tsx:110` (badge "2 AP"); `connect-save.tsx:50-55` (Live-watch); `app-shell.tsx:111` (abas "em breve"); `farm/stage-table.tsx` (colunas Exp/HP e Gold/HP — "densidade"); `chests/chests-pane.tsx:74-76` (capacidade "—"); `overview/meta-strip.tsx:28` (jargão EHP/DPS)
- **Problema:** `title` não dispara por teclado, não aparece em touch, e não é lido de forma confiável por screen readers. Informação que o jogador precisa pra decidir (o que é AP, por que Live-watch está bloqueado, o que "densidade"/EHP significam, por que a capacidade é "—") fica inacessível pra maioria.
- **Recomendação:** adotar o `Tooltip` do shadcn/ui (Radix), que dispara em hover **e** focus e injeta `aria-describedby`. Para Live-watch, basta expandir o hint inline já existente para "Requer Chrome ou Edge". Para AP/EHP/densidade, Tooltip com o texto explicativo. Onde o investimento for mínimo, um `<span className="sr-only">` resolve a leitura por AT.

#### I4 — Nav de abas ativa e clicável antes de conectar o save (UX enganoso)
- **Área:** Shell/navegação · **Categoria:** Navegação
- **Onde:** `page.tsx:87-91` + `app-shell.tsx:63-79`
- **Problema:** com `status !== "ready"`, as abas estão visíveis/clicáveis; clicar em "Farm" muda o tab ativo (gold border, `aria-selected`) mas o conteúdo continua sendo o ConnectSave. O visitante novo clica esperando conteúdo e sempre vê a tela de conexão.
- **Recomendação:** esconder o `<nav>` de abas quando `status` for `idle | loading | error` — o ConnectSave ocupa o `<main>` sozinho; a nav reaparece com Overview ativa após conectar. Mais limpo que bloquear cliques.

#### I5 — Loading do ConnectSave sem spinner/skeleton
- **Área:** Onboarding/ConnectSave · **Categoria:** Feedback · **[shadcn: Skeleton]**
- **Onde:** `connect-save.tsx:34-37` + `page.tsx:87-89`
- **Problema:** em `status="loading"` o CTA só troca o texto para "Carregando…" (sem spinner) e o decode+cálculo pode levar 0.5–2s. Não há indicação de progresso nem sinal de onde o conteúdo vai aparecer; a transição é um salto brusco de "form vazio" para "pane cheio".
- **Recomendação:** `<Loader2 className="animate-spin size-4" aria-hidden>` no CTA primário quando `isLoading` (padrão já usado em Calibration). Considerar um `Skeleton` no `<main>` durante o loading pra antecipar o layout.

#### I6 — Mensagem de erro sem `role="alert"`
- **Área:** Onboarding/ConnectSave · **Categoria:** Acessibilidade
- **Onde:** `connect-save.tsx:75-79`
- **Problema:** o bloco de erro aparece condicionalmente mas sem `role="alert"`/`aria-live`. Quem usa leitor de tela ativa "Conectar save", recebe erro e não ouve nada — teria que tabular manualmente até achar a mensagem.
- **Recomendação:** `role="alert"` no `<div>` de erro. Mais robusto: manter sempre um container `<div role="alert" aria-live="assertive" aria-atomic="true">{error ?? ""}</div>` e injetar o texto dinamicamente.

#### I7 — Empty states ausentes ou pouco informativos
- **Área:** transversal (Overview, Farm, Baús) · **Categoria:** Feedback/Dados
- **Onde:** `overview/do-now.tsx:71` ("—" solitário); `farm/stage-table.tsx:147-208` (tbody vazio sem mensagem); `chests/chests-pane.tsx:153` (seção "melhor stage" some quando `best == null`)
- **Problema:** o estado positivo ("tudo em dia") e os estados sem dados não são comunicados. O "—" do DoNow não distingue "tudo certo" de "erro ao ler o save"; a StageTable some sem aviso; a seção de loot de baú desaparece sem explicar o motivo.
- **Recomendação:** DoNow → ícone `Check` (já importado) + "Tudo em dia — nenhuma ação prioritária." StageTable → `<tr><td colSpan={COLS.length}>Nenhum stage farmável encontrado.</td></tr>` quando `sorted.length === 0`. Baús → renderizar a seção com empty-state ("Stage ótima não identificada — forneça mais dados na aba Farm") em vez de sumir, mantendo o layout estável.

#### I8 — Emojis (🔄 / 💤 / 👌) usados como ícones quebram a convenção Lucide
- **Área:** transversal (Farm, Overview) · **Categoria:** Consistência
- **Onde:** `farm/farm-pane.tsx:173,206` (🔄, 💤); `lib/action-text.ts:50` (👌 "Tudo otimizado por agora")
- **Problema:** todo o app usa SVG Lucide; emojis renderizam diferente entre OS (no Win11 dark podem vir com fundo/baseline distintos), não herdam tokens de cor e perdem significado pra AT mesmo com `aria-hidden`.
- **Recomendação:** 🔄 → `<RefreshCw className="size-3.5 text-gold" />`; 💤 → `<Moon className="size-3.5 text-dim" />` (já importado em idle-section); remover o 👌 do `actionText` e deixar o `Check` da camada de render do CoachCard comunicar o estado positivo.

#### I9 — Valores numéricos sem rótulo para screen reader
- **Área:** Overview (HeroCard, MetaStrip) · **Categoria:** Acessibilidade
- **Onde:** `overview/hero-card.tsx:137-143` (DPS/EHP); `overview/meta-strip.tsx:38-49` (pares label/valor)
- **Problema:** os ícones `Swords`/`Shield` têm `aria-hidden` (correto), mas os números ao lado não têm rótulo — AT lê "1,2k 5,6k" sem contexto. No MetaStrip, as células são `<div><span>label</span><span>valor</span></div>` sem agrupamento; a leitura linear vira "Power 171.505 DPS 1,2k EHP 5,6k…".
- **Recomendação:** `<span className="sr-only">DPS: </span>` / `EHP: ` antes dos números no HeroCard. No MetaStrip, `<div role="group" aria-label="{label}: {value}">` por célula (mínimo) ou `<dl>`/`<dt>`/`<dd>` (semanticamente ideal, zero mudança visual).

#### I10 — Affordance de clique inconsistente (uma falsa, uma faltando)
- **Área:** Overview + Runas · **Categoria:** Interação
- **Onde:** `overview/do-now.tsx:79` (hover sem ação); `runes/rune-panels.tsx:146-162` (itens do carrinho não clicáveis)
- **Problema:** dois lados do mesmo erro. No DoNow, cada `<li>` tem `hover:bg-surface-2/70` (mesmo padrão de itens clicáveis) mas não faz nada — falsa affordance. No "Plano de gasto" das Runas, os itens têm layout idêntico aos de "Recomendadas" (que navegam ao clique) mas são `<li>` estáticos — affordance esperada e ausente.
- **Recomendação:** DoNow → remover `hover:bg-surface-2/70 transition-colors` enquanto for read-only. Carrinho de runas → envolver cada item num `<button onClick={() => onSelect(String(r.key))}>` com as mesmas classes de "Recomendadas" (`onSelect` já chega por props; ~3 linhas por item).

#### I11 — Calibration sem feedback de sucesso
- **Área:** Farm (Calibration) · **Categoria:** Feedback
- **Onde:** `farm/calibration.tsx:38-56,154`
- **Problema:** após `recalibrate()` resolver, o botão volta a "Calibrar" idêntico ao estado inicial — sem confirmação, sem reset dos campos. O único sinal é o badge mudar no RecommendedCard, que pode estar fora do viewport.
- **Recomendação:** estado de confirmação breve (1.5–2s) no botão (ícone `Check` + "Calibrado!" em teal via `useState`) e limpar `clearStr`/`extraStr`/`showExtra`. Fecha o loop sem precisar de toast global.

#### I12 — StageTable: ordenação invisível em mobile + container de scroll não focável
- **Área:** Farm (StageTable) · **Categoria:** Interação/Acessibilidade · **[shadcn: ScrollArea]**
- **Onde:** `farm/stage-table.tsx:101-103` (hint `hidden sm:inline`), `:106` (scroll container), `:127-143` (sort buttons)
- **Problema:** a única dica de que as colunas ordenam é o texto "clique no cabeçalho pra ordenar" com `hidden sm:inline` — invisível < 640px; não há ícone nas colunas inativas. E o `<div max-h-[480px] overflow-y-auto>` não tem `tabIndex={0}`, então teclado não rola o container; com `scrollbarWidth:'none'` nem a scrollbar aparece — parte das linhas fica inacessível.
- **Recomendação:** `<ArrowUpDown className="size-2.5 text-dim/40" />` (decorativo, com `aria-hidden`) nas colunas inativas, dentro do `<button>`. `tabIndex={0}` + `role="region" aria-label="Stages farmáveis"` no container de scroll. Considerar o `ScrollArea` do shadcn/ui, que mostra um thumb estilizado ao hover mantendo o visual limpo.

#### I13 — Runas: filtros de categoria sem `role="group"` + slider de orçamento não anunciado
- **Área:** Runas (RuneLegend) · **Categoria:** Acessibilidade
- **Onde:** `runes/rune-legend.tsx:85-106` (chips de categoria) e `:162-163` (valor do slider)
- **Problema:** os chips de categoria são toggle buttons sem container `role="group"`/`aria-label` — AT anuncia cada botão isolado, sem "você está no grupo de filtros de Categoria". E o `<span>` que mostra `fmt(budget)` não está em região `aria-live`: ao arrastar o slider, AT lê o valor cru do range, nunca o número formatado.
- **Recomendação:** envolver os chips em `<div role="group" aria-label="Filtro por categoria">` (ou `<fieldset>/<legend>`). Para o slider, `aria-valuetext={`${fmt(budget)} gold`}` no `input[type=range]` (anuncia o valor formatado ao arrastar) ou `aria-live="polite"` no span.

#### I14 — Card único de auto-farm ocupa 50% da largura quando offline não está desbloqueado
- **Área:** Farm (AutoFarmHighlights) · **Categoria:** Layout/Responsivo
- **Onde:** `farm/farm-pane.tsx:166-228`
- **Problema:** o container usa `grid grid-cols-1 gap-3 md:grid-cols-2`. Quando `bestPark` é null (jogador iniciante — o caso padrão), só o card "Deixa rolando aqui" renderiza e fica espremido em ~50% da largura no desktop, com metade da tela vazia.
- **Recomendação:** `className={bestPark ? "grid grid-cols-1 gap-3 md:grid-cols-2" : "block"}` no container, ou `md:col-span-2` no card único.

#### I15 — Ícone `Info` com cor `coral` para um alerta (conflito semântico)
- **Área:** Baús (ChestCard) · **Categoria:** Consistência
- **Onde:** `chests/chests-pane.tsx:83` (bloco `slowOpen`)
- **Problema:** o ícone `Info` (semântica de informação) combinado com `text-coral` (cor de risco no DS) para o aviso "abre mais devagar que os drops" — o ícone diz "info", a cor diz "problema". Quem escaneia visualmente pode não captar o aviso.
- **Recomendação:** trocar `Info` por `AlertTriangle` do lucide-react, mantendo `text-coral`.

### MINOR

#### M1 — Sem escala tipográfica semântica (px arbitrários espalhados)
- **Área:** transversal · **Categoria:** Tipografia/Manutenção
- **Onde:** ex. `overview/hero-card.tsx:95,98,102,105,123,125,145`; `chests/chests-pane.tsx:59,135,169,186` (3 tamanhos — 20/22/26px — para métricas de mesmo peso hierárquico)
- **Problema:** ~9 tamanhos em px literais (`text-[10px]`…`text-[30px]`) sem escala definida. Difícil ajustar globalmente; fácil introduzir `text-[15px]` que quebra o ritmo. Em Baús, o `dropCooldown` recebe tratamento VIP (26px) que não corresponde à sua importância relativa.
- **Recomendação:** definir `theme.extend.fontSize` com nomes semânticos (`label:11px`, `body-sm:12px`, `body:13px`, `card-title:14px`, `stat:17px`, `kpi:19px`, `display-sm:24px`, `display:30px`) e trocar os literais. Alinhar as métricas primárias de Baús num único tamanho. Mudança de manutenção, impacto visual mínimo/zero.

#### M2 — Overflow do tablist sem indicador de scroll
- **Área:** Shell · **Categoria:** Layout/Responsivo
- **Onde:** `app-shell.tsx:67-68`
- **Problema:** `overflow-x-auto` + `scrollbarWidth:'none'`; com 8 abas em janelas estreitas o conteúdo transborda sem fade, scrollbar ou seta — o usuário não sabe que pode rolar.
- **Recomendação:** fade-out na borda direita via pseudo-elemento: `after:absolute after:right-0 after:inset-y-0 after:w-8 after:bg-gradient-to-l after:from-surface after:to-transparent after:pointer-events-none`.

#### M3 — `animation-delay` via inline style em vez de Tailwind arbitrary
- **Área:** Overview · **Categoria:** Animação/Consistência
- **Onde:** `overview/overview.tsx:27,31`
- **Problema:** os delays do stagger (60ms/120ms) usam `style={{ animationDelay }}`, misturando CSS-in-JS com o padrão de classes do projeto.
- **Recomendação:** `className="reveal [animation-delay:60ms]"` (Tailwind v4 suporta arbitrary properties). Mantém tudo no className.

#### M4 — "ver na árvore" em minúsculas (inconsistente)
- **Área:** Runas · **Categoria:** Tipografia
- **Onde:** `runes/rune-panels.tsx:207`
- **Problema:** CTA em minúsculas enquanto todo o resto usa sentence-case ("Recomendadas", "Plano de gasto").
- **Recomendação:** "Ver na árvore".

#### M5 — Subtítulo "scroll ou + / −" promete atalhos de teclado que não existem
- **Área:** Runas · **Categoria:** Interação
- **Onde:** `runes/runes-pane.tsx:84`
- **Problema:** o texto "arraste pra mover, scroll ou + / − pra dar zoom" sugere teclas `+`/`−`, mas não há listener de teclado — o usuário pressiona e nada acontece.
- **Recomendação:** reescrever para "arraste pra mover, scroll pra dar zoom", ou de fato adicionar `keydown` para `+`/`=`/`-` no SVG (combina com a navegação por teclado da C4).

#### M6 — Badge "não desbloqueado" em 10px (abaixo do legível)
- **Área:** Baús · **Categoria:** Tipografia · **[shadcn: Badge]**
- **Onde:** `chests/chests-pane.tsx:45`
- **Problema:** `text-[10px]` carrega informação de estado; em 1080p a 100% fica pequeno demais (o contraste coral passa, o tamanho não).
- **Recomendação:** subir para `text-[11px]`/`text-xs`. Ou adotar o `Badge` do shadcn/ui (`variant="destructive"`), que já vem com padding e tamanho mínimo sensatos.

#### M7 — `border-l` do divider "Clears/janela" fica órfão em flex-wrap
- **Área:** Baús · **Categoria:** Layout/Responsivo
- **Onde:** `chests/chests-pane.tsx:181-192`
- **Problema:** o separador `border-l border-line pl-6` num container `flex flex-wrap` — quando quebra linha, a borda esquerda fica no início da 2ª linha sem nada à esquerda.
- **Recomendação:** `border-t md:border-t-0 md:border-l border-line pt-4 md:pt-0 md:pl-6` (vertical no desktop, horizontal no mobile).

#### M8 — ConnectSave não comunica a proposta de valor (onboarding)
- **Área:** Onboarding/ConnectSave · **Categoria:** Onboarding
- **Onde:** `connect-save.tsx:19-27`
- **Problema:** a tela diz "Conecte seu save" + a mensagem (boa) de privacidade, mas não explica o que o app faz. Quem chega via link direto não sabe se verá farming, inventário ou outra coisa.
- **Recomendação:** uma linha de valor antes dos botões: "Receba recomendações de farming, runas e baús a partir do seu save." Onboarding honesto, sem virar marketing.

## (c) "Deixar bonito" — direção visual dentro do war-table

O sistema já tem identidade forte; o polimento é sobre **profundidade, ritmo e feedback**, não sobre reskin. Direção:

- **Hierarquia por superfície, não por tamanho de fonte.** Hoje a ênfase às vezes vem de px maiores (ex.: `dropCooldown` 26px). Migrar para uma escala semântica (M1) e usar `surface` vs `surface-2` + borda `gold/45` (já existe no padrão carry) para destacar o que importa. O olho deve ser guiado pelo contraste de superfície e pelos accents (gold = recompensa, teal = progresso/exp, coral = risco), não por tamanhos ad-hoc.
- **Glow e gradiente com parcimônia.** O CoachCard e o RecommendedCard já usam glow/gradient com bom gosto — manter esses como os dois "heróis" visuais e evitar espalhar glow para cards de contexto (Baús, projeções), preservando a hierarquia.
- **Microinterações de feedback.** Fechar os loops: spinner no loading (I5), "Calibrado!" em teal (I11), empty states com ícone `Check` (I7). São os toques que fazem o app parecer "vivo" sem animação gratuita — e o `prefers-reduced-motion` global já protege contra excesso.
- **Densidade legível.** A aba Farm é data-dense; investir em zebra striping sutil (`odd:bg-surface-2/30`) e sticky header na StageTable melhora a leitura sem sair do tema. O `ScrollArea` (I12) dá um thumb discreto que sinaliza "tem mais" sem poluir.

**Onde o shadcn/ui eleva o polimento (e já encaixa — `shadcn/tailwind.css` está importado, tokens mapeados):**
- **Tabs** (Radix) — resolve C3 inteiro (a11y + roving tabindex + setas) mantendo o visual `border-b-gold`.
- **Select** (Radix) — resolve C6: dropdown estilizado no tema dark, fim do chrome nativo do Win11.
- **Tooltip** (Radix) — resolve I3: AP, EHP/densidade, Live-watch, "em breve" com disparo em hover **e** focus.
- **Skeleton** — I5: antecipa o layout durante o decode do save.
- **ScrollArea** — I12: scrollbar bonita e focável na StageTable.
- **Badge** — M6: chips de estado ("não desbloqueado", "Carry") com tamanho mínimo sensato.
- **Button** (já existe internamente) — I1: consolidar focus ring/disabled/hover em todas as CTAs.

Diretriz de adoção: importar primitivo por primitivo, sempre mapeando para os tokens war-table existentes — **não** trazer o look default do shadcn. O objetivo é herdar acessibilidade e comportamento, mantendo a pele atual.

## (d) Compreensão do sistema como um todo

- **Onboarding / ConnectSave:** é a porta de entrada e hoje subcomunica (sem proposta de valor — M8) e subdá feedback (sem spinner — I5, erro mudo — I6). A mensagem de privacidade ("nada sai do browser") é um diferencial e está bem colocada; falta a linha de "o que você ganha". Primeiro contato é onde mais se perde usuário — vale o capricho.
- **Hierarquia:** quebrada do topo (sem `<h1>` — C1) até as seções (CTAs principais como `<span>`/`<p>`). Corrigir destrava navegação por heading e dá coerência semântica de cima a baixo. É a correção de maior alcance por menor esforço.
- **Navegação:** o padrão ARIA de tabs está pela metade (C3) e as abas ficam interativas antes do save existir (I4), o que desorienta. Adotar `Tabs` + esconder a nav até `ready` deixa o fluxo "conecta → vê conteúdo" óbvio. Não há rotas por aba (estado client-side) — aceitável para web-only com save no browser, mas significa que deep-link/voltar do browser não recuperam a aba; fora de escopo agora, registrar como dívida.
- **Empty / loading:** inconsistente (I5, I7) — ora some a seção, ora aparece um "—". Padronizar um "vazio com propósito" (ícone + frase curta no tom war-table) em DoNow, StageTable e Baús melhora a percepção de robustez.
- **Abas "em breve" (Gear/Loja/Vender/Histórico):** comunicadas só por `title` (I3) — invisível em touch/teclado. Um badge "(breve)" no label + Tooltip resolve. Bom que já estão `aria-disabled`; falta o sinal visual explícito.

## (e) Quick wins (alto retorno, baixo esforço)

1. **`@layer base { button:not(:disabled) { cursor: pointer } }`** em `globals.css` — corrige todos os cursores de uma vez (I2).
2. **Remover os modificadores `/50`–`/70`** dos textos `dim` → `text-dim` puro (C2). Achados/troca direta.
3. **Logo `<span>` → `<h1>`** em `app-shell.tsx:49` (C1, parte crítica).
4. **`role="alert"`** no bloco de erro do ConnectSave (I6).
5. **Trocar emojis por Lucide** — 🔄→`RefreshCw`, 💤→`Moon`, remover 👌 (I8).
6. **`<Loader2 className="animate-spin">`** no CTA "Conectar save" em loading (I5).
7. **Esconder a nav de abas** enquanto `status !== "ready"` (I4).
8. **`aria-valuetext`** no slider de orçamento de runas (I13).
9. **`<title>` SVG** dentro do `<g>` de cada nó de runa (tooltip nativo + leitura por AT, mitiga C4/I3).
10. **"ver na árvore" → "Ver na árvore"** (M4) e reescrever o subtítulo "scroll ou +/−" (M5).
11. **`role="progressbar"` + aria-values** na barra de DPS share (C5).
12. **Empty states** de DoNow e StageTable com ícone `Check`/mensagem (I7).
13. **`animation-delay` inline → `[animation-delay:60ms]`** (M3).
14. **Container único de auto-farm:** `block` quando `!bestPark` (I14).

## (f) Já em andamento — NÃO recontar

Os itens abaixo já estão sendo corrigidos em branch e foram **excluídos** desta auditoria:
- Dificuldade da fase (Normal/Pesadelo/Inferno/Tormento) visível em Farm/Baús (cards, tabela, seletores de calibração).
- Runas: ícones nos nós da árvore (estavam faltando), card "Próxima runa recomendada" liderando o painel, e tradução PT-BR dos stat keys crus (`AllHeroAttackDamage` → …).

> Nota de método: os achados de 6 áreas foram deduplicados por raiz comum (ex.: contraste `dim/xx`, padrão ARIA de tabs, falta de `cursor-pointer`, emojis-como-ícone e `title`-only apareciam em múltiplas áreas e viraram um único item cada). Total consolidado: 29 achados (6 Critical, 15 Important, 8 Minor).
