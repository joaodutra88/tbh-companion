import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/steam", async (orig) => {
  const real = await orig<typeof import("@/lib/steam")>();
  return { ...real, fetchPrice: vi.fn() };
});
import { GET } from "./route";
import * as steam from "@/lib/steam";

const req = (qs: string) => new Request(`http://localhost/api/price${qs}`);
afterEach(() => vi.clearAllMocks());

describe("GET /api/price", () => {
  it("400 when name missing", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
  });

  it("200 with parsed price", async () => {
    (steam.fetchPrice as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: "Amethyst",
      lowestCents: 250,
      medianCents: 300,
      volume: 10,
      currency: 7,
      symbol: "R$",
    });
    const res = await GET(req("?name=Amethyst"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: "Amethyst", lowestCents: 250, currency: 7 });
  });

  it("429 on RateLimitError", async () => {
    (steam.fetchPrice as ReturnType<typeof vi.fn>).mockRejectedValue(new steam.RateLimitError());
    const res = await GET(req("?name=X"));
    expect(res.status).toBe(429);
  });

  it("502 on other upstream error", async () => {
    (steam.fetchPrice as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    const res = await GET(req("?name=X"));
    expect(res.status).toBe(502);
  });
});
