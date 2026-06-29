"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Recommendation, GameDB, RecommendOpts, PlayerSaveData } from "@tbh/engine";
import { parseSave } from "@tbh/engine";
import { loadGameDB } from "@tbh/game-data";
import { connectViaPicker, watchSaveFile, loadDemoText } from "@/lib/save";
import { runRecommend, measureSave } from "@/lib/engine-bridge";

// ── State shape ───────────────────────────────────────────────────────────────

export interface RecommendationState {
  status: "idle" | "loading" | "ready" | "error";
  source: "demo" | "file" | "live" | null;
  rec: Recommendation | null;
  error: string | null;
  /** Game DB — loaded alongside rec; needed by Task 3 components for hero name/icon. */
  db: GameDB | null;
  /** Parsed player save data — exposed for the slot comparator (Task 3). */
  psd: PlayerSaveData | null;
  connect(): Promise<void>;
  watch(): Promise<void>;
  demo(): Promise<void>;
  disconnect(): void;
  /** Re-runs recommend() with new opts (e.g. clearSamples) using the last save text. */
  recalibrate(opts: RecommendOpts): Promise<void>;
}

// ── Internal data-only state ──────────────────────────────────────────────────

interface DataState {
  status: "idle" | "loading" | "ready" | "error";
  source: "demo" | "file" | "live" | null;
  rec: Recommendation | null;
  error: string | null;
  db: GameDB | null;
  psd: PlayerSaveData | null;
}

const IDLE: DataState = {
  status: "idle",
  source: null,
  rec: null,
  error: null,
  db: null,
  psd: null,
};

// ── Context ───────────────────────────────────────────────────────────────────

const RecommendationContext = createContext<RecommendationState | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function RecommendationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>(IDLE);
  const stopRef = useRef<(() => void) | null>(null);
  /** Last save text — used by recalibrate() to re-run recommend without re-loading. */
  const saveTextRef = useRef<string | null>(null);
  /** Last calibration opts — reused by live-watch ticks so calibration is not lost on save. */
  const optsRef = useRef<RecommendOpts | null>(null);
  /** Last live-watch snapshot for auto-calibration delta measurement. */
  const prevSnapshotRef = useRef<{
    gold: number;
    partyExp: number;
    stageKey: number | string;
    atMs: number;
  } | null>(null);
  /** Auto-calibrated opts derived from save deltas — overridden by manual optsRef. */
  const autoOptsRef = useRef<RecommendOpts>({});

  const demo = useCallback(async (): Promise<void> => {
    if (stopRef.current) { stopRef.current(); stopRef.current = null; }
    optsRef.current = null;
    prevSnapshotRef.current = null;
    autoOptsRef.current = {};
    setState({ ...IDLE, status: "loading" });
    try {
      const text = loadDemoText();
      saveTextRef.current = text;
      let psd: PlayerSaveData | null = null;
      try { psd = parseSave(text); } catch { /* invalid JSON in test env */ }
      const rec = await runRecommend(text);
      const db = await loadGameDB();
      setState({ status: "ready", source: "demo", rec, db, psd, error: null });
    } catch {
      setState({
        ...IDLE,
        status: "error",
        error: "Não consegui carregar o demo — tente recarregar a página.",
      });
    }
  }, []);

  const connect = useCallback(async (): Promise<void> => {
    if (stopRef.current) { stopRef.current(); stopRef.current = null; }
    optsRef.current = null;
    prevSnapshotRef.current = null;
    autoOptsRef.current = {};
    setState({ ...IDLE, status: "loading" });
    try {
      const text = await connectViaPicker();
      saveTextRef.current = text;
      let psd: PlayerSaveData | null = null;
      try { psd = parseSave(text); } catch { /* corrupt save */ }
      const rec = await runRecommend(text);
      const db = await loadGameDB();
      setState({ status: "ready", source: "file", rec, db, psd, error: null });
    } catch (e) {
      // Picker cancelado → volta silenciosamente ao idle
      if (
        e instanceof Error &&
        (e.name === "AbortError" || e.message === "sem arquivo")
      ) {
        setState(IDLE);
        return;
      }
      setState({
        ...IDLE,
        status: "error",
        error: `Não consegui ler o save — ${e instanceof Error ? e.message : "erro desconhecido"}.`,
      });
    }
  }, []);

  const watch = useCallback(async (): Promise<void> => {
    if (stopRef.current) { stopRef.current(); stopRef.current = null; }
    optsRef.current = null;
    prevSnapshotRef.current = null;
    autoOptsRef.current = {};
    setState({ ...IDLE, status: "loading" });
    try {
      const stopHandle = await watchSaveFile(async (text) => {
        saveTextRef.current = text;
        try {
          const m = await measureSave(text);
          const now = Date.now();
          const snap = prevSnapshotRef.current;
          if (snap !== null && snap.stageKey === m.stageKey) {
            const dt = (now - snap.atMs) / 1000;
            if (dt >= 3 && dt <= 1800) {
              const dExp = m.partyExp - snap.partyExp;
              const dGold = m.gold - snap.gold;
              autoOptsRef.current = {
                ...(dExp > 0 ? { expPerSec: dExp / dt } : {}),
                ...(dGold > 0 ? { goldPerSec: dGold / dt } : {}),
              };
            }
          }
          prevSnapshotRef.current = {
            gold: m.gold,
            partyExp: m.partyExp,
            stageKey: m.stageKey,
            atMs: now,
          };
          let psd: PlayerSaveData | null = null;
          try { psd = parseSave(text); } catch { /* corrupt save */ }
          const rec = await runRecommend(text, {
            ...autoOptsRef.current,
            ...(optsRef.current ?? {}),
          });
          const db = await loadGameDB();
          setState((prev) => ({
            ...prev,
            status: "ready",
            source: "live",
            rec,
            db,
            psd,
            error: null,
          }));
        } catch (err) {
          setState((prev) => ({
            ...prev,
            status: "error",
            error: `Erro ao ler o save — ${err instanceof Error ? err.message : "arquivo pode estar corrompido"}.`,
          }));
        }
      });
      stopRef.current = stopHandle;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setState(IDLE);
        return;
      }
      setState({
        ...IDLE,
        status: "error",
        error:
          "Live-watch não iniciou — browser não suportado ou permissão negada.",
      });
    }
  }, []);

  const disconnect = useCallback((): void => {
    if (stopRef.current) {
      stopRef.current();
      stopRef.current = null;
    }
    optsRef.current = null;
    prevSnapshotRef.current = null;
    autoOptsRef.current = {};
    setState(IDLE);
  }, []);

  const recalibrate = useCallback(async (opts: RecommendOpts): Promise<void> => {
    optsRef.current = opts;
    const text = saveTextRef.current;
    if (!text) return;
    try {
      const rec = await runRecommend(text, opts);
      // reset status/error: um recalibrate bem-sucedido após uma falha anterior precisa voltar a "ready"
      setState((prev) => ({ ...prev, status: "ready", error: null, rec }));
    } catch (e) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: `Não consegui recalibrar — ${e instanceof Error ? e.message : "erro desconhecido"}.`,
      }));
    }
  }, []);

  const value = useMemo<RecommendationState>(
    () => ({ ...state, demo, connect, watch, disconnect, recalibrate }),
    [state, demo, connect, watch, disconnect, recalibrate],
  );

  return (
    <RecommendationContext.Provider value={value}>
      {children}
    </RecommendationContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRecommendation(): RecommendationState {
  const ctx = useContext(RecommendationContext);
  if (!ctx) {
    throw new Error(
      "useRecommendation deve ser usado dentro de <RecommendationProvider>",
    );
  }
  return ctx;
}
