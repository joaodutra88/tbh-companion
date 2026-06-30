<!--
  DRAFT de lançamento — NÃO substitui o README.md real ainda.
  João revisa, ajusta e só então promove para a raiz do repo.
  Termos buscáveis (SEO) em EN propositalmente: "taskbar hero optimizer",
  "task bar hero rune tree", "tbh farming calculator", "tbh gear compare",
  "tbh save analyzer", "tbh steam market prices". UI/chrome continua PT-BR.
-->

<div align="center">

# TBH Companion

### Todas as ferramentas do **TBH: Task Bar Hero** numa aba só

Otimizador de farm, árvore de runas com 197 nós, comparador de gear e leitor de save —
**100% no seu navegador. Sua save nunca sai do browser. Sempre.**

[![Abrir o app](https://img.shields.io/badge/▶_Abrir_o_app-tbh--companion--web.vercel.app-2ea043?style=for-the-badge)](https://tbh-companion-web.vercel.app)

[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg?style=flat-square)](../../LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/joaodutra88/tbh-companion/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/joaodutra88/tbh-companion/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vercel](https://img.shields.io/badge/deploy-Vercel-black?style=flat-square&logo=vercel)](https://tbh-companion-web.vercel.app)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-blueviolet?style=flat-square)](#contribuindo)

</div>

---

## O que é

**TBH Companion** é um app web de fã (grátis, sem login, sem servidor) para o idle-RPG
**TBH: Task Bar Hero**. Ele lê o seu save **localmente no navegador** e te diz, na prática,
o que fazer a seguir: **qual o melhor stage pra farmar**, **quais runas comprar primeiro**,
**se vale trocar uma peça de gear**, e **quando seus baús abrem**.

O projeto **funde dois projetos open-source da comunidade** num só app:
o motor de otimização do **tbh-copilot** (por [shigake](https://github.com/shigake)) e o backend de
mercado da Steam do **giba-steam-market** (por [EuSouOGiba / lezards](https://github.com/lezards)),
com os dados de fórmulas e tabelas vindos da [taskbarhero.wiki](https://taskbarhero.wiki).
Tudo reescrito em TypeScript, empacotado num monorepo Next.js + Turborepo e publicado na Vercel.

> É o **taskbar hero optimizer** + **tbh farming calculator** + **task bar hero rune tree** +
> **tbh gear compare** num único lugar — sem instalar nada, sem mandar sua save pra lugar nenhum.

## Por que usar (privacidade em primeiro lugar)

- **Sua save nunca sai do browser.** Todo o processamento é client-side. Não há upload,
  não há banco de dados, não há conta pra criar.
- **Sem telemetria, sem analytics, sem cookies de rastreio.** Diferente de várias wikis e
  ferramentas do ecossistema, o TBH Companion não te observa.
- **Grátis e open-source.** Código aberto sob licença MIT, créditos explícitos às fontes.
- **Nada pra instalar.** Abre numa aba do navegador e funciona.

## Features

Tudo na cara, em abas. O que **já funciona hoje**:

| Aba | O que faz | Termos |
|-----|-----------|--------|
| **Overview** | Card de coach com a melhor próxima ação + roster de heróis com POWER / DPS / EHP / XP e uma lista de "faça agora". | tbh coach, best next action |
| **Farm** | Otimizador de stage calibrado pela **sua taxa real de ouro/segundo**, com auto-calibração, timer de idle e projeções de 1 / 3 / 5 / 8 horas. | task bar hero best stage to farm, tbh farming calculator, afk farming |
| **Baús** | Timers de auto-abertura de baús usando os cooldowns reais lidos da sua save. | tbh chest timers |
| **Runas** | **Árvore de runas interativa com 197 nós**, por categoria, mostrando a runa mais barata comprável agora. | taskbar hero rune tree, tbh rune order guide |
| **Gear** | Comparador de gear por slot com **delta de POWER** — mostra na hora se uma peça é upgrade. | tbh gear compare, task bar hero best in slot |

Recursos transversais:

- **Leitor de save 100% local** — abre o `SaveFile_Live.es3` (descriptografia via Web Crypto no
  próprio navegador), com **três modos**: seletor de arquivo (qualquer navegador),
  **live-watch** automático (Chrome/Edge via File System Access API) e **modo Demo** (sem save).
- **Seletor de 16 idiomas** para os nomes do jogo (heróis, runas, itens): English, Português,
  Español, Français, Deutsch, 日本語, 한국어, 简体中文, 繁體中文, Русский, Polski, Türkçe,
  Українська, Indonesia, ไทย, Tiếng Việt. A interface fica em PT-BR; a escolha persiste no navegador.
- **Motor validado** — o `@tbh/engine` é um port fiel em TypeScript do engine do tbh-copilot,
  coberto por um **oráculo de 103 asserções** (Vitest) rodando contra uma save real.

### Em desenvolvimento (em breve)

Estas três abas aparecem no app marcadas como **"em breve"** e ainda **não** estão ativas:

- **Loja** — planejador de build / compras.
- **Vender** — conselheiro de venda usando **preços do Steam Community Market**.
- **Histórico** — gráficos de evolução.

> O backend de mercado da Steam (rotas `items`, `orderbook`, `price`, portadas do
> giba-steam-market) **já existe no repo e tem testes** — falta só expor nas abas Vender/Loja.
> É isso que vai fechar o ciclo: **otimizador + preços do Steam Market** no mesmo app.

## Como usar

1. **Abra o app:** <https://tbh-companion-web.vercel.app>
2. **Conecte sua save** (botão **"Conectar save"**) e escolha o arquivo:
   - **Windows:** `…\AppData\LocalLow\TesseractStudio\TaskbarHero\SaveFile_Live.es3`
   - Caminho rápido: cole `%USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero` na barra do Explorer.
3. **(Opcional) Live-watch** no Chrome/Edge: o app reage sozinho toda vez que o jogo salva.
4. **Sem o jogo aberto?** Clique em **Demo** pra explorar com uma save de exemplo.
5. Navegue pelas abas **Overview → Farm → Baús → Runas → Gear**. Nada é enviado pra lugar nenhum.

## Screenshots

> _Placeholders — adicionar PNGs reais em `screenshots/` antes do lançamento._

| Overview | Farm | Runas |
|----------|------|-------|
| ![Overview — coach + roster](../../screenshots/overview.png) | ![Farm — melhor stage + projeções](../../screenshots/farm.png) | ![Runas — árvore de 197 nós](../../screenshots/runes.png) |

| Gear | Conectar save |
|------|---------------|
| ![Gear — comparador por slot](../../screenshots/gear.png) | ![Conectar save — local](../../screenshots/connect.png) |

## FAQ

- **Qual o melhor stage pra farmar?** → Abra a aba **Farm**. Ela calibra pela sua taxa real de
  ouro/segundo e mostra o stage ótimo + projeção de ganho por hora.
- **Quais runas comprar primeiro?** → Abra a aba **Runas**. A árvore de 197 nós destaca a runa
  mais barata comprável e o caminho de DPS.
- **Vale trocar / vender esse gear?** → Abra a aba **Gear** pro delta de POWER por slot.
  O conselheiro de venda com preços do Steam Market chega nas abas Vender/Loja (em breve).
- **Vocês veem minha save?** → Não. Roda tudo no seu navegador. Sem upload, sem servidor, sem analytics.
- **É pago?** → Não. Grátis e open-source (MIT).

## Stack

- **Monorepo:** [pnpm](https://pnpm.io) workspaces + [Turborepo](https://turbo.build)
- **App:** [Next.js 16](https://nextjs.org) (App Router) + [React 19](https://react.dev) +
  [TypeScript](https://www.typescriptlang.org) estrito
- **UI:** [Tailwind CSS](https://tailwindcss.com) + componentes shadcn/Base UI
- **Testes:** [Vitest](https://vitest.dev) (oráculo de 103 asserções no `@tbh/engine`)
- **Deploy:** [Vercel](https://vercel.com)

Pacotes:

```
tbh-companion/
├── apps/
│   └── web/          # Next.js (App Router) — UI, save layer client-side, rotas /api do Steam Market
├── packages/
│   ├── engine/       # @tbh/engine — port TS do engine do tbh-copilot (oráculo 103 asserts)
│   └── game-data/    # @tbh/game-data — dados do jogo tipados + lazy loader
└── turbo.json
```

### Rodando localmente

Requer **Node 20** e **pnpm 10+**.

```bash
pnpm install        # instala todas as dependências do workspace
pnpm test           # roda o oráculo de 103 asserções
pnpm typecheck      # typecheck de todos os pacotes
pnpm -F web dev     # sobe o Next.js → http://localhost:3000
```

## Créditos

Este projeto existe porque outras pessoas da comunidade construíram coisas boas primeiro.
Crédito de verdade, com link e licença:

- **[shigake](https://github.com/shigake)** — criador do **[tbh-copilot](https://github.com/shigake/tbh-copilot)**,
  o motor de otimização client-side cujo `engine.js` foi portado fielmente pro `@tbh/engine`. MIT.
- **EuSouOGiba** (**[lezards](https://github.com/lezards)** no GitHub) — criador do
  **[giba-steam-market](https://github.com/lezards/giba-steam-market)**, o backend de mercado da
  Steam portado para as rotas `/api`. MIT. · YouTube: [@eusouogiba](https://youtube.com/@eusouogiba)
  · Site: [eusouogiba.com](https://eusouogiba.com)
- **[taskbarhero.wiki](https://taskbarhero.wiki)** — wiki da comunidade, fonte das fórmulas do
  jogo e das tabelas de stage/gear usadas no engine.

Detalhes completos em [`docs/launch/CREDITS.draft.md`](./CREDITS.draft.md) e na [`LICENSE`](../../LICENSE).

## Contribuindo

PRs são bem-vindos. O básico:

1. `pnpm install` na raiz (monorepo pnpm + Turborepo).
2. `pnpm test` precisa passar (oráculo de 103 asserções do engine).
3. `pnpm typecheck` precisa passar (TypeScript estrito).
4. Abra um PR descrevendo a mudança.

> _TODO de lançamento: adicionar `CONTRIBUTING.md`, templates de issue em `.github/ISSUE_TEMPLATE/`
> e um `CHANGELOG.md`._

## Licença

[MIT](../../LICENSE). Partes derivadas do tbh-copilot e do giba-steam-market, ambos MIT.

## Disclaimer

Projeto de fã **não-oficial**. Sem afiliação, endosso ou conexão oficial com os criadores de
**TBH: Task Bar Hero** (Nugem Studio / TesseractStudio) ou com a Valve. Todos os sprites e assets
em `apps/web/public/game/` pertencem aos seus respectivos donos (TesseractStudio) e são incluídos
apenas para interoperabilidade com o jogo que você já possui. Marcas pertencem aos respectivos donos.
