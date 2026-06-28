import { readSaveFile } from "./decrypt";

export async function connectViaPicker(): Promise<string> {
  const [handle] = await (window as any).showOpenFilePicker?.() ?? [];
  if (handle) { const file = await handle.getFile(); return readSaveFile(await file.arrayBuffer()); }
  // fallback <input type=file>
  return new Promise((resolve, reject) => {
    const input = document.createElement("input"); input.type = "file";
    input.onchange = async () => { const f = input.files?.[0]; if (!f) return reject(new Error("sem arquivo"));
      try { resolve(await readSaveFile(await f.arrayBuffer())); } catch (err) { reject(err); } };
    input.click();
  });
}

// live-watch: re-lê quando o mtime do arquivo muda (Chrome/Edge). Retorna stop().
export async function watchSaveFile(onChange: (text: string) => void): Promise<() => void> {
  const picker = (window as any).showOpenFilePicker;
  if (!picker) throw new Error("File System Access não suportado neste browser");
  const [handle] = await picker();
  let last = 0, stopped = false;
  const tick = async () => {
    if (stopped) return;
    try { const file = await handle.getFile();
      if (file.lastModified !== last) { last = file.lastModified; onChange(await readSaveFile(await file.arrayBuffer())); } }
    catch { /* arquivo temporariamente indisponível durante o save do jogo */ }
    if (!stopped) setTimeout(tick, 2000);
  };
  tick();
  return () => { stopped = true; };
}
