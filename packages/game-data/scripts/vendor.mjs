import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const CP = "C:/Users/joao/Documents/01-projetos-2026/tbh-copilot/engine";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "raw");
mkdirSync(OUT, { recursive: true });

function loadGlobal(file, prop) {
  const code = readFileSync(join(CP, file), "utf8");
  const sandbox = { module: { exports: {} }, exports: {}, require: () => ({}) };
  sandbox.globalThis = sandbox; sandbox.window = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  const val = sandbox[prop] ?? sandbox.module.exports?.[prop] ?? sandbox.module.exports;
  if (!val) throw new Error(`não achei ${prop} em ${file}`);
  return val;
}

writeFileSync(join(OUT, "gamedata.json"), JSON.stringify(loadGlobal("gamedata.js", "TBH_DB")));
writeFileSync(join(OUT, "gearnames.json"), JSON.stringify(loadGlobal("gearnames.js", "TBH_GEARNAMES")));
writeFileSync(join(OUT, "itemnames.json"), JSON.stringify(loadGlobal("itemnames.js", "TBH_ITEMNAMES")));
writeFileSync(join(OUT, "materialfx.json"), JSON.stringify(loadGlobal("materialfx.js", "TBH_MATFX")));

// demo save = texto decriptado da fixture (entrada do modo demo, exercita o engine)
const fx = JSON.parse(readFileSync(join(CP, "fixtures", "save_fixture.json"), "utf8"));
writeFileSync(join(OUT, "demo-save.json"), JSON.stringify({ playerSaveData: fx.PlayerSaveData.value }));
console.log("vendor: ok");
