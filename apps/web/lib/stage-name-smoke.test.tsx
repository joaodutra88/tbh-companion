// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { getDemoSaveText, loadGameDB } from "@tbh/game-data";
import type { GameDB } from "@tbh/engine";
import { StageName } from "@/components/stage-name";
import { stageOptionText, DIFF_LABEL, type DiffKey } from "@/lib/stage-format";

afterEach(() => cleanup());

describe("StageName — difficulty chip (smoke)", () => {
  it("shows the PT-BR difficulty label for TORMENT", () => {
    const { container } = render(
      <StageName label="3-9" diff="TORMENT" lvl={95} showLevel />,
    );
    expect(container.textContent).toContain("Tormento");
    expect(container.textContent).toContain("3-9");
    expect(container.textContent).toContain("95");
  });

  it("shows 'Normal' chip (all 4 tiers including Normal are rendered)", () => {
    const { container } = render(<StageName label="1-1" diff="NORMAL" lvl={1} />);
    expect(container.textContent).toContain("Normal");
    expect(container.textContent).toContain("1-1");
  });

  it("shows 'Pesadelo' and 'Inferno' chips", () => {
    const { container: c1 } = render(<StageName label="2-1" diff="NIGHTMARE" />);
    expect(c1.textContent).toContain("Pesadelo");

    cleanup();

    const { container: c2 } = render(<StageName label="2-9" diff="HELL" />);
    expect(c2.textContent).toContain("Inferno");
  });

  it("renders no chip when diff is absent (graceful)", () => {
    const { container } = render(<StageName label="3-9" />);
    // No difficulty label should appear
    expect(container.textContent).not.toContain("Normal");
    expect(container.textContent).not.toContain("Pesadelo");
    expect(container.textContent).not.toContain("Inferno");
    expect(container.textContent).not.toContain("Tormento");
    // But the label still appears
    expect(container.textContent).toContain("3-9");
  });

  it("renders no chip for unknown diff (graceful)", () => {
    const { container } = render(<StageName label="3-9" diff="UNKNOWN" />);
    expect(container.textContent).not.toContain("Normal");
    expect(container.textContent).toContain("3-9");
  });

  it("showLevel appends 'nv N' inline", () => {
    const { container } = render(
      <StageName label="3-9" diff="TORMENT" lvl={95} showLevel />,
    );
    expect(container.textContent).toContain("nv 95");
  });

  it("omits level when showLevel is false (default)", () => {
    const { container } = render(<StageName label="3-9" diff="TORMENT" lvl={95} />);
    expect(container.textContent).not.toContain("nv 95");
  });

  it("resolves label and diff from db.stages when stageKey is given", async () => {
    const db: GameDB = await loadGameDB();
    // Find a stage that has both label and diff in the real game DB.
    const key = Object.keys(db.stages).find(
      (k) => db.stages[k]?.diff != null && db.stages[k]?.label != null,
    );
    if (!key) return; // game DB has no stages with diff — skip gracefully

    const stage = db.stages[key]!;
    const { container } = render(<StageName db={db} stageKey={key} />);

    // The PT-BR difficulty label should appear if we have a mapping for it.
    const ptLabel =
      stage.diff != null && stage.diff in DIFF_LABEL
        ? DIFF_LABEL[stage.diff as DiffKey]
        : undefined;
    if (ptLabel) {
      expect(container.textContent).toContain(ptLabel);
    }
    // The stage label should always appear.
    expect(container.textContent).toContain(stage.label);
  });
});

describe("calibration <option> text — stageOptionText (smoke)", () => {
  it("option text for a stage with diff contains the PT-BR difficulty", async () => {
    const db: GameDB = await loadGameDB();
    const key = Object.keys(db.stages).find(
      (k) => db.stages[k]?.diff != null && db.stages[k]?.label != null,
    );
    if (!key) return; // no qualifying stage in demo DB — skip

    const stage = db.stages[key]!;
    const text = stageOptionText(db, key);
    const ptLabel =
      stage.diff != null && stage.diff in DIFF_LABEL
        ? DIFF_LABEL[stage.diff as DiffKey]
        : undefined;

    if (ptLabel) {
      expect(text).toContain(ptLabel);
    }
    expect(text).toContain(stage.label);
    expect(text).toContain(String(stage.lvl));
  });

  it("option text without diff omits all PT-BR difficulty names", async () => {
    const db: GameDB = await loadGameDB();
    // Find a stage that has NO diff field.
    const key = Object.keys(db.stages).find((k) => db.stages[k]?.diff == null);
    if (!key) return; // all stages have diff — skip

    const text = stageOptionText(db, key);
    expect(text).not.toContain("Normal");
    expect(text).not.toContain("Pesadelo");
    expect(text).not.toContain("Inferno");
    expect(text).not.toContain("Tormento");
    expect(text).toContain(String(db.stages[key]!.lvl));
  });
});
