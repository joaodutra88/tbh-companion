# TBH Companion — Fase 2: Backend de Mercado (Design Spec)

- **Data:** 2026-06-27
- **Status:** Aprovado (usuário autorizou build com defaults recomendados) → pronto para writing-plans
- **Projeto:** `tbh-companion` (Fase 2 de 6)
- **Depende de:** Fase 1 (fundação) — concluída, na `main`, deployada.

> Prosa PT-BR; código/identificadores em inglês.

---

## 1. Objetivo

Construir a **camada de backend de mercado**: os endpoints genéricos que fazem proxy do Steam Community Market, como **Route Handlers do Next.js** (em `apps/web/app/api/*`), com **cache de edge compartilhado** e **valores em BRL**. É a peça que traz a "mágica do giba" (preço de venda na hora + demanda) pro mundo web, sem backend dedicado.

**Realização-chave:** o `server.mjs` do giba fazia (a) proxy de mercado e (b) leitura de save no servidor. No nosso modelo **web-only com save client-side**, (b) **não existe** — o browser já tem o save decriptado. Então esta fase entrega **só os endpoints genéricos, independentes de save**. As features de baú (sell advisor, valor do baú, Varredura Fiel) são **lógica client-side da Fase 5**, que consome estes endpoints item a item.

**Não-objetivos:** qualquer leitura de save/baú (Fase 5, client-side); UI de mercado (Fases 3-5); o sell advisor em si.

---

## 2. Decisões (defaults recomendados, aprovados em bloco)

| # | Decisão | Escolha |
|---|---|---|
| D1 | Endpoints | **3**: `/api/orderbook`, `/api/price`, `/api/items` |
| D2 | Moeda | **BRL nativo** — `price`/`items` via `currency=7`; `orderbook` via região **gru1** (São Paulo) onde o IP BR faz a Steam devolver R$ |
| D3 | Cache | **Vercel Data Cache** via `fetch(url, { next: { revalidate } })` — compartilhado entre todos os usuários (Steam é consultada ~1×/item/TTL pra comunidade inteira). TTLs: orderbook 180s, price 300s, items 600s |
| D4 | Rate-limit (429) | orderbook/price → HTTP 429 `{error:'rate-limited'}`; items → retorna o que já coletou com `partial:true`. O cache compartilhado torna 429 raro |
| D5 | Estrutura | lógica Steam isolada e testável em `apps/web/lib/steam/`; rotas finas em `app/api/<x>/route.ts` |
| D6 | Região/runtime | `export const preferredRegion = 'gru1'` + `runtime = 'nodejs'` nas 3 rotas; `items` com `maxDuration = 60` |
| D7 | Multi-jogo | default appid = **3678970** (TBH); aceita `appid` param (mercado genérico, igual giba) |
| D8 | Testes | Vitest com `fetch` mockado (fixtures de payloads reais da Steam). **Sem Steam ao vivo no CI** |

---

## 3. Arquitetura

```
apps/web/
├─ lib/steam/
│  ├─ types.ts        # OrderbookResult, PriceResult, MarketItem, MarketList, Currency
│  ├─ parse.ts        # funções PURAS: payload bruto da Steam → nossos tipos (unit-test)
│  ├─ client.ts       # fetchOrderbook / fetchPrice / fetchMarketList (fetch + revalidate + 429)
│  └─ index.ts
└─ app/api/
   ├─ orderbook/route.ts   # GET ?appid&hash → OrderbookResult   (preferredRegion gru1)
   ├─ price/route.ts       # GET ?appid&name → PriceResult        (currency=7)
   └─ items/route.ts       # GET ?appid → MarketList               (currency=7, paginado)
```

**Separação:** `parse.ts` é lógica pura (entrada = JSON bruto da Steam, saída = nosso tipo) → testável sem rede. `client.ts` faz o `fetch` (com `revalidate` + tratamento de 429) e delega o parse. As rotas só validam query params, chamam o client e serializam a resposta.

### 3.1 Endpoints (portados do `server.mjs` do giba)

**`/api/orderbook?appid=<n>&hash=<market_hash_name>`**
- Upstream: `https://steamcommunity.com/market/orderbook?q=Load&qp=[<appid>,"<hash>"]` com header `Referer: …/market/listings/<appid>/<hash>` e `User-Agent`.
- Resposta: `{ hash, maxBuyCents, minSellCents, buyCount, sellCount, currency, symbol, liquidez }`
  - `maxBuyCents` = `data.amtMaxBuyOrder` (venda na hora), `minSellCents` = `data.amtMinSellOrder`, `buyCount` = `data.cBuyOrders`, `sellCount` = `data.cSellOrders`, `currency` = `data.eCurrency` (7=BRL), `symbol` = `R$`.
  - `liquidez`: `buyCount>500 → 'alta'`, `>=50 → 'media'`, `>0 → 'baixa'`, senão `'nenhuma'`.
- `revalidate: 180`. Região `gru1` (→ eCurrency 7).

**`/api/price?appid=<n>&name=<market_hash_name>`**
- Upstream: `https://steamcommunity.com/market/priceoverview/?appid=<n>&currency=7&market_hash_name=<name>`.
- Resposta: `{ name, lowestCents, medianCents, volume, currency: 7, symbol: 'R$' }` (parse de `"R$ 1,23"` → centavos).
- `revalidate: 300`.

**`/api/items?appid=<n>`**
- Upstream: `https://steamcommunity.com/market/search/render/?appid=<n>&norender=1&count=100&start=<k>&sort_column=price&sort_dir=desc&currency=7`, **paginado** (a Steam serve ~10/página anônimo).
- Resposta: `{ appid, total, partial, items: [{ name, hash, priceCents, listings, type, icon, url }] }`, ordenado por `priceCents` desc.
- **Limite de segurança:** no máx **30 páginas** (~300 itens), delay ~1200ms entre páginas, `maxDuration=60`. Se truncar, `partial:true` (sem corte silencioso). Cada página com `revalidate: 600` (Data Cache compartilhado).

### 3.2 Fluxo de dados (Fase 2)
```
browser (futuro: Fase 3-5)  →  GET /api/orderbook?hash=…   (same-origin)
   → route valida params → client.fetchOrderbook (fetch c/ revalidate 180 → Data Cache)
   → parse.parseOrderbook(payload) → OrderbookResult (BRL)
   → JSON pro browser
```
O save **nunca** participa — só nomes/hashes de itens (públicos). Same-origin ⇒ sem CORS.

---

## 4. Tratamento de erros
- Steam 429 → `RateLimitError` tipado. orderbook/price respondem **HTTP 429** `{error:'rate-limited'}`. items retorna parcial (`partial:true`) com o que coletou antes do 429.
- Steam !ok / shape inesperado → parse defensivo (campos faltando → `null`); rota responde 502 `{error}` quando o upstream falha completamente.
- Param faltando (`hash`/`name`) → 400 `{error}`.

## 5. Testes (Vitest, `apps/web`)
- **`parse.test.ts`** (puro): fixtures de payloads reais da Steam (orderbook `{success,data:{amtMaxBuyOrder,…}}`, priceoverview `{lowest_price,median_price,volume}`, search/render `{total_count,results:[…]}`) → asserta o mapeamento pros nossos tipos, incl. parse de moeda e classificação de liquidez.
- **rotas** (`*.route.test.ts`): `vi.stubGlobal('fetch', …)` mockando o upstream → asserta resposta OK, 429 (rate-limit), 400 (param faltando), e (items) parcial.
- **Sem rede real no CI.** Verificação ao vivo é pós-deploy (manual/script).

## 6. Critérios de sucesso (verificáveis)
- [ ] `pnpm -F web test` verde, incl. parse + rotas (parse contra fixtures reais; rotas com fetch mockado).
- [ ] `pnpm typecheck` + `pnpm -F web build` + CI verdes; zero `any` no que é exportado de `lib/steam`.
- [ ] Pós-deploy na Vercel: `GET /api/price?name=<hash real TBH>` devolve R$; `GET /api/orderbook?hash=<hash real>` devolve R$ (eCurrency 7, confirmando gru1); `GET /api/items` devolve lista ordenada em R$.
- [ ] Auto-deploy no push continua verde.

## 7. Riscos & mitigação
| Risco | Mitigação |
|---|---|
| `gru1` indisponível no plano Hobby | Se o deploy reclamar da região, cair pra região default + nota de conversão USD→BRL no orderbook (ajuste posterior — "depois a gente ajeita") |
| items-list estoura timeout do serverless | Cap de 30 páginas + `maxDuration=60` + `partial:true`; Data Cache faz o fetch completo acontecer ~1×/10min pra comunidade |
| 429 da Steam | Data Cache compartilhado (1 fetch/item/TTL p/ todos) + 429 gracioso/parcial |
| Shape dos endpoints da Steam mudar | parse defensivo (campos ausentes → null), fixtures versionadas |

## 8. Próximas fases (contexto)
3 UI core · 4 Otimização (abas) · **5 Mercado client-side** (sell advisor + valor do baú + Varredura Fiel — consome estes endpoints) · 6 Polimento.
