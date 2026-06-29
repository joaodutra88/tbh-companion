import { describe, it, expect } from "vitest";
import type { GameDB } from "@tbh/engine";
import { itemIcon, gearName, gradeStyle, gearTypeLabel, GEAR_GRADES, RARITY_COLOR, rarityStyle } from "./item-format";

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Minimal GameDB stub: only the `items` table is required. */
const db = {
  items: {
    "300001": {
      gt: "SWORD",
      grade: "COMMON",
      lvl: 1,
      type: "GEAR",
      icon: "/game/gear/sword/SWORD_300001.png",
    },
    "110001": {
      grade: "COMMON",
      type: "MATERIAL",
      icon: "/game/items/materials/Item_110001.png",
    },
  },
} as unknown as GameDB;

// ── itemIcon ──────────────────────────────────────────────────────────────────

describe("itemIcon", () => {
  it("resolves the icon path for a known gear item", () => {
    expect(itemIcon(300001, db)).toBe("/game/gear/sword/SWORD_300001.png");
  });

  it("accepts a string key", () => {
    expect(itemIcon("300001", db)).toBe("/game/gear/sword/SWORD_300001.png");
  });

  it("resolves the icon for a material item", () => {
    expect(itemIcon(110001, db)).toBe("/game/items/materials/Item_110001.png");
  });

  it("returns empty string for a missing item key", () => {
    expect(itemIcon(999999, db)).toBe("");
  });

  it("returns empty string for an item without an icon field", () => {
    const dbNoIcon = {
      items: { "300001": { gt: "SWORD", grade: "COMMON", lvl: 1, type: "GEAR" } },
    } as unknown as GameDB;
    expect(itemIcon(300001, dbNoIcon)).toBe("");
  });
});

// ── gearName ─────────────────────────────────────────────────────────────────

describe("gearName", () => {
  it("returns the English name for a known item key (number)", () => {
    expect(gearName(300001)).toBe("Long Sword");
  });

  it("returns the English name for a known item key (string)", () => {
    expect(gearName("300001")).toBe("Long Sword");
  });

  it("falls back to 'Item #K' for an unknown key", () => {
    expect(gearName(999999)).toBe("Item #999999");
    expect(gearName("888888")).toBe("Item #888888");
  });
});

// ── gradeStyle ────────────────────────────────────────────────────────────────

describe("gradeStyle — all 10 grades are defined", () => {
  it("covers every grade in GEAR_GRADES", () => {
    for (const grade of GEAR_GRADES) {
      const style = gradeStyle(grade);
      expect(style.label).toBeTruthy();
      expect(style.className).toBeTruthy();
    }
  });

  it("COMMON returns the lowest-tier (dim) style", () => {
    const style = gradeStyle("COMMON");
    expect(style.label).toBe("Comum");
    expect(style.className).toContain("text-dim");
  });

  it("LEGENDARY returns a teal-accented style", () => {
    const style = gradeStyle("LEGENDARY");
    expect(style.className).toContain("teal");
  });

  it("ARCANA returns a gold-accented style", () => {
    const style = gradeStyle("ARCANA");
    expect(style.className).toContain("gold");
  });

  it("COSMIC returns the highest-tier (coral) style", () => {
    const style = gradeStyle("COSMIC");
    expect(style.label).toBe("Cósmico");
    expect(style.className).toContain("coral");
  });

  it("unknown grade returns a neutral fallback with non-empty label and className", () => {
    const style = gradeStyle("LEGENDARY_PLUS");
    expect(style.label).toBeTruthy();
    expect(style.className).toBeTruthy();
  });

  it("all 10 grades have distinct labels", () => {
    const labels = GEAR_GRADES.map((g) => gradeStyle(g).label);
    const unique = new Set(labels);
    expect(unique.size).toBe(GEAR_GRADES.length);
  });
});

// ── gearTypeLabel ─────────────────────────────────────────────────────────────

describe("gearTypeLabel", () => {
  it("maps main-weapon keys to PT-BR", () => {
    expect(gearTypeLabel("SWORD")).toBe("Espada");
    expect(gearTypeLabel("BOW")).toBe("Arco");
    expect(gearTypeLabel("STAFF")).toBe("Cajado");
    expect(gearTypeLabel("SCEPTER")).toBe("Cetro");
    expect(gearTypeLabel("CROSSBOW")).toBe("Besta");
    expect(gearTypeLabel("AXE")).toBe("Machado");
  });

  it("maps off-hand keys to PT-BR", () => {
    expect(gearTypeLabel("SHIELD")).toBe("Escudo");
    expect(gearTypeLabel("ARROW")).toBe("Flecha");
    expect(gearTypeLabel("ORB")).toBe("Orbe");
    expect(gearTypeLabel("TOME")).toBe("Grimório");
    expect(gearTypeLabel("BOLT")).toBe("Virote");
    expect(gearTypeLabel("HATCHET")).toBe("Machadinha");
  });

  it("maps armor and jewelry keys to PT-BR", () => {
    expect(gearTypeLabel("HELMET")).toBe("Elmo");
    expect(gearTypeLabel("ARMOR")).toBe("Armadura");
    expect(gearTypeLabel("GLOVES")).toBe("Luvas");
    expect(gearTypeLabel("BOOTS")).toBe("Botas");
    expect(gearTypeLabel("AMULET")).toBe("Amuleto");
    expect(gearTypeLabel("EARING")).toBe("Brinco");
    expect(gearTypeLabel("RING")).toBe("Anel");
    expect(gearTypeLabel("BRACER")).toBe("Bracelete");
  });

  it("humanizes unmapped keys via title-case (no raw UPPERCASE)", () => {
    expect(gearTypeLabel("DUAL_BLADE")).toBe("Dual Blade");
    expect(gearTypeLabel("WAND")).toBe("Wand");
  });

  it("returns empty string for empty input (no crash)", () => {
    expect(gearTypeLabel("")).toBe("");
  });
});

// ── rarityStyle + RARITY_COLOR ────────────────────────────────────────────────

describe("RARITY_COLOR — all 10 grades defined", () => {
  it("has an entry for every grade in GEAR_GRADES", () => {
    for (const grade of GEAR_GRADES) {
      expect(RARITY_COLOR[grade]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("all 10 colors are distinct hex values", () => {
    const colors = Object.values(RARITY_COLOR);
    const unique = new Set(colors);
    expect(unique.size).toBe(GEAR_GRADES.length);
  });

  it("spot-check: COMMON=#9aa7c2, LEGENDARY=#f6c552, COSMIC=#ff5fae", () => {
    expect(RARITY_COLOR.COMMON).toBe("#9aa7c2");
    expect(RARITY_COLOR.LEGENDARY).toBe("#f6c552");
    expect(RARITY_COLOR.COSMIC).toBe("#ff5fae");
  });
});

describe("rarityStyle — returns correct hex for all 10 grades", () => {
  for (const grade of GEAR_GRADES) {
    it(`${grade}: color matches RARITY_COLOR[${grade}]`, () => {
      const rs = rarityStyle(grade);
      expect(rs.color).toBe(RARITY_COLOR[grade]);
      expect(rs.style.color).toBe(RARITY_COLOR[grade]);
      expect(rs.style.borderColor).toBe(RARITY_COLOR[grade]);
    });
  }

  it("className is a non-empty string (chip shape)", () => {
    const rs = rarityStyle("LEGENDARY");
    expect(rs.className).toBeTruthy();
    expect(typeof rs.className).toBe("string");
  });

  it("unknown grade falls back to COMMON color (#9aa7c2)", () => {
    const rs = rarityStyle("LEGENDARY_PLUS");
    expect(rs.color).toBe("#9aa7c2");
    expect(rs.style.color).toBe("#9aa7c2");
    expect(rs.style.borderColor).toBe("#9aa7c2");
  });

  it("empty string grade falls back gracefully", () => {
    const rs = rarityStyle("");
    expect(rs.color).toBe("#9aa7c2");
    expect(rs.className).toBeTruthy();
  });
});
