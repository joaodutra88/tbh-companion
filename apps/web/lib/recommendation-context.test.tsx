// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import {
  RecommendationProvider,
  useRecommendation,
} from "./recommendation-context";

// ── Mocks ─────────────────────────────────────────────────────────────────────
// vi.mock is hoisted before variable declarations — inline all return values.

vi.mock("@/lib/engine-bridge", () => ({
  runRecommend: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/save", () => ({
  loadDemoText: vi.fn().mockReturnValue("demo-save-text"),
  connectViaPicker: vi.fn(),
  watchSaveFile: vi.fn(),
  textToSave: vi.fn(),
}));

vi.mock("@tbh/game-data", () => ({
  loadGameDB: vi.fn().mockResolvedValue({}),
}));

// ── Wrapper ───────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  return <RecommendationProvider>{children}</RecommendationProvider>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("RecommendationProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with status idle and null rec/db", () => {
    const { result } = renderHook(() => useRecommendation(), { wrapper });
    expect(result.current.status).toBe("idle");
    expect(result.current.rec).toBeNull();
    expect(result.current.db).toBeNull();
    expect(result.current.source).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("demo() transitions to ready, sets rec and db", async () => {
    const { result } = renderHook(() => useRecommendation(), { wrapper });

    await act(async () => {
      await result.current.demo();
    });

    expect(result.current.status).toBe("ready");
    expect(result.current.source).toBe("demo");
    expect(result.current.rec).not.toBeNull();
    expect(result.current.db).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("disconnect() resets state to idle after demo", async () => {
    const { result } = renderHook(() => useRecommendation(), { wrapper });

    await act(async () => {
      await result.current.demo();
    });
    expect(result.current.status).toBe("ready");

    act(() => {
      result.current.disconnect();
    });
    expect(result.current.status).toBe("idle");
    expect(result.current.rec).toBeNull();
    expect(result.current.db).toBeNull();
  });

  it("useRecommendation() throws when used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useRecommendation())).toThrow(
      "useRecommendation deve ser usado dentro de <RecommendationProvider>",
    );
    spy.mockRestore();
  });
});
