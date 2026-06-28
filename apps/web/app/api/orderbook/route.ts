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
