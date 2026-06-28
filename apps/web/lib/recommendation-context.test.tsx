// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import {
  RecommendationProvider,
  useRecommendation,
} from "./recommendation-context";
import { watchSaveFile } from "@/lib/save";

// ── Mocks ─────────────────────────────────────────────────────────────────────
// vi.mock is hoisted before variable declarations — inline all return values.

vi.mock("@/lib/engine-bridge", () => ({
  runRecommend: vi.fn().mockResolvedValue({ farm: { recommend: null } }),
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

  it("demo() after watch() invokes the stored stop handle", async () => {
    const stopHandle = vi.fn();
    vi.mocked(watchSaveFile).mockImplementation(
      async (onChange: (text: string) => void) => {
        // simulate immediate initial read (mirrors real watchSaveFile tick())
        onChange("watch-save-text");
        return stopHandle;
      },
    );

    const { result } = renderHook(() => useRecommendation(), { wrapper });

    await act(async () => {
      await result.current.watch();
    });
    expect(result.current.status).toBe("ready");
    expect(result.current.source).toBe("live");

    await act(async () => {
      await result.current.demo();
    });

    expect(stopHandle).toHaveBeenCalledOnce();
    expect(result.current.status).toBe("ready");
    expect(result.current.source).toBe("demo");
  });

  it("recalibrate() re-runs runRecommend with opts and updates rec", async () => {
    const { runRecommend } = await import("@/lib/engine-bridge");
    const firstRec = { farm: { recommend: null }, _tag: "first" };
    const calibratedRec = { farm: { recommend: { key: "3-1" } }, _tag: "calibrated" };
    vi.mocked(runRecommend)
      .mockResolvedValueOnce(firstRec as never)
      .mockResolvedValueOnce(calibratedRec as never);

    const { result } = renderHook(() => useRecommendation(), { wrapper });

    // Load demo so saveText is stored
    await act(async () => {
      await result.current.demo();
    });
    expect(result.current.status).toBe("ready");
    expect(result.current.rec).toStrictEqual(firstRec);

    const opts = { clearSamples: [{ clearSec: 12, hp: 50000, waves: 3 }] };
    await act(async () => {
      await result.current.recalibrate(opts);
    });

    // runRecommend called twice: once by demo(), once by recalibrate()
    expect(vi.mocked(runRecommend)).toHaveBeenCalledTimes(2);
    // Second call must pass the opts
    expect(vi.mocked(runRecommend)).toHaveBeenNthCalledWith(
      2,
      "demo-save-text",
      opts,
    );
    // rec updated to calibratedRec, status/source unchanged
    expect(result.current.rec).toStrictEqual(calibratedRec);
    expect(result.current.status).toBe("ready");
    expect(result.current.source).toBe("demo");
  });

  it("useRecommendation() throws when used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useRecommendation())).toThrow(
      "useRecommendation deve ser usado dentro de <RecommendationProvider>",
    );
    spy.mockRestore();
  });
});
