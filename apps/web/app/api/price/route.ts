import { NextResponse } from "next/server";
import { fetchPrice, RateLimitError, TBH_APPID } from "@/lib/steam";

export const runtime = "nodejs";
export const preferredRegion = "gru1";

export async function GET(req: Request): Promise<Response> {
  const u = new URL(req.url);
  const name = u.searchParams.get("name");
  if (!name) return NextResponse.json({ error: "name obrigatório" }, { status: 400 });
  const appid = Number(u.searchParams.get("appid")) || TBH_APPID;
  try {
    return NextResponse.json(await fetchPrice(appid, name));
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: "rate-limited" }, { status: 429 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "upstream error" }, { status: 502 });
  }
}
