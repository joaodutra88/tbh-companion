import { NextResponse } from "next/server";
import { fetchMarketList, TBH_APPID } from "@/lib/steam";

export const runtime = "nodejs";
export const preferredRegion = "gru1";
export const maxDuration = 60;

export async function GET(req: Request): Promise<Response> {
  const u = new URL(req.url);
  const appid = Number(u.searchParams.get("appid")) || TBH_APPID;
  try {
    return NextResponse.json(await fetchMarketList(appid));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "upstream error" }, { status: 502 });
  }
}
