import { parseOrderbook, parsePrice, parseSearchPage } from "./parse";
import { RateLimitError, type OrderbookResult, type PriceResult, type MarketList, type MarketItem } from "./types";

const UA = "tbh-companion/1.0 (read-only)";
const TTL = { orderbook: 180, price: 300, items: 600 } as const;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function steamJson(url: string, revalidate: number, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json", ...headers }, next: { revalidate } } as RequestInit & { next: { revalidate: number } });
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
