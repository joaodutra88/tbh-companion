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
