import { describe, it, expect } from "vitest";
import { decryptSave, encryptSaveForTest, extractSaveText, readSaveFile } from "./decrypt";

describe("decryptSave", () => {
  it("faz round-trip (encrypt→decrypt) preservando o texto", async () => {
    const plain = JSON.stringify({ hello: "tbh", n: 12345678901234567 });
    const buf = await encryptSaveForTest(plain);
    expect(await decryptSave(buf)).toBe(plain);
  });
});

describe("extractSaveText", () => {
  it("extrai o save interno de PlayerSaveData.value", () => {
    const inner = JSON.stringify({ commonSaveData: { currentStageKey: 1301 } });
    const wrapper = JSON.stringify({ PlayerSaveData: { value: inner } });
    expect(extractSaveText(wrapper)).toBe(inner);
  });
  it("erra com mensagem clara se não for JSON", () => {
    expect(() => extractSaveText("não é json")).toThrow(/JSON/);
  });
  it("erra com mensagem clara se faltar PlayerSaveData.value", () => {
    expect(() => extractSaveText(JSON.stringify({ outro: 1 }))).toThrow(/PlayerSaveData/);
  });
});

describe("readSaveFile (decripta o .es3 + extrai o save interno)", () => {
  it("decripta o arquivo embrulhado e devolve o PlayerSaveData.value interno", async () => {
    // Reproduz a estrutura real do .es3: { PlayerSaveData: { value: "<save interno>" } }, cifrado.
    const inner = JSON.stringify({ commonSaveData: { currentStageKey: 1306 }, heroSaveDatas: [] });
    const file = JSON.stringify({ PlayerSaveData: { value: inner } });
    const encrypted = await encryptSaveForTest(file);
    // Antes do fix, o caminho real fazia parseSave(arquivo externo) → shape errado.
    expect(await readSaveFile(encrypted)).toBe(inner);
  });
});
