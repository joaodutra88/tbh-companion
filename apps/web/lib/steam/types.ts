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
