# TBH Companion — Fase 2 (Market Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Adicionar os endpoints genéricos de mercado da Steam (`/api/orderbook`, `/api/price`, `/api/items`) como Route Handlers do Next.js em `apps/web`, com cache de edge compartilhado e valores em BRL.

**Architecture:** Lógica Steam isolada e pura em `apps/web/lib/steam/` (types + parse + client), consumida por 3 Route Handlers finas em `app/api/*`. `parse.ts` é puro (JSON bruto → nossos tipos, unit-test). `client.ts` faz `fetch` com `next.revalidate` (Vercel Data Cache) + trata 429. Rotas validam params e serializam. Save NUNCA participa (só hashes públicos); same-origin (sem CORS).

**Tech Stack:** Next.js App Router (Route Handlers), TypeScript strict, Vitest (fetch mockado).

## Global Constraints
- **Node 20**; **TS strict** + `noUncheckedIndexedAccess`; **zero `any`** no que `lib/steam` exporta.
- **BRL nativo:** `price`/`items` chamam a Steam com `currency=7`; `orderbook` roda na região **`gru1`** (São Paulo) — `export const preferredRegion = 'gru1'`. As 3 rotas: `export const runtime = 'nodejs'`. `items`: `export const maxDuration = 60`.
- **Cache (Vercel Data Cache):** todo fetch upstream usa `{ next: { revalidate: TTL } }` — orderbook **180**, price **300**, items **600** (segundos). Compartilhado entre usuários.
- **Default appid = 3678970** (TBH); aceitar `appid` param.
- **429:** orderbook/price → HTTP 429 `{error:'rate-limited'}`; items → parcial com `partial:true`.
- **Sem Steam ao vivo no CI** — testes mockam `fetch`. Parse testado contra fixtures de payload real.
- **User-Agent** em toda request: `tbh-companion/1.0 (read-only)`.
- Moeda BRL é formato pt-BR (`,` decimal, `.` milhar) — o parser de dinheiro DEVE tratar isso (ex.: `"R$ 1.234,56"` → `123456` centavos).

---

## File Structure
```
apps/web/lib/steam/
├─ types.ts        # OrderbookResult, PriceResult, MarketItem, MarketList, RateLimitError, consts
├─ parse.ts        # parseMoneyToCents, classifyLiquidez, parseOrderbook, parsePrice, parseSearchPage
├─ parse.test.ts   # fixtures de payload real + asserts (puro)
├─ client.ts       # fetchOrderbook, fetchPrice, fetchMarketList
├─ client.test.ts  # fetch mockado: URL/headers, 429, paginação/cap/partial
└─ index.ts        # re-exports
apps/web/app/api/
├─ orderbook/route.ts        + route.test.ts
├─ price/route.ts            + route.test.ts
└─ items/route.ts            + route.test.ts
```

---

### Task 1: `lib/steam` — tipos + parse puro (TDD)

**Files:**
- Create: `apps/web/lib/steam/types.ts`, `apps/web/lib/steam/parse.ts`, `apps/web/lib/steam/parse.test.ts`, `apps/web/lib/steam/index.ts`

**Interfaces:**
- Produces:
  - `class RateLimitError extends Error`
  - `parseMoneyToCents(s: string): number | null` (pt-BR aware)
  - `classifyLiquidez(buyCount: number): 'alta'|'media'|'baixa'|'nenhuma'`
  - `parseOrderbook(hash: string, json: unknown): OrderbookResult`
  - `parsePrice(name: string, json: unknown): PriceResult`
  - `parseSearchPage(json: unknown, appid: number): MarketItem[]`
  - types `OrderbookResult`, `PriceResult`, `MarketItem`, `MarketList`

- [ ] **Step 1: `types.ts`**
```ts
export const TBH_APPID = 3678970;
export const CUR_SYMBOL: Record<number, string> = { 1: "$", 7: "R$" };
export type Liquidez = "alta" | "media" | "baixa" | "nenhuma";

export class RateLimitError extends Error {
  constructor(msg = "rate-limited") { super(msg); this.name = "RateLimitError"; }
}
export interface OrderbookResult {
  hash: string; maxBuyCents: number | null; minSellCents: number | null;
  buyCount: number; sellCount: number; currency: number | null; symbol: string; liquidez: Liquidez;
}
export interface PriceResult {
  name: string; lowestCents: number | null; medianCents: number | null;
  volume: number | null; currency: number; symbol: string;
}
export interface MarketItem {
  name: string; hash: string; priceCents: number | null; listings: number | null;
  type: string; icon: string; url: string;
}
export interface MarketList { appid: number; total: number; partial: boolean; items: MarketItem[]; }
```

- [ ] **Step 2: Write `parse.test.ts` (failing first)** — fixtures de payload real da Steam:
```ts
import { describe, it, expect } from "vitest";
import { parseMoneyToCents, classifyLiquidez, parseOrderbook, parsePrice, parseSearchPage } from "./parse";

describe("parseMoneyToCents (pt-BR)", () => {
  it("parses comma-decimal and dot-thousands", () => {
    expect(parseMoneyToCents("R$ 1,23")).toBe(123);
    expect(parseMoneyToCents("R$ 1.234,56")).toBe(123456);
    expect(parseMoneyToCents("R$ 0,03")).toBe(3);
    expect(parseMoneyToCents("--")).toBeNull();
    expect(parseMoneyToCents("")).toBeNull();
  });
});
describe("classifyLiquidez", () => {
  it("bands by buy-order count", () => {
    expect(classifyLiquidez(0)).toBe("nenhuma");
    expect(classifyLiquidez(10)).toBe("baixa");
    expect(classifyLiquidez(50)).toBe("media");
    expect(classifyLiquidez(501)).toBe("alta");
  });
});
describe("parseOrderbook", () => {
  it("maps the Steam orderbook payload", () => {
    const json = { success: 1, data: { amtMaxBuyOrder: 2372, amtMinSellOrder: 2500, cBuyOrders: 1437, cSellOrders: 8, eCurrency: 7 } };
    const r = parseOrderbook("Diamond", json);
    expect(r).toMatchObject({ hash: "Diamond", maxBuyCents: 2372, minSellCents: 2500, buyCount: 1437, sellCount: 8, currency: 7, symbol: "R$", liquidez: "alta" });
  });
  it("handles empty/failed payload", () => {
    const r = parseOrderbook("X", { success: 0 });
    expect(r.maxBuyCents).toBeNull(); expect(r.buyCount).toBe(0); expect(r.liquidez).toBe("nenhuma");
  });
});
describe("parsePrice", () => {
  it("maps priceoverview to cents (BRL)", () => {
    const json = { success: true, lowest_price: "R$ 1,23", median_price: "R$ 1,10", volume: "45" };
    const r = parsePrice("Amethyst", json);
    expect(r).toMatchObject({ name: "Amethyst", lowestCents: 123, medianCents: 110, volume: 45, currency: 7, symbol: "R$" });
  });
});
describe("parseSearchPage", () => {
  it("maps search/render results to MarketItem[]", () => {
    const json = { success: true, total_count: 347, results: [
      { name: "Sword", hash_name: "Sword (Immortal) A", sell_price: 12300, sell_price_text: "R$ 123,00", sell_listings: 4,
        asset_description: { type: "Weapon", icon_url: "ICON", name_color: "fff" } } ] };
    const items = parseSearchPage(json, 3678970);
    expect(items[0]).toMatchObject({ name: "Sword", hash: "Sword (Immortal) A", priceCents: 12300, listings: 4, type: "Weapon" });
    expect(items[0]!.icon).toContain("ICON");
    expect(items[0]!.url).toContain("3678970");
  });
});
```

- [ ] **Step 3: Run test → FAIL** (`pnpm -F web test parse` → parse fns not defined).

- [ ] **Step 4: Implement `parse.ts`**
```ts
import { CUR_SYMBOL, RateLimitError, type Liquidez, type OrderbookResult, type PriceResult, type MarketItem } from "./types";
export { RateLimitError };

export function parseMoneyToCents(s: string): number | null {
  if (!s) return null;
  const m = String(s).match(/[\d.,]+/);
  if (!m) return null;
  // pt-BR: "." = milhar, "," = decimal → remove pontos, troca vírgula por ponto
  const normalized = m[0].replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
export function classifyLiquidez(buyCount: number): Liquidez {
  if (!buyCount) return "nenhuma";
  if (buyCount > 500) return "alta";
  if (buyCount >= 50) return "media";
  return "baixa";
}
function asObj(x: unknown): Record<string, unknown> { return (x && typeof x === "object") ? x as Record<string, unknown> : {}; }
function num(x: unknown): number | null { return typeof x === "number" && Number.isFinite(x) ? x : null; }

export function parseOrderbook(hash: string, json: unknown): OrderbookResult {
  const j = asObj(json);
  const d = (j.success && j.data) ? asObj(j.data) : {};
  const buyCount = num(d.cBuyOrders) ?? 0;
  const currency = num(d.eCurrency);
  return {
    hash, maxBuyCents: num(d.amtMaxBuyOrder), minSellCents: num(d.amtMinSellOrder),
    buyCount, sellCount: num(d.cSellOrders) ?? 0, currency,
    symbol: (currency != null ? CUR_SYMBOL[currency] : undefined) ?? "R$",
    liquidez: classifyLiquidez(buyCount),
  };
}
export function parsePrice(name: string, json: unknown): PriceResult {
  const j = asObj(json);
  const vol = typeof j.volume === "string" ? parseInt(j.volume.replace(/[^\d]/g, ""), 10) : num(j.volume);
  return {
    name, lowestCents: parseMoneyToCents(String(j.lowest_price ?? "")),
    medianCents: parseMoneyToCents(String(j.median_price ?? "")),
    volume: Number.isFinite(vol as number) ? (vol as number) : null, currency: 7, symbol: "R$",
  };
}
export function parseSearchPage(json: unknown, appid: number): MarketItem[] {
  const j = asObj(json);
  const results = Array.isArray(j.results) ? j.results : [];
  return results.map((r) => {
    const ro = asObj(r); const d = asObj(ro.asset_description);
    const hash = String(ro.hash_name ?? "");
    const icon = d.icon_url ? `https://community.fastly.steamstatic.com/economy/image/${d.icon_url}/96fx96f` : "";
    return {
      name: String(ro.name ?? ""), hash, priceCents: num(ro.sell_price),
      listings: num(ro.sell_listings), type: String(d.type ?? ""), icon,
      url: `https://steamcommunity.com/market/listings/${appid}/${encodeURIComponent(hash)}`,
    };
  });
}
```

- [ ] **Step 5: `index.ts`**
```ts
export * from "./types";
export * from "./parse";
export * from "./client";
```
> Nota: `client` ainda não existe (Task 2). Crie `index.ts` SEM a linha de `client` nesta task; adicione a linha `export * from "./client";` na Task 2. (Evita erro de import.)

- [ ] **Step 6: Run test → PASS** (`pnpm -F web test` → parse suite green).

- [ ] **Step 7: Commit**
```bash
git add apps/web/lib/steam .gitignore
git commit -m "feat(steam): pure parse layer for orderbook/price/search (BRL-aware money parse)"
```

---

### Task 2: `lib/steam/client.ts` — fetch + revalidate + 429 + paginação (TDD)

**Files:**
- Create: `apps/web/lib/steam/client.ts`, `apps/web/lib/steam/client.test.ts`
- Modify: `apps/web/lib/steam/index.ts` (add `export * from "./client";`)

**Interfaces:**
- Consumes: parse.ts, types.ts.
- Produces:
  - `fetchOrderbook(appid: number, hash: string): Promise<OrderbookResult>`
  - `fetchPrice(appid: number, name: string): Promise<PriceResult>`
  - `fetchMarketList(appid: number, opts?: { maxPages?: number; pageDelayMs?: number }): Promise<MarketList>`
  - Throw `RateLimitError` on HTTP 429.

- [ ] **Step 1: Write `client.test.ts` (failing first)** — mock `fetch`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchOrderbook, fetchPrice, fetchMarketList } from "./client";
import { RateLimitError } from "./types";

const okJson = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
afterEach(() => vi.unstubAllGlobals());

describe("fetchOrderbook", () => {
  it("calls orderbook endpoint with referer and parses", async () => {
    const spy = vi.fn(async () => okJson({ success: 1, data: { amtMaxBuyOrder: 100, cBuyOrders: 60, eCurrency: 7 } }));
    vi.stubGlobal("fetch", spy);
    const r = await fetchOrderbook(3678970, "Amethyst");
    expect(r.maxBuyCents).toBe(100); expect(r.liquidez).toBe("media");
    const [url, init] = spy.mock.calls[0]!;
    expect(String(url)).toContain("/market/orderbook?q=Load");
    expect(String(url)).toContain(encodeURIComponent('[3678970,"Amethyst"]'));
    expect((init as any).headers.Referer).toContain("Amethyst");
  });
  it("throws RateLimitError on 429", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) })));
    await expect(fetchOrderbook(3678970, "X")).rejects.toBeInstanceOf(RateLimitError);
  });
});
describe("fetchPrice", () => {
  it("calls priceoverview with currency=7 and parses BRL", async () => {
    const spy = vi.fn(async () => okJson({ success: true, lowest_price: "R$ 2,50", volume: "10" }));
    vi.stubGlobal("fetch", spy);
    const r = await fetchPrice(3678970, "Amethyst");
    expect(r.lowestCents).toBe(250); expect(r.currency).toBe(7);
    expect(String(spy.mock.calls[0]![0])).toContain("currency=7");
  });
});
describe("fetchMarketList", () => {
  it("paginates until empty page and sorts desc", async () => {
    const page = (n: number) => okJson({ success: true, total_count: 3, results: n === 0
      ? [{ name: "A", hash_name: "A", sell_price: 100, asset_description: {} }, { name: "B", hash_name: "B", sell_price: 300, asset_description: {} }]
      : [] });
    const spy = vi.fn(async (url: string) => page(String(url).includes("start=0") ? 0 : 1));
    vi.stubGlobal("fetch", spy);
    const list = await fetchMarketList(3678970, { pageDelayMs: 0 });
    expect(list.items.map(i => i.hash)).toEqual(["B", "A"]); // sorted by priceCents desc
    expect(list.partial).toBe(false);
  });
  it("caps at maxPages and flags partial", async () => {
    const spy = vi.fn(async () => okJson({ success: true, total_count: 999, results: [{ name: "X", hash_name: "X", sell_price: 1, asset_description: {} }] }));
    vi.stubGlobal("fetch", spy);
    const list = await fetchMarketList(3678970, { maxPages: 2, pageDelayMs: 0 });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(list.partial).toBe(true);
  });
  it("returns partial on 429 mid-pagination", async () => {
    let n = 0;
    vi.stubGlobal("fetch", vi.fn(async () => (n++ === 0
      ? okJson({ success: true, total_count: 9, results: [{ name: "A", hash_name: "A", sell_price: 5, asset_description: {} }] })
      : { ok: false, status: 429, json: async () => ({}) })));
    const list = await fetchMarketList(3678970, { pageDelayMs: 0 });
    expect(list.items.length).toBe(1); expect(list.partial).toBe(true);
  });
});
```

- [ ] **Step 2: Run → FAIL** (`pnpm -F web test client`).

- [ ] **Step 3: Implement `client.ts`**
```ts
import { parseOrderbook, parsePrice, parseSearchPage } from "./parse";
import { RateLimitError, type OrderbookResult, type PriceResult, type MarketList, type MarketItem } from "./types";

const UA = "tbh-companion/1.0 (read-only)";
const TTL = { orderbook: 180, price: 300, items: 600 } as const;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function steamJson(url: string, revalidate: number, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json", ...headers }, next: { revalidate } });
  if (res.status === 429) throw new RateLimitError();
  if (!res.ok) throw new Error(`steam HTTP ${res.status}`);
  return res.json();
}

export async function fetchOrderbook(appid: number, hash: string): Promise<OrderbookResult> {
  const qp = encodeURIComponent(JSON.stringify([appid, hash]));
  const url = `https://steamcommunity.com/market/orderbook?q=Load&qp=${qp}`;
  const json = await steamJson(url, TTL.orderbook, { Referer: `https://steamcommunity.com/market/listings/${appid}/${encodeURIComponent(hash)}` });
  return parseOrderbook(hash, json);
}
export async function fetchPrice(appid: number, name: string): Promise<PriceResult> {
  const url = `https://steamcommunity.com/market/priceoverview/?appid=${appid}&currency=7&market_hash_name=${encodeURIComponent(name)}`;
  return parsePrice(name, await steamJson(url, TTL.price));
}
export async function fetchMarketList(appid: number, opts: { maxPages?: number; pageDelayMs?: number } = {}): Promise<MarketList> {
  const maxPages = opts.maxPages ?? 30;
  const pageDelayMs = opts.pageDelayMs ?? 1200;
  const items: MarketItem[] = [];
  let start = 0, total = 0, partial = false, pages = 0;
  while (pages < maxPages) {
    const url = `https://steamcommunity.com/market/search/render/?appid=${appid}&norender=1&count=100&start=${start}&sort_column=price&sort_dir=desc&currency=7`;
    let json: unknown;
    try { json = await steamJson(url, TTL.items); }
    catch (e) { if (e instanceof RateLimitError) { partial = true; break; } throw e; }
    const j = (json && typeof json === "object") ? json as Record<string, unknown> : {};
    total = typeof j.total_count === "number" ? j.total_count : total;
    const pageItems = parseSearchPage(json, appid);
    if (!pageItems.length) break;
    items.push(...pageItems);
    start += pageItems.length; pages += 1;
    if (start < total && pages < maxPages) await sleep(pageDelayMs); else break;
  }
  if (pages >= maxPages && start < total) partial = true;
  items.sort((a, b) => (b.priceCents ?? 0) - (a.priceCents ?? 0));
  return { appid, total: items.length, partial, items };
}
```

- [ ] **Step 4: Add `export * from "./client";` to `index.ts`.**

- [ ] **Step 5: Run → PASS** (`pnpm -F web test` → parse + client green). Then `pnpm -F web typecheck`.

- [ ] **Step 6: Commit**
```bash
git add apps/web/lib/steam
git commit -m "feat(steam): client with Data-Cache revalidate, 429 handling, capped pagination"
```

---

### Task 3: Route Handlers `/api/{orderbook,price,items}` + região/runtime (TDD)

**Files:**
- Create: `apps/web/app/api/orderbook/route.ts` + `route.test.ts`, `apps/web/app/api/price/route.ts` + `route.test.ts`, `apps/web/app/api/items/route.ts` + `route.test.ts`

**Interfaces:**
- Consumes: `@/lib/steam` (`fetchOrderbook`, `fetchPrice`, `fetchMarketList`, `RateLimitError`, `TBH_APPID`).
- Produces: 3 GET Route Handlers returning JSON; status 200 / 400 (param faltando) / 429 (rate-limit) / 502 (upstream falhou).

- [ ] **Step 1: Write the 3 `route.test.ts` (failing first)** — mock the steam client. Exemplo orderbook (replicar análogo p/ price e items):
```ts
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/steam", async (orig) => {
  const real = await orig<typeof import("@/lib/steam")>();
  return { ...real, fetchOrderbook: vi.fn() };
});
import { GET } from "./route";
import * as steam from "@/lib/steam";

const req = (qs: string) => new Request(`http://localhost/api/orderbook${qs}`);
afterEach(() => vi.clearAllMocks());

describe("GET /api/orderbook", () => {
  it("400 when hash missing", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
  });
  it("200 with parsed orderbook", async () => {
    (steam.fetchOrderbook as any).mockResolvedValue({ hash: "Amethyst", maxBuyCents: 2500, buyCount: 2000, liquidez: "alta", symbol: "R$" });
    const res = await GET(req("?hash=Amethyst"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ hash: "Amethyst", maxBuyCents: 2500 });
  });
  it("429 on RateLimitError", async () => {
    (steam.fetchOrderbook as any).mockRejectedValue(new steam.RateLimitError());
    const res = await GET(req("?hash=X"));
    expect(res.status).toBe(429);
  });
  it("502 on other upstream error", async () => {
    (steam.fetchOrderbook as any).mockRejectedValue(new Error("boom"));
    const res = await GET(req("?hash=X"));
    expect(res.status).toBe(502);
  });
});
```
(price test: param `name`; items test: no required param, assert 200 returns the MarketList shape + 429 → for items the route still returns 200 with partial — assert that, since the client swallows 429 into partial; so items route has no 429 path, only 200/502.)

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement the routes.** `orderbook/route.ts`:
```ts
import { NextResponse } from "next/server";
import { fetchOrderbook, RateLimitError, TBH_APPID } from "@/lib/steam";

export const runtime = "nodejs";
export const preferredRegion = "gru1";

export async function GET(req: Request): Promise<Response> {
  const u = new URL(req.url);
  const hash = u.searchParams.get("hash");
  if (!hash) return NextResponse.json({ error: "hash obrigatório" }, { status: 400 });
  const appid = Number(u.searchParams.get("appid")) || TBH_APPID;
  try {
    return NextResponse.json(await fetchOrderbook(appid, hash));
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: "rate-limited" }, { status: 429 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "upstream error" }, { status: 502 });
  }
}
```
`price/route.ts` — same shape, param `name`, `fetchPrice`, `preferredRegion='gru1'`, no maxDuration.
`items/route.ts`:
```ts
import { NextResponse } from "next/server";
import { fetchMarketList, TBH_APPID } from "@/lib/steam";

export const runtime = "nodejs";
export const preferredRegion = "gru1";
export const maxDuration = 60;

export async function GET(req: Request): Promise<Response> {
  const u = new URL(req.url);
  const appid = Number(u.searchParams.get("appid")) || TBH_APPID;
  try {
    return NextResponse.json(await fetchMarketList(appid));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "upstream error" }, { status: 502 });
  }
}
```

- [ ] **Step 4: Run → PASS** (`pnpm -F web test` → all suites green). Then `pnpm -F web typecheck` + `pnpm -F web build` (as 3 rotas aparecem no route list como ƒ/dynamic).

- [ ] **Step 5: Commit**
```bash
git add apps/web/app/api
git commit -m "feat(api): orderbook/price/items Route Handlers (gru1, 400/429/502)"
```

---

## Self-Review (cobertura do spec)
- **D1 endpoints** → Tasks 1-3 (orderbook+price+items). **D2 BRL** → currency=7 (client price/items) + preferredRegion gru1 (routes). **D3 cache** → `next.revalidate` 180/300/600 (client). **D4 429** → client throws / items partial; routes 429/200 (Task 3). **D5 estrutura** → lib/steam puro + rotas finas. **D6 região/runtime** → route consts. **D7 appid** → `Number(appid)||TBH_APPID`. **D8 testes** → parse fixtures + fetch/client mock, sem rede.
- **Critérios:** `pnpm -F web test` (parse+client+rotas), typecheck, build, zero `any` em lib/steam → cobertos. Verificação ao vivo BRL/gru1 = pós-deploy (manual; fora do CI por design).
- **Placeholders:** nenhum; código completo em cada passo.
- **Consistência de tipos:** `fetchOrderbook(appid,hash)`/`fetchPrice(appid,name)`/`fetchMarketList(appid,opts)` definidos na Task 2 e consumidos igual na Task 3; `RateLimitError`/`TBH_APPID` de types.ts (Task 1).

## Notas de verificação pós-deploy (fora do escopo de task; o controller faz após o merge)
Com um hash real de item TBH (ex.: material que vende), na URL de produção:
`/api/price?name=<hash>` → R$; `/api/orderbook?hash=<hash>` → `currency:7` (confirma gru1); `/api/items` → lista R$ desc. Se `gru1` falhar no deploy, cair pra região default + nota (ajuste posterior).
