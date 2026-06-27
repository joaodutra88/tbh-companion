# TBH Companion — Fase 1: Fundação (Design Spec)

- **Data:** 2026-06-26
- **Status:** Aprovado (brainstorming) → pronto para writing-plans
- **Projeto:** `tbh-companion` (monorepo novo)
- **Fase:** 1 de 6 (Fundação). Roadmap completo no fim do documento.

> Prosa em PT-BR; identificadores, arquivos e termos técnicos em inglês. O público-alvo
> (comunidade TBH) é majoritariamente BR, igual ao upstream `giba-steam-market`.

---

## 1. Contexto

`tbh-companion` funde dois projetos de fã do idle-RPG **TBH: Task Bar Hero**:

- **tbh-copilot** (shigake) — otimizador completo 100% client-side: engine de funções puras
  (`engine/engine.js`) que calcula DPS/EHP/POWER, farm optimizer calibrado, árvore de runas,
  gear, idle/offline, chests, party, etc. Sem backend, sem build, PWA, 16 idiomas.
- **giba-steam-market** (lezards) — scanner de Steam Market com backend Node local: consulta o
  **orderbook real** de cada item do baú (preço de venda na hora + nº de compradores), algo que
  o browser não faz puro por causa de CORS. Inclui leitura de save no servidor e launcher `.bat`.

O objetivo do produto combinado é "o melhor dos dois mundos": o **cérebro do Co-pilot** + as
**adições de mercado do giba**, entregue como **app web hospedado (sem instalar)**.

Decisão de produto (já tomada no brainstorming):

- **Objetivo:** lançar pra comunidade, **web-only, sem instalável**.
- **Privacidade (trava dura):** o save **nunca sai do browser**. É lido e decriptado client-side.
- **Mercado:** as features de orderbook precisam de backend → será um **proxy fininho com cache
  compartilhado** em Route Handlers da Vercel (Fase 2). Como preço de item é global, o cache de
  edge serve a comunidade inteira e a Steam é consultada ~1×/item/TTL — escala melhor que o giba
  original (que consulta por usuário).

Este documento especifica **apenas a Fase 1 (Fundação)**. As demais fases têm specs próprios.

---

## 2. Objetivo da Fase 1

Montar a espinha dorsal do projeto, de forma verificável:

1. Monorepo (pnpm + Turborepo + TypeScript strict) com `apps/web`, `packages/engine`,
   `packages/game-data`.
2. **Port fiel** do `engine.js` → TypeScript, com os **83 testes do oráculo verdes** (Vitest).
3. **Camada de save** completa no browser (decrypt + picker + live-watch + demo).
4. Página **prova-de-vida** (`/lab`) que conecta o save, roda `recommend()` e mostra os números.
5. **CI** (GitHub Actions rodando Vitest) + **deploy na Vercel** da prova-de-vida.

**Não-objetivos da Fase 1:** proxy da Steam (F2), UI estilizada/abas (F3-4), features de mercado
(F5), i18n/PWA/charts/notificações/port dos geradores de dados (F6).

---

## 3. Decisões (com justificativa)

| # | Decisão | Escolha | Por quê |
|---|---|---|---|
| D1 | Identidade/repo | `tbh-companion`, repo novo, **GitHub público**, Vercel git-deploy | Limpo, sem herdar histórico/nome dos forks; build in public alinha com o objetivo de comunidade |
| D2 | Licença/atribuição | **MIT** + créditos a shigake e lezards + disclaimer "fan project não-oficial" | Ambos upstreams são MIT (exigem preservar copyright); é o correto e respeitoso |
| D3 | Ferramental | **pnpm + Turborepo + TS strict** | pnpm é o recomendado pela Vercel; Turborepo é Vercel-native (cache) e parte do stack moderno a aprender |
| D4 | Next.js | **App Router, client-first** | Save e engine são client-side; SSR não se aplica ao app. Server components só pra exibir tabelas estáticas |
| D5 | Engine + DB | **Engine no browser + DB code-split** | Privacidade (save não sai) força o engine client-side; o engine precisa do `GameDB`, então o blob grande entra por dynamic import |
| D6 | Port do engine | **Port fiel + 83 testes como oráculo**, depois split em módulos | Risco mínimo de alterar o modelo do jogo; os testes garantem comportamento 1:1 |
| D7 | Dados do jogo | **Vendar blobs gerados + tipar (`GameDB`)**; geradores ficam pra F6 | Os dados já gerados servem; portar Python+UnityPy/cjs agora é escopo desnecessário |
| D8 | Save (Fase 1) | **Completo: picker + File System Access (live-watch) + demo** | Camada de save fica "pronta"; demo deixa o deploy funcionar sem save real |
| D9 | Prova-de-vida | **Funcional: números-chave + viewer de JSON** | Prova a cadeia inteira (save→engine→resultado) com dados reais, sem investir em UI ainda |
| D10 | CI/Deploy | **GH Actions (Vitest) + deploy Vercel da `/lab`** | De-risca o pipeline da Vercel cedo; URL viva pra mostrar; testes guardam o port |
| D11 | Styling | **Tailwind + shadcn/ui** (instala na F1, usa na F3) | Default moderno do ecossistema Vercel, ótimo aprendizado |

---

## 4. Arquitetura

### 4.1 Layout do monorepo

```
tbh-companion/
├─ apps/
│  └─ web/                      # Next.js (App Router), client-first
│     ├─ app/
│     │  ├─ page.tsx            # landing estática (prerender)
│     │  └─ lab/page.tsx        # prova-de-vida (client component)
│     ├─ lib/
│     │  └─ save/               # camada de save (decrypt, picker, live-watch, demo)
│     ├─ components/            # (shadcn/ui entra aqui a partir da F3)
│     └─ ...                    # tailwind config, etc.
├─ packages/
│  ├─ engine/
│  │  ├─ src/
│  │  │  ├─ types.ts            # PlayerSaveData, GameDB, Recommendation, ...
│  │  │  ├─ stats.ts            # collect/aggregate, dps/ehp/power, mitigação
│  │  │  ├─ farm.ts             # bestFarm, calibração, fitClearModel, projectLevel
│  │  │  ├─ runes.ts            # runePlan, runeTreeStatus, runeROI, pathTo
│  │  │  ├─ gear.ts             # gearAdvisor, powerDelta, enchantAdvisor, apAdvisor
│  │  │  ├─ idle.ts             # idleInfo, offlineBonuses, bestParkStage
│  │  │  ├─ chests.ts           # chestInfo, chestPlan
│  │  │  ├─ drops.ts            # dropBands, dropStages, favFarm
│  │  │  ├─ inventory.ts        # inventory, storageGrid
│  │  │  ├─ recommend.ts        # recommend() + buildActions() (orquestrador)
│  │  │  └─ index.ts            # API pública re-exportada
│  │  └─ test/
│  │     ├─ engine.test.ts      # os 83 asserts portados
│  │     └─ fixtures/save_fixture.json   # save real decriptado (reaproveitado do Co-pilot)
│  └─ game-data/
│     ├─ src/
│     │  ├─ index.ts            # loadGameDB(): typed GameDB (dynamic import do blob grande)
│     │  ├─ gamedata.json       # blob principal (code-split via import())
│     │  └─ gearnames / itemnames / materialfx / demo / stages / runeTree
│     │                         # tipo GameDB é definido no engine (dono do contrato);
│     │                         # game-data importa GameDB do engine pra tipar seu export
│     └─ scripts/               # geradores Python/cjs vendorizados (porta só na F6)
├─ .github/workflows/ci.yml     # Vitest no push (Node 20)
├─ turbo.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ LICENSE                      # MIT + notas de atribuição
└─ README.md                    # o que é, créditos, status
```

### 4.2 Componentes

**`packages/engine`** — porta fiel do `engine.js`. Funções puras, sem framework, sem DOM.
- Ajuste estrutural único (preserva comportamento): hoje o engine pega o DB via closure global
  (`const DB = g.TBH_DB || require('./gamedata.js')`). No port, o DB vira **dependência explícita**:
  `recommend(save, db, opts)`. Mais testável e desacoplado; os 83 testes continuam o oráculo.
- Tipos: `PlayerSaveData` (estrutura do save) e `GameDB` (estrutura dos dados do jogo). Sem `any`
  na API pública.
- Split em módulos por domínio (ver 4.1). `index.ts` re-exporta a API pública (`recommend`,
  `heroStats`, `bestFarm`, `runePlan`, `gearAdvisor`, etc.).

**`packages/game-data`** — dados já gerados, vendorizados e tipados como `GameDB`.
- `loadGameDB()` faz `import()` dinâmico do `gamedata.json` (code-split → não pesa o load inicial).
- Inclui `demo` (save de exemplo, reaproveitado do `demo.js`) e tabelas auxiliares
  (gearnames/itemnames/materialfx/stages/runeTree).
- `scripts/` guarda os geradores originais (Python+UnityPy / cjs), **não portados na F1**.

**`apps/web/lib/save`** — camada de save client-side (TS).
- `decrypt(buf)`: `iv = bytes[0..16]`, `ct = bytes[16..]`, `PBKDF2(salt=iv, 100 iters, SHA-1)` →
  `AES-CBC-128` → decrypt. Chave embutida: `emuMqG3bLYJ938ZDCfieWJ` (chave ES3 pública do jogo).
- `parseSave(raw)`: protege big-ints (coloca aspas em números de 16+ dígitos antes do `JSON.parse`).
- Três modos: **file picker** (`<input type=file>` / `showOpenFilePicker`), **File System Access
  live-watch** (Chrome/Edge: re-lê quando o arquivo muda), **demo** (usa o save do `game-data`).
- O save **nunca** é enviado a lugar nenhum — só vive na memória do browser.

**`apps/web/app/lab/page.tsx`** — prova-de-vida.
- Botões: "Conectar save (picker)", "Live-watch", "Demo".
- Ao ter um save: roda `recommend(save, await loadGameDB())` e renderiza:
  POWER/DPS da party, ação do coach (`recommend().coach`), roster básico dos heróis (nome, level,
  POWER, DPS), e um **viewer de JSON cru colápsavel** do resultado completo.

### 4.3 Fluxo de dados

```
[.es3 escolhido | arquivo observado | demo]
   → save.decrypt(buf)            (browser, Web Crypto)         apps/web/lib/save
   → save.parseSave(text)         (big-int safe)
   → PlayerSaveData
   → recommend(save, gameDB)      (engine TS, browser; gameDB code-split)   packages/engine
   → Recommendation { meta, heroes, farm, runes, ..., actions, coach }
   → /lab: números-chave + viewer JSON                          apps/web/app/lab
```

---

## 5. Testes & qualidade

- **Vitest** em `packages/engine/test/engine.test.ts`: porta os **83 asserts** do `test.cjs`,
  rodando contra a `save_fixture.json` real + o `GameDB` vendorizado. Verde = comportamento 1:1.
- **TS strict** em todo o monorepo; **zero `any`** na API pública do engine.
- **GitHub Actions** (`ci.yml`): `pnpm install` + `pnpm test` em todo push/PR (Node 20).
- **Vercel**: deploy automático da `apps/web`; a `/lab` valida build + code-split do `GameDB` em
  hosting real.

---

## 6. Critérios de sucesso (verificáveis)

- [ ] `pnpm test` → **83/83 verdes** no Vitest.
- [ ] `/lab` deployada na Vercel:
  - [ ] **demo** mostra POWER/DPS/coach com números reais;
  - [ ] **picker** decripta um `.es3` real e calcula;
  - [ ] **live-watch** atualiza ao alterar o save (Chrome/Edge).
- [ ] **CI verde** no push.
- [ ] **TS strict**, sem `any` na API pública do engine.
- [ ] `README` com créditos (shigake, lezards) + disclaimer; `LICENSE` MIT.

---

## 7. Riscos & mitigação

| Risco | Mitigação |
|---|---|
| Port do engine altera comportamento sutil do modelo do jogo | Os 83 testes são o oráculo; portar com eles rodando o tempo todo. Nenhum merge sem verde |
| Blob `gamedata` (1.9MB) pesa o load | `import()` dinâmico (code-split); só carrega quando o save é conectado |
| File System Access não existe em todo browser | Fallback automático pro file picker; live-watch só onde a API existe (Chrome/Edge) |
| Node 20 vs ferramentas que pedem 22 | Fixar Node 20 LTS no CI e no `engines`; validar Next/Turbo nessa versão cedo |
| Tipar `GameDB`/`PlayerSaveData` é grande | Tipar incrementalmente partindo das formas usadas pelo engine; `unknown`+narrow onde a forma é incerta, nunca `any` |

---

## 8. Roadmap completo (contexto — fases 2-6 têm specs próprios)

| Fase | Entrega |
|---|---|
| **1 — Fundação** *(este spec)* | Monorepo + engine TS (83 testes) + save + prova-de-vida + CI/deploy |
| 2 — Backend de mercado | Route Handlers (proxy Steam: items/priceoverview/orderbook) + cache de edge |
| 3 — UI core | Shell + tema (Tailwind/shadcn) + Overview/coach + party roster |
| 4 — Otimização | Farm optimizer, runas (197 nós), gear, idle, chests |
| 5 — Mercado | Sell advisor com orderbook real, valor do baú, Varredura Fiel, conferir abas |
| 6 — Polimento | i18n (16 idiomas), PWA, History/charts, notificações, port dos geradores, deploy final |

---

## 9. Referências técnicas (do código-fonte estudado)

- Decriptação (Co-pilot `dashboard.html`): `PASSWORD='emuMqG3bLYJ938ZDCfieWJ'`; PBKDF2-SHA1
  (salt=iv, 100 iterações) → AES-CBC-128. `iv` = primeiros 16 bytes do arquivo.
- API do engine (`engine.js` → `recommend(psd, opts)`): retorna `{ meta, heroes, farm, level, idle,
  runes, runeTree, gear, survival, partyComp, enchant, ap, pets, alchemy, gearProgression, runeROI,
  goldPlan, goal, synthesis, xpForecast, forecast, actions, coach, params }`.
- Oráculo: `engine/test.cjs` (83 asserts) + `engine/fixtures/save_fixture.json`.
- Proxy de mercado (giba `server.mjs`, para a Fase 2): endpoints públicos `market/search/render`,
  `market/priceoverview`, `market/orderbook?q=Load&qp=[appid,"hash"]`; throttle + cache em disco.
</content>
</invoke>
