const PASSWORD = "emuMqG3bLYJ938ZDCfieWJ"; // chave ES3 pública do jogo

export async function decryptSave(buf: ArrayBuffer): Promise<string> {
  const b = new Uint8Array(buf);
  const iv = b.slice(0, 16);
  const ct = b.slice(16);
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(PASSWORD), { name: "PBKDF2" }, false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: iv, iterations: 100, hash: "SHA-1" },
    base, { name: "AES-CBC", length: 128 }, false, ["decrypt"],
  );
  const out = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, ct));
  return new TextDecoder().decode(out);
}

// Um .es3 decripta para um JSON externo { PlayerSaveData: { value: "<save interno>" }, ... }.
// O save de fato é o `.PlayerSaveData.value` interno (string JSON que parseSave consome).
export function extractSaveText(decryptedFile: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(decryptedFile);
  } catch {
    throw new Error("Save decriptado não é JSON válido");
  }
  const value = (parsed as { PlayerSaveData?: { value?: unknown } } | null)?.PlayerSaveData?.value;
  if (typeof value !== "string") {
    throw new Error("Save sem PlayerSaveData.value — formato inesperado");
  }
  return value;
}

// Lê o arquivo .es3: decripta e extrai o save interno (texto pronto para parseSave).
export async function readSaveFile(buf: ArrayBuffer): Promise<string> {
  return extractSaveText(await decryptSave(buf));
}

// helper de teste: cifra com o MESMO esquema (round-trip), não usado em produção
export async function encryptSaveForTest(plaintext: string): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(PASSWORD), { name: "PBKDF2" }, false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: iv, iterations: 100, hash: "SHA-1" },
    base, { name: "AES-CBC", length: 128 }, false, ["encrypt"],
  );
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, new TextEncoder().encode(plaintext)));
  const out = new Uint8Array(16 + ct.length); out.set(iv, 0); out.set(ct, 16);
  return out.buffer;
}
