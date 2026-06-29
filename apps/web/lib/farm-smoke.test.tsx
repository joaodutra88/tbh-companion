// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { getDemoSaveText, loadGameDB } from "@tbh/game-data";
import type { FarmRow, GameDB, Recommendation } from "@tbh/engine";
import { runRecommend } from "./engine-bridge";
import { FarmPane } from "@/components/farm/farm-pane";
import { sortRows, type SortState } from "@/components/farm/stage-table";

afterEach(() => cleanup());

describe("FarmPane (smoke)", () => {
  it("renders the recommended stage, a /h rate, and a populated stage table", async () => {
    const rec: Recommendation = await runRecommend(getDemoSaveText());
    const db: GameDB = await loadGameDB();

    render(<FarmPane rec={rec} db={db} recalibrate={vi.fn()} />);

    // Recommended-stage card: eyebrow + the stage name (demo recommend = "3-1").
    expect(screen.getByText("Stage recomendado")).toBeTruthy();
    const recName = db.stages[rec.farm.recommend!.key]?.label ?? rec.farm.recommend!.label;
    // StageName renders the label in its own <span>; check the label appears anywhere.
    expect(screen.getAllByText(new RegExp(String(recName))).length).toBeGreaterThan(0);

    // At least one per-hour rate is rendered ("…/h").
    expect(screen.getAllByText(/\/h$/).length).toBeGreaterThan(0);

    // Stage table: header row(s) + one <tr> per farmable row ≥ all.length.
    const allRows = screen.getAllByRole("row");
    expect(allRows.length).toBeGreaterThanOrEqual(rec.farm.all.length);

    // Idle section present (demo has offline unlocked).
    expect(screen.getByLabelText("Idle / Offline")).toBeTruthy();
  });

  it("shows the calibration input + button", async () => {
    const rec: Recommendation = await runRecommend(getDemoSaveText());
    const db: GameDB = await loadGameDB();
    render(<FarmPane rec={rec} db={db} recalibrate={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Calibrar/i })).toBeTruthy();
  });

  it("shows 'Deixa rolando' highlight with farm.recommend stage name; shows 'Estaciona offline' when bestPark exists", async () => {
    const rec: Recommendation = await runRecommend(getDemoSaveText(), { elapsedSec: 0 });
    const db: GameDB = await loadGameDB();
    render(<FarmPane rec={rec} db={db} recalibrate={vi.fn()} />);

    // "Deixa rolando" action block is always rendered when recommend exists.
    expect(screen.getByLabelText("Deixa rolando — auto-farm")).toBeTruthy();
    const recName =
      db.stages[rec.farm.recommend!.key]?.label ??
      rec.farm.recommend!.label ??
      rec.farm.recommend!.key;
    // StageName renders the label in its own <span>; check the label appears anywhere.
    expect(screen.getAllByText(new RegExp(String(recName))).length).toBeGreaterThan(0);

    // "Estaciona offline" block renders only when bestPark exists.
    if (rec.idle.bestPark) {
      expect(screen.getByLabelText("Estaciona offline aqui")).toBeTruthy();
    } else {
      expect(screen.queryByLabelText("Estaciona offline aqui")).toBeNull();
    }
  });
});

describe("sortRows (comparator)", () => {
  const rows = [
    { key: "a", goldPerHour: 100, expPerHour: 5, clearTime: 50, lvl: 1, expDensity: 0.1, goldDensity: 0.3 },
    { key: "b", goldPerHour: 300, expPerHour: 1, clearTime: 10, lvl: 3, expDensity: 0.5, goldDensity: 0.1 },
    { key: "c", goldPerHour: 200, expPerHour: 9, clearTime: 30, lvl: 2, expDensity: 0.2, goldDensity: 0.2 },
  ] as unknown as FarmRow[];

  it("sorts gold/h descending by default direction", () => {
    const sort: SortState = { key: "goldPerHour", dir: "desc" };
    expect(sortRows(rows, sort).map((r) => r.key)).toEqual(["b", "c", "a"]);
  });

  it("sorts exp/h ascending", () => {
    const sort: SortState = { key: "expPerHour", dir: "asc" };
    expect(sortRows(rows, sort).map((r) => r.key)).toEqual(["b", "a", "c"]);
  });

  it("does not mutate the input array", () => {
    const before = rows.map((r) => r.key);
    sortRows(rows, { key: "clearTime", dir: "asc" });
    expect(rows.map((r) => r.key)).toEqual(before);
  });
});
