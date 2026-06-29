import { describe, it, expect } from "vitest";
import { statusColor, RUNE_STATUSES } from "./rune-colors";

describe("statusColor", () => {
  it("retorna uma entrada de cor definida para cada status conhecido", () => {
    for (const s of RUNE_STATUSES) {
      const c = statusColor(s);
      expect(c).toBeDefined();
      expect(typeof c.fill).toBe("string");
      expect(c.fill.length).toBeGreaterThan(0);
      expect(typeof c.stroke).toBe("string");
      expect(c.stroke.length).toBeGreaterThan(0);
      expect(typeof c.opacity).toBe("number");
      expect(c.opacity).toBeGreaterThan(0);
      expect(c.opacity).toBeLessThanOrEqual(1);
      expect(typeof c.strokeWidth).toBe("number");
      expect(c.strokeWidth).toBeGreaterThan(0);
    }
  });

  it("mapeia status -> cor war-table esperada", () => {
    expect(statusColor("recommended").fill).toContain("gold");
    expect(statusColor("almostfree").stroke).toContain("gold");
    expect(statusColor("owned").fill).toContain("teal");
    expect(statusColor("maxed").fill).toContain("teal");
    expect(statusColor("maxed").opacity).toBeLessThan(1); // dim
    expect(statusColor("skip").fill).toContain("coral");
    expect(statusColor("locked").opacity).toBeLessThan(0.5); // baixa-opacidade
  });

  it("cai num neutro definido para status desconhecido", () => {
    const c = statusColor("status-inexistente");
    expect(c).toBeDefined();
    expect(c.fill.length).toBeGreaterThan(0);
    expect(c.stroke.length).toBeGreaterThan(0);
  });
});
