import { localized } from "@/lib/format";

// ── Dedupe helper ─────────────────────────────────────────────────────────────
// When multiple rune nodes share the same (localized name + st), keep the first
// (cheapest/best-ranked, since lists are pre-sorted) and track the count.
// This is display-only — the engine is not touched.

interface WithCount {
  count: number;
}

export function dedupeByNameAndSt<
  T extends { name: unknown; st?: string | null },
>(list: T[]): (T & WithCount)[] {
  const seen = new Map<string, number>(); // dedupKey → index in result
  const result: (T & WithCount)[] = [];
  for (const item of list) {
    const key = `${localized(item.name)}|${item.st ?? ""}`;
    const idx = seen.get(key);
    if (idx !== undefined) {
      result[idx]!.count++;
    } else {
      seen.set(key, result.length);
      result.push({ ...item, count: 1 });
    }
  }
  return result;
}
