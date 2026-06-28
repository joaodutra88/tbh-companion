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
import type { Recommendation, GameDB, RecommendOpts } from "@tbh/engine";
import { loadGameDB } from "@tbh/game-data";
import { connectViaPicker, watchSaveFile, loadDemoText } from "@/lib/save";
import { runRecommend } from "@/lib/engine-bridge";

// ── State shape ───────────────────────────────────────────────────────────────

export interface RecommendationState {
  status: "idle" | "loading" | "ready" | "error";
  source: "demo" | "file" | "live" | null;
  rec: Recommendation | null;
  error: string | null;
  /** Game DB — loaded alongside rec; needed by Task 3 components for hero name/icon. */
  db: GameDB | null;
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
}

const IDLE: DataState = {
  status: "idle",
  source: null,
  rec: null,
  error: null,
  db: null,
};

// ── Context ───────────────────────────────────────────────────────────────────

const RecommendationContext = createContext<RecommendationState | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function RecommendationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>(IDLE);
  const stopRef = useRef<(() => void) | null>(null);
  /** Last save text — used by recalibrate() to re-run recommend without re-loading. */
  const saveTextRef = useRef<string | null>(null);

  const demo = useCallback(async (): Promise<void> => {
    if (stopRef.current) { stopRef.current(); stopRef.current = null; }
    setState({ ...IDLE, status: "loading" });
    try {
      const text = loadDemoText();
      saveTextRef.current = text;
      const rec = await runRecommend(text);
      const db = await loadGameDB();
      setState({ status: "ready", source: "demo", rec, db, error: null });
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
    setState({ ...IDLE, status: "loading" });
    try {
      const text = await connectViaPicker();
      saveTextRef.current = text;
      const rec = await runRecommend(text);
      const db = await loadGameDB();
      setState({ status: "ready", source: "file", rec, db, error: null });
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
    setState({ ...IDLE, status: "loading" });
    try {
      const stopHandle = await watchSaveFile(async (text) => {
        saveTextRef.current = text;
        try {
          const rec = await runRecommend(text);
          const db = await loadGameDB();
          setState((prev) => ({
            ...prev,
            status: "ready",
            source: "live",
            rec,
            db,
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
    setState(IDLE);
  }, []);

  const recalibrate = useCallback(async (opts: RecommendOpts): Promise<void> => {
    const text = saveTextRef.current;
    if (!text) return;
    try {
      const rec = await runRecommend(text, opts);
      setState((prev) => ({ ...prev, rec }));
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
