import { describe, it, expect } from "vitest";
import { decryptSave, encryptSaveForTest } from "./decrypt";

describe("decryptSave", () => {
  it("faz round-trip (encrypt→decrypt) preservando o texto", async () => {
    const plain = JSON.stringify({ hello: "tbh", n: 12345678901234567 });
    const buf = await encryptSaveForTest(plain);
    expect(await decryptSave(buf)).toBe(plain);
  });
});
