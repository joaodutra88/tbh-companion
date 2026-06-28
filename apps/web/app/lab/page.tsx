"use client";
import { useRecommendation } from "@/lib/recommendation-context";

export default function Lab() {
  const { status, rec, error, connect, demo, watch, disconnect } =
    useRecommendation();

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>TBH Companion — /lab (prova-de-vida)</h1>
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <button onClick={() => void demo()}>Demo</button>
        <button onClick={() => void connect()}>Conectar save</button>
        <button onClick={() => void watch()}>Live-watch</button>
        {status !== "idle" && (
          <button onClick={disconnect}>Desconectar</button>
        )}
      </div>
      {status === "loading" && <p>Carregando...</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {rec && (
        <section>
          <p>
            <b>Party DPS:</b> {Math.round(rec.meta.partyDPS)} ·{" "}
            <b>EHP:</b> {Math.round(rec.meta.partyEHP)} ·{" "}
            <b>Gold:</b> {rec.meta.gold}
          </p>
          <p>
            <b>Coach:</b> {rec.coach ? rec.coach.k : "—"}
          </p>
          <ul>
            {rec.heroes.map((h) => (
              <li key={h.heroKey}>
                #{h.heroKey} {h.cls} L{h.level} · POWER {Math.round(h.power)}{" "}
                · DPS {Math.round(h.dps)}
              </li>
            ))}
          </ul>
          <details>
            <summary>JSON cru</summary>
            <pre style={{ maxHeight: 400, overflow: "auto", fontSize: 11 }}>
              {JSON.stringify(rec, null, 2)}
            </pre>
          </details>
        </section>
      )}
    </main>
  );
}
