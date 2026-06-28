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
  measureSave: vi.fn().mockResolvedValue({ gold: 1000, partyExp: 500, stageKey: "1-1" }),
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

  it("live-watch ticks after recalibrate() pass opts to runRecommend", async () => {
    const { runRecommend } = await import("@/lib/engine-bridge");

    // Capture the onChange callback so we can simulate subsequent save-file ticks
    let capturedOnChange: ((text: string) => void) | null = null;
    vi.mocked(watchSaveFile).mockImplementation(
      async (onChange: (text: string) => void) => {
        capturedOnChange = onChange;
        onChange("watch-text-v1");
        return vi.fn();
      },
    );

    const { result } = renderHook(() => useRecommendation(), { wrapper });

    await act(async () => {
      await result.current.watch();
    });
    expect(result.current.source).toBe("live");

    const opts = { clearSamples: [{ clearSec: 10, hp: 40000, waves: 2 }] };
    await act(async () => {
      await result.current.recalibrate(opts);
    });

    // Simulate a subsequent save-file tick (as if the game wrote a new save)
    await act(async () => {
      capturedOnChange!("watch-text-v2");
    });

    // The tick AFTER recalibrate must forward opts to runRecommend
    const calls = vi.mocked(runRecommend).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall).toEqual(["watch-text-v2", opts]);
  });

  it("watch() and disconnect() clear calibration opts so a new session starts uncalibrated", async () => {
    const { runRecommend } = await import("@/lib/engine-bridge");

    let capturedOnChange: ((text: string) => void) | null = null;
    vi.mocked(watchSaveFile).mockImplementation(
      async (onChange: (text: string) => void) => {
        capturedOnChange = onChange;
        onChange("watch-text-v1");
        return vi.fn();
      },
    );

    const { result } = renderHook(() => useRecommendation(), { wrapper });

    // First watch session + calibrate
    await act(async () => { await result.current.watch(); });
    const opts = { clearSamples: [{ clearSec: 10, hp: 40000, waves: 2 }] };
    await act(async () => { await result.current.recalibrate(opts); });

    // Disconnect clears opts; new watch() session starts uncalibrated
    act(() => { result.current.disconnect(); });
    await act(async () => { await result.current.watch(); });

    // First tick of the new session must NOT carry stale opts (auto+manual both cleared)
    const calls = vi.mocked(runRecommend).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[1]).toEqual({});
    expect(capturedOnChange).not.toBeNull(); // watch was re-established
  });

  it("auto-calibration derives expPerSec and goldPerSec from same-stage save deltas", async () => {
    const { runRecommend, measureSave } = await import("@/lib/engine-bridge");

    vi.mocked(measureSave)
      .mockResolvedValueOnce({ gold: 1000, partyExp: 500, stageKey: "1-1" })
      .mockResolvedValueOnce({ gold: 2000, partyExp: 1000, stageKey: "1-1" });

    const nowMock = vi.spyOn(Date, "now")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(10_000); // 10 s later

    let capturedOnChange: ((text: string) => void) | null = null;
    vi.mocked(watchSaveFile).mockImplementation(async (onChange) => {
      capturedOnChange = onChange;
      onChange("save-v1");
      return vi.fn();
    });

    const { result } = renderHook(() => useRecommendation(), { wrapper });
    await act(async () => { await result.current.watch(); });
    await act(async () => { capturedOnChange!("save-v2"); });

    const calls = vi.mocked(runRecommend).mock.calls;
    const lastCall = calls[calls.length - 1];
    // dGold=1000/10s=100, dExp=500/10s=50
    expect(lastCall[1]).toMatchObject({ goldPerSec: 100, expPerSec: 50 });

    nowMock.mockRestore();
  });

  it("auto-calibration skips opts when stageKey changes between ticks", async () => {
    const { runRecommend, measureSave } = await import("@/lib/engine-bridge");

    vi.mocked(measureSave)
      .mockResolvedValueOnce({ gold: 1000, partyExp: 500, stageKey: "1-1" })
      .mockResolvedValueOnce({ gold: 2000, partyExp: 1000, stageKey: "1-2" }); // stage changed

    const nowMock = vi.spyOn(Date, "now")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(10_000);

    let capturedOnChange: ((text: string) => void) | null = null;
    vi.mocked(watchSaveFile).mockImplementation(async (onChange) => {
      capturedOnChange = onChange;
      onChange("save-v1");
      return vi.fn();
    });

    const { result } = renderHook(() => useRecommendation(), { wrapper });
    await act(async () => { await result.current.watch(); });
    await act(async () => { capturedOnChange!("save-v2"); });

    const calls = vi.mocked(runRecommend).mock.calls;
    const lastCall = calls[calls.length - 1];
    // No auto opts because stageKey changed
    expect(lastCall[1]).not.toHaveProperty("goldPerSec");
    expect(lastCall[1]).not.toHaveProperty("expPerSec");

    nowMock.mockRestore();
  });

  it("useRecommendation() throws when used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useRecommendation())).toThrow(
      "useRecommendation deve ser usado dentro de <RecommendationProvider>",
    );
    spy.mockRestore();
  });
});
