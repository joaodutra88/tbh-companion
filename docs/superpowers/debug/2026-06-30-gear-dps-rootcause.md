# Root Cause: Gear DPS Comparator — Shadow Bow Legendary vs Arcana

**Data:** 2026-06-30
**Investigador:** Debugging workflow (3 angulos)
**Status:** FECHADO — causa raiz identificada e CORRIGIDA (ver atualização abaixo)

---

## ⚠️ ATUALIZAÇÃO FINAL (pós-confirmação in-game do João) — a conclusão original foi REVISTA

A síntese original do workflow concluiu "o engine é correto / correct-but-counterintuitive".
**Isso estava ERRADO.** O João (que joga) confirmou pelo tooltip in-game que o
`AttackSpeed MULTIPLICATIVE 171` do arco vale **+17,1% (×1,171)**, não +171% (×2,71), e que
no jogo o Arcano realmente é mais forte que o Lendário.

**Causa raiz real:** `aggregate()` (`stats.ts`) escalava `MULTIPLICATIVE` por **/100** quando
o jogo usa **/1000** (`PARAMS.PERCENT_DIVISOR`) — 10× forte demais. Bug herdado fielmente do
copilot; nunca pego porque a demo-save/oráculo **não tem nenhum item MULTIPLICATIVE equipado**
(path nunca testado) e o oráculo só valida "bate com o copilot", não "bate com o jogo".

**Fix aplicado (branch `fix/gear-multiplicative-scale`):**
1. `stats.ts` `aggregate`: `mult *= 1 + v/100` → `mult *= 1 + v/PARAMS.PERCENT_DIVISOR`.
2. `stats.ts` `powerDelta`: remove também os `EnchantData` do gear antigo (enchant leak — este
   ponto da síntese estava certo).
3. `apps/web/lib/gear-stats.ts` + `slot-compare.tsx`: `formatGearStatValue` exibe a escala real
   (`+17,1%`, casando com o tooltip do jogo), em vez de `+171,0%`.
4. `test/engine.test.ts:289`: assert do swap do arco Ranger corrigida (`dPower ~601`, antes
   `>1000` herdado do copilot com o bug). Oráculo verde: 24/24.

**Lição (salva na memória `tbh-engine-calc-scale`):** oráculo-verde ≠ correto-no-jogo, porque os
valores esperados foram copiados do copilot. Sempre cruzar com evidência in-game quando o domínio
contradiz o cálculo. A nota "engine é correto" abaixo é a hipótese DESCARTADA — mantida só como
registro do raciocínio.

---

## Sintoma

No comparador de Gear (slot ARCO, metrica DPS), a app exibe:

- Shadow Bow Legendario Lv80 (key 313171): **+373.783 DPS / +14.271 POWER** acima do Shadow Bow Arcana Lv80 equipado (key 315171)
- ARCANA e grade superior a LEGENDARY na hierarquia do jogo

O usuario reportou: "nao tem como um arco arcano ser pior que o lendario do mesmo nivel."

---

## Evidencias por Angulo

### Angulo A — Aggregation / MULTIPLICATIVE handling

- `packages/engine/src/stats.ts:190-192` — formula `mult *= 1 + v / 100` para cada valor MULTIPLICATIVE, depois `out[st] = flat * (1 + add / PARAMS.PERCENT_DIVISOR) * mult`. Divisor para MULTIPLICATIVE e 100, para ADDITIVE e 1000 (PERCENT_DIVISOR).
- `packages/game-data/src/raw/gamedata.json` — `gear["313171"]` (Legendary): `{b1:439, b2:50, inh:[["AttackSpeed","MULTIPLICATIVE",171],["CriticalDamage","FLAT",703]]}`. A linha inh[0] e MULTIPLICATIVE, nao ADDITIVE.
- `packages/game-data/src/raw/gamedata.json` — `gear["315171"]` (Arcana): `{b1:839, b2:65, inh:[["CriticalChance","FLAT",29],["CriticalDamage","FLAT",936],["CooldownReduction","FLAT",87]]}`. Nenhuma linha MULTIPLICATIVE.
- Simulacao (Ranger base AS=100, apenas bow equipado): Legendary AS final = (100+50) x 2.71 = 406.5, atkPerSec = 4.065. Arcana AS final = (100+65) x 1.0 = 165, atkPerSec = 1.65. Ratio = x2.46.
- DPS isolado (bow-only, sem runes/outros slots): Legendary=3.562, Arcana=2.894. Delta=+668 DPS. Com flat AS acumulado de outros slots (ex.: +600 AS tipico late-game), o gap cresce para ~+73% de DPS, consistente com os +373k reportados.
- `apps/web/lib/gear-stats.ts:109` — `isPercent: mt !== "FLAT"`. Colide ADDITIVE e MULTIPLICATIVE no mesmo flag booleano.
- `apps/web/components/gear/slot-compare.tsx:287-289` — renderiza ambos como `` `+${row.value.toFixed(1)}%` ``. Um MULTIPLICATIVE:171 (x2.71) e um ADDITIVE:171 (+17.1%) aparecem identicos no display.

### Angulo B — Fidelidade do port (engine.js vs stats.ts)

- `tbh-copilot/engine/engine.js:107-108` — `let mult = 1; for (const v of mods.MULTIPLICATIVE || []) mult *= (1 + v / 100);` — formula identica a stats.ts:190-191.
- `tbh-copilot/engine/engine.js:113` — `atkPerSec = s.AttackSpeed / 100` — identico a `stats.ts:200`.
- Ambos os repos usam os mesmos dados: `gear["313171"]` e `gear["315171"]` sao identicos no gamedata do copilot e do tbh-companion.
- Conclusao: **nao ha bug de port**. A formula de agregacao MULTIPLICATIVE foi portada com fidelidade 100%.

### Angulo C — DB, grade e variants

- `db.items["313171"].grade = "LEGENDARY"`, `db.items["315171"].grade = "ARCANA"`. Grade e armazenado apenas como label em `items[k]`.
- `gearStatLines()` (`stats.ts:132-142`) le `db.gear[k].b1`, `db.gear[k].b2`, `db.gear[k].inh`. Nao consulta `db.items[k].grade` em nenhum momento.
- `collect()` e `aggregate()` nao tem qualquer awareness de grade. Grade nao pondera stats.
- Survey completo do DB: 518 linhas usam MULTIPLICATIVE, **exclusivamente** AttackSpeed (80-350) e CastSpeed (82-500). E uma mecanica intencional do jogo — multiplicador global de velocidade.
- Dois variants do mesmo grade podem ter rolls completamente diferentes. Ex.: `gear["313172"]` (tambem LEGENDARY bow) tem `inh=[["AttackDamage","FLAT",107],["CriticalDamage","FLAT",703]]` — sem nenhum MULTIPLICATIVE.

---

## Causa Raiz

**Hipotese C confirmada, com compounding de hipotese A (display).**

O engine e correto. O ranking nao e um bug de calculo.

O Shadow Bow Legendary (313171) carrega `AttackSpeed MULTIPLICATIVE 171` em seu array `inh[]`. A formula `mult = 1 + 171/100 = 2.71` e aplicada a TODA a pilha de flat AttackSpeed acumulada pelo personagem (hero base + todos os slots + runes). O Shadow Bow Arcana (315171) nao tem nenhuma linha MULTIPLICATIVE — seus 3 inh slots sao todos FLAT. A intuicao de que "ARCANA > LEGENDARY" e valida para rolls equivalentes, mas nao se sustenta quando o LEGENDARY carrega um multiplicador de velocidade global de x2.71 que o ARCANA nao possui.

O confundidor que torna o resultado nao-obvio e um bug de display:

`gear-stats.ts:109` define `isPercent: mt !== "FLAT"`, colapsando ADDITIVE e MULTIPLICATIVE no mesmo flag. `slot-compare.tsx:288` renderiza ambos como `+${value.toFixed(1)}%`. O usuario le "+171.0% AttackSpeed" e interpreta como um bonus aditivo modesto (interpretacao ADDITIVE seria +171/1000 = +17.1% sobre a base — inofensivo). Na realidade e um multiplicador global x2.71 que amplifica todo o flat AS acumulado.

**Bug secundario (enchant leakage em powerDelta):** `stats.ts:403` remove as stat lines do gear antigo via `gearStatLines()` (b1/b2/inh), mas NAO remove as EnchantData do gear antigo do contrib clonado (linhas 390-408). Se o Arcana equipado tiver enchants, esses enchants permanecem no calculo do "next" (Legendary), inflando artificialmente o DPS computado do Legendary. Este bug nao muda a conclusao fundamental (o x2.71 domina) mas faz o delta parecer maior do que seria em producao com o fix aplicado.

---

## Fix Minimo Recomendado (nao aplicar agora)

**Fix 1 (display — causa raiz da confusao):**

Em `apps/web/lib/gear-stats.ts`, substituir o campo `isPercent: mt !== "FLAT"` por dois campos distintos:
```typescript
isPercent: mt === 'ADDITIVE',
isMultiplicative: mt === 'MULTIPLICATIVE',
```

Em `apps/web/components/gear/slot-compare.tsx:287-289`, renderizar:
- ADDITIVE: `+${(row.value / 10).toFixed(1)}%` (divide por 10 para exibir a escala real — ADDITIVE 1000 = +100%, nao +1000%)
- MULTIPLICATIVE: `x${(1 + row.value / 100).toFixed(2)}` (ex.: MULTIPLICATIVE 171 → "x2.71")
- FLAT: valor numerico sem sufixo

**Fix 2 (enchant leakage em powerDelta — bug secundario):**

Em `stats.ts:396-403`, apos remover as gear stat lines do oldKey, tambem remover as EnchantData do oldUid (via `ism[oldUid]?.EnchantData`), usando o mesmo helper `rm(st, mt, v)` com os valores calculados via `db.statMods`.

---

## Teste que Falha

```typescript
// packages/engine/src/stats.test.ts

it("gearStatRows distingue MULTIPLICATIVE de ADDITIVE no display", () => {
  // setup: gear key 313171 (Shadow Bow Legendary) tem AttackSpeed MULTIPLICATIVE 171
  const rows = gearStatRows(db, 313171);
  const asRow = rows.find(r => r.statKey === "AttackSpeed");

  // O que falha hoje: isPercent=true para MULTIPLICATIVE e ADDITIVE identicamente
  expect(asRow?.isMultiplicative).toBe(true);   // FALHA — campo nao existe
  expect(asRow?.isPercent).toBe(false);          // FALHA — retorna true

  // Renderizacao esperada: "x2.71", nao "+171.0%"
  // (testado via slot-compare.tsx snapshot ou via a logica de formatacao extraida)
});

it("powerDelta nao vaza enchants do gear antigo no cenario next", () => {
  // Arcana com um enchant de +100 AttackDamage FLAT
  const psdWithEnchant = buildPsdWithEnchant(arcanaUid, { StatModKey: "X", Tier: 1, Value: 100 });
  const delta = powerDelta(db, heroSave, psdWithEnchant, BOW_SLOT, 313171);
  const deltaNoEnchant = powerDelta(db, heroSave, buildPsdNoEnchant(arcanaUid), BOW_SLOT, 313171);

  // Com bug: delta.next.dps > deltaNoEnchant.next.dps (enchant do Arcana inflating Legendary calc)
  // Esperado: delta.next.dps === deltaNoEnchant.next.dps (enchant removido corretamente)
  expect(delta.next.dps).toBeCloseTo(deltaNoEnchant.next.dps, 0); // FALHA com bug atual
});
```

---

## Questoes Abertas

1. **O Arcana do save real do Joao tem enchants?** Se sim, o delta reportado (+373k DPS) esta inflado pelo enchant leakage — o delta real seria menor, mas ainda positivo para o Legendary por causa do x2.71.
2. **Outros slots equipados do personagem do Joao acrescentam quanto de flat AS?** Com mais flat AS (runes, passivos, outros slots), o x2.71 amplifica mais — o delta cresce com o power level do personagem.
3. **O Legendary 313171 e o unico item com MULTIPLICATIVE AS acima de 150?** Um survey rapido do DB mostra 171 como valor tipico do Lv80 Legendary — nao e um outlier do DB, e a mecanica normal do tier.
