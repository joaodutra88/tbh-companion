# Créditos — TBH Companion

> O TBH Companion é uma **fusão** de trabalho de outras pessoas da comunidade do TBH: Task Bar Hero.
> Esta página dá crédito explícito — quem, o quê, link e licença.

---

## 1. tbh-copilot — o motor de otimização

- **Autor:** **shigake**
- **GitHub:** <https://github.com/shigake> · projeto: <https://github.com/shigake/tbh-copilot>
- **O que veio daqui:** o `engine.js` original (UMD client-side puro, ~836–907 linhas) foi
  **portado fielmente para TypeScript** no pacote `@tbh/engine`. Cobre stats, farm, leveling,
  idle, runas, gear, baús, party, pets, inventory e survival. O port é validado por um **oráculo
  de 103 asserções** (Vitest) rodando contra uma save real.
- **Licença:** MIT. Copyright upstream: `Copyright (c) 2026 shigake`.
- **Observação:** MIT puro, sem cláusula de atribuição especial — ainda assim o creditamos com
  destaque porque é a espinha dorsal do app.

## 2. giba-steam-market — o backend de mercado da Steam

- **Autor / persona:** **EuSouOGiba** (nome de marca) — **`lezards`** é o username no GitHub.
- **GitHub:** <https://github.com/lezards/giba-steam-market>
- **YouTube:** <https://youtube.com/@eusouogiba>
- **Site:** <https://eusouogiba.com>
- **O que veio daqui:** a lógica de consulta ao **Steam Community Market**, portada para as rotas
  de API do app (`apps/web/app/api/items`, `.../orderbook`, `.../price`). É o que vai alimentar as
  abas **Vender** e **Loja** (em desenvolvimento) com preços ao vivo.
- **Licença:** MIT. Copyright upstream **exato**:
  `Copyright (c) 2026 EuSouOGiba (https://eusouogiba.com)`.

## 3. taskbarhero.wiki — os dados da comunidade

- **Fonte:** <https://taskbarhero.wiki>
- **O que veio daqui:** as **fórmulas do jogo** e as **tabelas de stage/gear** que o engine usa.
  O próprio README do tbh-copilot atribui as fórmulas a "formulas recovered from the game binary
  via the community wiki".
- **Licença:** não é software com licença formal — é uma wiki da comunidade. Atribuição **moral**,
  por ser o certo a fazer e por reforçar a transparência sobre a origem dos números.

---

## 4. O jogo e seus assets

- **Jogo:** **TBH: Task Bar Hero** — idle-RPG na Steam (app `3678970`), lançado em 27/05/2026.
- **Estúdio / desenvolvedora:** **Nugem Studio / TesseractStudio** (o save fica em
  `…\AppData\LocalLow\TesseractStudio\TaskbarHero\`).
- **Assets:** os sprites e ícones de heróis, runas, itens e gear em `apps/web/public/game/`
  pertencem à **TesseractStudio** e são incluídos apenas para **interoperabilidade** com o jogo
  que o usuário já possui. Não há afiliação oficial.

## 5. Este projeto

- **TBH Companion** — fusão e camada de UI/produto: [joaodutra88/tbh-companion](https://github.com/joaodutra88/tbh-companion).
- **Licença:** MIT (`docs`/código). Partes derivadas mantêm os créditos MIT acima.

---

## Resumo (lista de créditos para o lançamento)

- **shigake** — tbh-copilot (engine portado para `@tbh/engine`) — MIT — github.com/shigake
- **EuSouOGiba (lezards no GitHub)** — giba-steam-market (backend de mercado Steam) — MIT —
  github.com/lezards · youtube.com/@eusouogiba · eusouogiba.com
- **taskbarhero.wiki** — fórmulas e tabelas do jogo (dados da comunidade) — atribuição moral
- **Nugem Studio / TesseractStudio** — criadores do jogo TBH: Task Bar Hero e donos dos assets
