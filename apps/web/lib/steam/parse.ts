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
