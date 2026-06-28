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
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }];
    expect(String(url)).toContain("/market/orderbook?q=Load");
    expect(String(url)).toContain(encodeURIComponent('[3678970,"Amethyst"]'));
    expect(init.headers.Referer).toContain("Amethyst");
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
    expect(String((spy.mock.calls[0] as unknown as [string])[0])).toContain("currency=7");
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
  it("stops after first page and flags partial when budgetMs is exhausted", async () => {
    const spy = vi.fn(async () => okJson({ success: true, total_count: 999, results: [{ name: "X", hash_name: "X", sell_price: 1, asset_description: {} }] }));
    vi.stubGlobal("fetch", spy);
    const list = await fetchMarketList(3678970, { budgetMs: 0, pageDelayMs: 0 });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(list.items.length).toBe(1);
    expect(list.partial).toBe(true);
  });
});
