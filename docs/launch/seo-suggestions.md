# SEO & Lançamento — TBH Companion

> DRAFT. Tudo aqui é pra **descoberta máxima** (GitHub + Google + comunidades), grátis e open-source.
> Ângulo único: o **único** app que une optimizer de save + árvore de runas + comparador de gear +
> (em breve) preços do Steam Market, 100% client-side, sem login, sem telemetria, com créditos
> explícitos. Nenhum concorrente entrega tudo isso junto.

---

## 1. GitHub Topics (colar em Settings → Topics)

18 topics, lowercase-hifenizados, priorizados por descoberta:

```
task-bar-hero
tbh
idle-rpg
idle-game
steam-game
game-companion
game-optimizer
gear-optimizer
rune-tree
farm-calculator
steam-market
client-side
save-analyzer
nextjs
typescript
turborepo
fan-project
open-source
```

**Prioridade máxima** (se for limitar): `task-bar-hero`, `tbh`, `idle-rpg`, `idle-game`,
`game-optimizer`, `steam-market`. Evitar topics genéricos demais (`javascript`, `web`) que afogam o repo.

## 2. Descrição do repo (campo "Description", ~160 chars)

```
Client-side companion for TBH: Task Bar Hero — save optimizer, 197-node rune tree, gear comparator & Steam Market backend. No login, no server, your save never leaves your browser.
```

- **Website** (campo ao lado): `https://tbh-companion-web.vercel.app`

## 3. Tagline / hook (topo do README)

```
Todas as ferramentas do TBH numa aba só — otimizador de farm, árvore de runas (197 nós),
comparador de gear e leitor de save. Sua save nunca sai do browser. Sempre.
```

Versão EN curta (pra posts internacionais):

```
All your TBH tools in one tab — farm optimizer, 197-node rune tree, gear comparator & save reader.
Your save never leaves your browser. Always. Free & open-source.
```

## 4. Keywords-alvo (long-tail, inserir naturais no body do README)

EN (volume/relevância): `taskbar hero optimizer`, `task bar hero rune tree`,
`tbh farming calculator`, `task bar hero best stage to farm`, `tbh gear compare`,
`task bar hero best in slot`, `tbh save analyzer`, `taskbar hero companion app`,
`task bar hero rune order`, `tbh afk farming tips`, `steam market prices tbh`.

PT-BR (comunidade brasileira, pouco atendida — diferencial, já que a UI é PT-BR):
`taskbar hero guia`, `tbh melhores runas`, `task bar hero melhor stage para farmar`,
`tbh calculadora de farm`.

> Sem keyword stuffing — o parágrafo "O que é" + a tabela de Features já cobrem a maioria.

## 5. Claim de privacidade como diferencial

A frase **"sua save nunca sai do browser" / "your save never leaves your browser"** deve aparecer:

- [ ] no subtítulo do README (já no draft);
- [ ] na `metadata.description` do Next.js (`apps/web/app/layout.tsx`) e no `og:description`.

Hoje a description do `layout.tsx` é genérica:
`"Optimization companion for the idle-RPG TBH: Task Bar Hero — reads your save locally in the browser."`
Sugestão de upgrade (com o claim + keywords):
`"Free client-side companion for TBH: Task Bar Hero — farm optimizer, 197-node rune tree & gear comparator. Your save never leaves your browser."`
Concorrentes (ex.: tbhwiki.org) usam analytics e não têm o claim de save client-side. O TBH
Companion tem os dois (zero analytics + save 100% local) — é o claim mais forte do projeto.

## 6. Social preview (Open Graph / GitHub)

- [ ] Criar imagem **1280×640** (logo "TBH Companion" + tagline + screenshot do Farm/Runas).
- [ ] GitHub: Settings → Social preview → upload.
- [ ] Next.js: adicionar `openGraph`/`twitter` em `metadata` apontando pra um `/opengraph-image`.

## 7. Checklist de lançamento

**Repo / GitHub**
- [ ] Promover `docs/launch/README.draft.md` → `README.md` (depois da revisão do João).
- [ ] Aplicar os 18 **topics** (seção 1).
- [ ] Setar **Description** + **Website** (seção 2).
- [ ] **Corrigir a `LICENSE`**: `(c) lezards` → `(c) EuSouOGiba (https://eusouogiba.com)` (crítico — bate com o copyright upstream).
- [ ] Confirmar que a branch default no GitHub é `main` (badge de CI aponta pra `?branch=main`).
- [ ] Subir **social preview image** (seção 6).
- [ ] Adicionar `screenshots/` com ≥3 prints reais (Overview, Farm, Runas) — README já referencia.
- [ ] `CONTRIBUTING.md` (monorepo pnpm/Turborepo, `pnpm test`/`typecheck`, como rodar o oráculo).
- [ ] `.github/ISSUE_TEMPLATE/` (bug report + feature request).
- [ ] `CHANGELOG.md` (Fase 1 done: engine port + 103 asserts; próximas fases: Vender/Loja/Histórico).
- [ ] Decidir PWA (manifest + service worker, como o tbh-copilot tinha) — fase futura ou já no lançamento.

**Next.js / SEO on-page**
- [ ] Atualizar `metadata.description` + `openGraph` (seção 5).
- [ ] Garantir `<title>` e headings com "TBH: Task Bar Hero" e termos-chave.

**Distribuição (alcance)**
- [ ] **Steam** — postar no fórum do jogo (app `3678970`). Título sugerido:
      _"TBH Companion — optimizer + rune tree + gear compare + Steam Market backend, 100% client-side & open-source"_.
      Mencionar: grátis, open-source, credita a comunidade, **UI em PT-BR** (raro no ecossistema).
- [ ] **Reddit** — r/incremental_games ("I built a free client-side companion for TBH…").
- [ ] **Discord oficial do TBH** — canal de ferramentas/fan-tools.
- [ ] Linkar de volta pro repo em todos os posts (backlinks ajudam o ranking do README no Google).

## 8. Panorama competitivo (contexto — por que o ângulo é único)

| Player | Optimizer | Rune tree | Gear compare | Steam Market | Client-side | Open-source |
|--------|:--------:|:--------:|:-----------:|:-----------:|:----------:|:----------:|
| **TBH Companion** | ✅ | ✅ (197 nós) | ✅ | 🔜 backend pronto | ✅ | ✅ |
| taskbarhero.wiki | ✅ | – | BiS finder | – | parcial | – |
| tbhprice.com | – | – | – | ✅ | ✅ | – |
| taskbarhero.one | ✅ | party builder | – | ✅ | ? | – |
| tbh-copilot (shigake) | ✅ | – | – | – | ✅ | ✅ |

Ninguém entrega **optimizer + rune tree + gear compare + market** junto, client-side e open-source.
tbhprice faz market sem optimizer; a wiki faz optimizer sem market integrado. O TBH Companion fecha o ciclo.
