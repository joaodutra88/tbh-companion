"use client";
import { useState } from "react";
import { connectViaPicker, watchSaveFile, loadDemoText } from "@/lib/save";
import { runRecommend } from "@/lib/engine-bridge";
import type { Recommendation } from "@tbh/engine";

export default function Lab() {
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [err, setErr] = useState<string>("");
  const load = async (text: string) => { try { setErr(""); setRec(await runRecommend(text)); } catch (e) { setErr(String(e)); } };
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>TBH Companion — /lab (prova-de-vida)</h1>
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <button onClick={() => load(loadDemoText())}>Demo</button>
        <button onClick={async () => load(await connectViaPicker())}>Conectar save</button>
        <button onClick={() => watchSaveFile(load).catch((e) => setErr(String(e)))}>Live-watch</button>
      </div>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      {rec && (
        <section>
          <p><b>Party DPS:</b> {Math.round(rec.meta.partyDPS)} · <b>EHP:</b> {Math.round(rec.meta.partyEHP)} · <b>Gold:</b> {rec.meta.gold}</p>
          <p><b>Coach:</b> {rec.coach ? rec.coach.k : "—"}</p>
          <ul>{rec.heroes.map((h) => <li key={h.heroKey}>#{h.heroKey} {h.cls} L{h.level} · POWER {Math.round(h.power)} · DPS {Math.round(h.dps)}</li>)}</ul>
          <details><summary>JSON cru</summary>
            <pre style={{ maxHeight: 400, overflow: "auto", fontSize: 11 }}>{JSON.stringify(rec, null, 2)}</pre>
          </details>
        </section>
      )}
    </main>
  );
}
