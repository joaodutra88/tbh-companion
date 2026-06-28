import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/steam", async (orig) => {
  const real = await orig<typeof import("@/lib/steam")>();
  return { ...real, fetchMarketList: vi.fn() };
});
import { GET } from "./route";
import * as steam from "@/lib/steam";

const req = (qs: string) => new Request(`http://localhost/api/items${qs}`);
afterEach(() => vi.clearAllMocks());

describe("GET /api/items", () => {
  it("200 with market list (no required param)", async () => {
    (steam.fetchMarketList as ReturnType<typeof vi.fn>).mockResolvedValue({
      appid: 3678970,
      total: 2,
      partial: false,
      items: [
        { name: "Amethyst", hash: "Amethyst", priceCents: 2500, listings: 50, type: "gem", icon: "", url: "" },
        { name: "Ruby", hash: "Ruby", priceCents: 1800, listings: 30, type: "gem", icon: "", url: "" },
      ],
    });
    const res = await GET(req(""));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ appid: 3678970, total: 2, partial: false });
    expect(body.items).toHaveLength(2);
  });

  it("200 with partial=true when client swallows 429", async () => {
    (steam.fetchMarketList as ReturnType<typeof vi.fn>).mockResolvedValue({
      appid: 3678970,
      total: 1,
      partial: true,
      items: [{ name: "Amethyst", hash: "Amethyst", priceCents: 2500, listings: 50, type: "gem", icon: "", url: "" }],
    });
    const res = await GET(req(""));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ partial: true });
  });

  it("502 on non-429 upstream error", async () => {
    (steam.fetchMarketList as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    const res = await GET(req(""));
    expect(res.status).toBe(502);
  });
});
