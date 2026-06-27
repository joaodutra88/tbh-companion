import { describe, it, expect } from "vitest";
import { loadGameDB, getDemoSaveText } from "../src/index";

describe("game-data", () => {
  it("carrega o GameDB com as tabelas-chave", async () => {
    const db = await loadGameDB();
    expect(Object.keys(db.stages).length).toBeGreaterThan(10);
    expect(Array.isArray(db.stageOrder)).toBe(true);
    expect(Array.isArray(db.levels)).toBe(true);
    expect(db.levels.length).toBeGreaterThan(0);
    expect(Object.keys(db.runes).length).toBeGreaterThan(0);
  });
  it("expõe o save de demo como texto parseável", () => {
    const txt = getDemoSaveText();
    expect(typeof txt).toBe("string");
    expect(txt.length).toBeGreaterThan(100);
  });
});
