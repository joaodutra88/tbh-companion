# TBH Companion — Fase 4b-i.2: Acessibilidade, shadcn & Polês — Design Spec

- **Data:** 2026-06-29 · Status: aprovado em bloco (autônomo — João: "qnd terminar o review/merge/deploy pode iniciar o plano de design sem me perguntar, dps eu analiso e ajeito").
- Depende de: Fase 4b-i.1 (Clareza) — mergeada na main (`a988722`), deployada.
- **Fonte:** `docs/superpowers/reviews/2026-06-29-frontend-uiux-audit.md` (auditoria UI/UX: 29 achados, lente ui-ux-pro-max + shadcn).

## Objetivo
Elevar acessibilidade e polimento do app **sem reskin** — dentro do sistema "war-table" já existente. Fechar os 6 críticos de a11y do relatório, os quick wins, adotar os primitivos shadcn que resolvem a11y (Tabs/Select/Tooltip), e uma camada de beleza (profundidade/ritmo/feedback). **Sem mudar o engine.** UI/chrome continua pt-BR; nomes de entidade seguem o seletor de idioma (já existe).

**Princípio de beleza (do relatório):** profundidade/ritmo/feedback, NÃO reskin. Glow só nos 2 "heróis" visuais (CoachCard + RecommendedCard). Microinterações que fecham loops (spinner, sucesso). Densidade legível. shadcn primitivo-a-primitivo **SEMPRE mapeado pros tokens war-table** (herda a11y/comportamento, mantém a pele). `prefers-reduced-motion` respeitado.

**Não-objetivos:** 4b-ii Gear; Fase 5 Mercado; reescrever componentes que já estão bons (Overview/Baús core); inventar nova identidade visual.

## Contexto técnico confirmado
- App **JÁ importa `shadcn/tailwind.css`** e tem um `Button` interno → adoção de primitivos shadcn encaixa (mapear pros tokens, nunca trazer o look default).
- Tokens war-table: bg `#0E1320`, surface/surface-2, line, dim, text, gold `#E8B04B`, teal `#46D6B8`, coral `#F2685C`. Fontes Space Grotesk/Inter/JetBrains Mono.
- Nav de abas client-side (`app-shell.tsx`); `RecommendationProvider` expõe `status` (`idle|loading|ready|error`); `EntityLocaleProvider` + `<LanguageSelect>` já no top-bar.
- Extensão claude-in-chrome estala no chunk de 1.9MB → verificar via tests/build, não screenshot.

## Escopo por prioridade (3 frentes)

### Frente 1 — Acessibilidade + quick wins (baixo risco, alto valor)
- **Hierarquia de heading:** logo vira `<h1>` (ou um h1 visualmente-oculto por página); garantir uma ordem de heading sã (a aba ativa tem o h1/h2 principal). Sem mudança visual.
- **Contraste WCAG:** trocar `text-dim/50`–`/70` (e similares com opacity que reprovam 4.5:1) por `text-dim` puro (ou um token de contraste adequado). Varrer o app.
- **cursor-pointer:** `@layer base { button:not(:disabled), [role=button], a { cursor: pointer } }` no globals.css (preflight Tailwind v4 removeu).
- **Roles/ARIA:** barra de DPS-share → `role="progressbar"` + `aria-valuenow/min/max/aria-label` (hero-card); slider de orçamento de runa → `aria-valuetext`; bloco de erro do ConnectSave → `role="alert"`; `<title>` SVG dentro do `<g>` de cada nó de runa (tooltip nativo + leitura AT).
- **Estados:** `<Loader2 className="animate-spin">` no CTA "Conectar save" durante `status==='loading'`; **esconder a nav de abas enquanto `status!=='ready'`** (não deixar clicar numa aba que ainda mostra ConnectSave); empty states úteis em DoNow e StageTable (ícone + msg curta); container de auto-farm vira `block` quando `!bestPark` (em vez de grid 2-col com buraco).
- **Ícones:** trocar emojis estruturais por Lucide — `🔄`→`RefreshCw`, `💤`→`Moon`, remover `👌` do action-text. (Os selos/labels de texto não mudam.)
- **Cópia:** "ver na árvore" → "Ver na árvore"; revisar subtítulos truncados.

### Frente 2 — shadcn primitivos que resolvem a11y (mapeados pros tokens)
- **Tabs (Radix):** a nav de abas vira shadcn/Radix Tabs → resolve `role=tablist/tab/tabpanel` + `aria-controls` + roving tabindex de graça. Manter a pele atual (underline gold, "em breve" desabilitadas). O conteúdo de cada aba vira `TabsContent` (mantendo o estado client atual).
- **Select:** o `<select>` nativo da calibração (2º stage) e o `<LanguageSelect>` viram shadcn Select (Radix) → nome acessível + dropdown dark (fim do chrome nativo claro no Win11). Mapear pros tokens.
- **Tooltip:** informação hoje só em `title`/hover (AP, EHP, densidade, "calibrado pelos seus clears", abas "em breve") vira shadcn Tooltip (hover + **foco** + touch) → acessível por teclado/AT.
- Instalar via shadcn CLI só os 3 primitivos; theming nos tokens; zero look-default.

### Frente 3 — Beleza (profundidade/ritmo/feedback)
- **StageTable:** zebra striping sutil (`odd:bg-surface-2/30`) + header sticky (já tem sticky? reforçar) pra densidade legível.
- **Árvore de runas — teclado:** trocar `role="img"` por `role="application"` (ou group) + roving tabindex nos nós recomendados/owned (não nos 197 — foco nos acionáveis) + skip-link "pular árvore". (a11y da árvore que o relatório marcou como crítico.)
- **Microinteração de calibração:** ao calibrar com sucesso, feedback "Calibrado!" em teal (curto, reduced-motion-safe) fechando o loop.
- **Glow com parcimônia:** auditar que só CoachCard + RecommendedCard têm o glow/gradient "herói"; remover glow de cards de contexto se houver vazamento.
- `animation-delay` inline → utility Tailwind (`[animation-delay:60ms]`).

## Arquitetura (apps/web)
```
app/globals.css                    # cursor-pointer base; utilities de animation-delay
components/ui/{tabs,select,tooltip}.tsx   # shadcn primitivos (mapeados pros tokens)
components/app-shell.tsx           # Tabs (Radix); h1; esconder nav até ready
components/connect-save.tsx        # Loader2 no CTA; role=alert no erro
components/overview/{hero-card,do-now}.tsx  # progressbar; empty state
components/farm/{calibration,stage-table,farm-pane}.tsx  # Select; success feedback; zebra/sticky; auto-farm block
components/runes/{rune-tree,rune-legend,runes-pane}.tsx   # teclado/role/title; aria-valuetext; copy
components/language-select.tsx     # shadcn Select
lib/action-text.ts                 # remover emoji
```

## Testes
- jsdom smoke por frente: nav tem role=tablist/tab + tabpanel (Tabs); CTA de conectar mostra spinner em loading; nav some quando status!=ready; barra DPS tem role=progressbar; Select da calibração tem nome acessível; StageTable tem zebra (classe verificável); nó de runa tem `<title>`.
- pure: nenhum (mudanças são de UI/markup); manter os 139 testes existentes verdes.
- typecheck + build + CI verdes; zero `any`; war-table.

## Critérios de sucesso
- [ ] Os 6 críticos de a11y do relatório fechados (h1, contraste, Tabs ARIA, árvore teclado, progressbar, Select acessível).
- [ ] Quick wins aplicados (cursor-pointer, role=alert, hide-nav-until-ready, Loader2, emoji→Lucide, empty states).
- [ ] shadcn Tabs/Select/Tooltip adotados, mapeados pros tokens (sem look default).
- [ ] Beleza: StageTable zebra+sticky, microinteração de calibração, glow contido. `prefers-reduced-motion` respeitado.
- [ ] `pnpm -F web test` + typecheck + build + CI verdes; nada do engine mudou.

## Riscos
| Risco | Mitigação |
|---|---|
| shadcn/Radix Tabs reescreve a nav e quebra o estado de aba | adotar Tabs mantendo o mesmo estado controlado (value/onValueChange = activeTab/onTabChange); smoke da nav |
| Primitivos shadcn trazem look default (fora da paleta) | theming explícito nos tokens war-table; revisar cada um; nunca classes default |
| Tailwind v4 + shadcn CLI no Next 16 (config nova) | ler `node_modules/next/dist/docs` se topar API nova; usar o `tailwind.css`/Button já existentes como referência |
| Contraste: trocar opacity pode achatar hierarquia | usar token de contraste correto (text-dim já passa?) e checar visualmente via tokens, não no escuro |
| Mudança de role na árvore quebra cliques/seleção | preservar onClick/onSelect; só adicionar teclado; smoke |
| screenshot estala | verificar via tests/build/read_page |
