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
    (steam.fetchOrderbook as ReturnType<typeof vi.fn>).mockResolvedValue({
      hash: "Amethyst",
      maxBuyCents: 2500,
      minSellCents: 3000,
      buyCount: 2000,
      sellCount: 500,
      currency: 7,
      symbol: "R$",
      liquidez: "alta",
    });
    const res = await GET(req("?hash=Amethyst"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ hash: "Amethyst", maxBuyCents: 2500 });
  });

  it("429 on RateLimitError", async () => {
    (steam.fetchOrderbook as ReturnType<typeof vi.fn>).mockRejectedValue(new steam.RateLimitError());
    const res = await GET(req("?hash=X"));
    expect(res.status).toBe(429);
  });

  it("502 on other upstream error", async () => {
    (steam.fetchOrderbook as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    const res = await GET(req("?hash=X"));
    expect(res.status).toBe(502);
  });
});
