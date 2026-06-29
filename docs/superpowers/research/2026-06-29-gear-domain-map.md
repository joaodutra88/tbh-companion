# Mapa do domínio — Gear (fase 4b-ii)

> Pesquisa consolidada pra fundamentar a spec do comparador de equipamento.
> Repos: `tbh-companion` (destino) e `tbh-copilot` (original HTML/JS).
> Tudo READ-ONLY. Save nunca sai do browser. Caminhos sempre absolutos onde relevante.

**TL;DR:** o engine portado já tem TODA a lógica de gear pronta e tipada
(`rec.gear`, `powerDelta`, `enchant`, `ap`, `gearProgression`, `synthesis`,
`dropStages`, `favFarm`). A fase 4b-ii é majoritariamente **UI** + **vendoring de
ícones** + **um helper de nomes**. Nenhuma lógica nova de engine é necessária pro MVP.

---

## (a) Engine de gear — formas e como usar

Tudo exportado pelo barrel `@tbh/engine` (`packages/engine/src/index.ts:7` re-exporta `./gear`).
`recommend()` já roda `gearAdvisor`, `enchantAdvisor`, `apAdvisor`, `gearProgression`,
`synthesisPlan` em todo save (`packages/engine/src/recommend.ts:100,115` + monta as actions
em `recommend.ts:56-60`). Ou seja, **`rec.gear`, `rec.enchant`, `rec.ap`,
`rec.gearProgression`, `rec.synthesis` já chegam prontos na UI** via o contexto de
recomendação — sem chamada extra.

### `gearAdvisor(db, psd, stageLevel?)` → `GearAdvice`  (`gear.ts:45`)
Best-in-slot automático. Itera party × 10 slots, coleta candidatos do inventário com
`gt` igual ao do slot, ignora UniqueIds já equipados em outro herói (`gear.ts:67`),
roda `powerDelta` por candidato e escolhe o de maior `dPower`.

```ts
GearAdvice = ReturnType<typeof gearAdvisor>   // gear.ts:164
{
  slots: SlotResult[],        // todos os 10 slots × N heróis do party
  swaps: SlotResult[],        // só os worth===true  (vira action gear_swap)
  emptyJewelry: SlotResult[], // empty && slot ∈ {AMULET,EARING,RING,BRACER}
}
SlotResult =                  // inline gear.ts:77-85
{
  heroKey: number|string,
  slot: number,               // 0..9
  gearType: string,           // ex "SWORD","HELMET","AMULET"
  current: DecodedItem|null,
  best:   (DecodedItem & { dPower:number })|null,  // null se o equipado já é o melhor
  empty:  boolean,            // slot sem item
  worth:  boolean,            // existe troca com dPower>0
}
DecodedItem =                 // ReturnType<typeof decodeItem>, gear.ts:33-36
{ itemKey, gearType, grade, level, lines: GearStatLine[] }
GearStatLine = [stat:string, modType:string, value:number]   // stats.ts:14
```

`swaps` e `emptyJewelry` **já vêm pré-filtrados** — a UI pode listar direto sem
filtragem adicional.

### `powerDelta(db, heroSave, psd, slot, newGearKey, runeStats?, stageLevel?)` → `PowerDelta`  (`stats.ts:372`)
Função pura/sob-demanda — o coração do comparador manual. Clona o `Contrib` do herói,
remove as stat lines do item atual no slot, adiciona as do candidato, recalcula e
devolve o delta. `newGearKey=null` calcula a perda ao **desequipar** (slot vazio).

```ts
PowerDelta =                  // stats.ts:16-22
{
  base: { dps, ehp, power },  // estado atual do herói
  next: { dps, ehp, power },  // com o candidato no slot
  dPower, dDps, dEhp,         // next - base
}
```

Ideal pra rodar on-select/on-hover de cada card de candidato sem re-rodar o
`gearAdvisor` inteiro. Assinatura recebe `heroSave` (o objeto do herói), não `heroKey` —
pegue via `heroSaveMap(psd)[hk]`. `runeStats` é opcional; se omitido ele recalcula via
`runeContrib` (passe `rec`-cached pra evitar recomputo se for chamar em loop).

### Métrica de poder
`power = sqrt(max(0,effDps) * max(0,ehp))` — média geométrica (`stats.ts:365`).
`effDps` = auto-attack DPS (crit+elem+delivery) + estimativa de skill DPS (com CDR).
`ehp` = MaxHp / multiplicador de mitigação (armor, dodge, block, DR). Por isso uma
peça de tank pode dar `dPower>0` mesmo sem mexer no DPS: sobe o EHP.

### Advisors adjacentes (já em `rec`, não-MVP)
- **`enchantAdvisor`** (`gear.ts:124`) → `rec.enchant`: conta slots de encantamento
  abertos por herói (`gradeSlots[grade].extra − usados`, `gear.ts:144-146`), escolhe a
  stat por role (tank/bruiser/support→`MaxHp`, resto→`AttackDamage`, `gear.ts:131-132`),
  estima ganho. Shape: `{ perHero:[{heroKey,open,stat,mod,perSlot,basePower,estPower,dPower}], totalOpen, affixFactor }`.
  `affixFactor` default 0.25 (`gear.ts:126`).
- **`apAdvisor`** (`gear.ts:94`) → `rec.ap`: melhor nó PASSIVESKILL pra alocar AbilityPoint.
  **Não é gear** — é hero build; manter fora do escopo de Gear.
- **`gearProgression`** (`gear.ts:169`) → `rec.gearProgression`: `{avgItemLevel, frontierLevel, gap, advice}`,
  `advice ∈ {'push_for_drops','on_par'}` (flag binário, `gear.ts:188`).
- **`synthesisPlan`** (`inventory.ts:109`) → `rec.synthesis`: fusão de grades.
- **`dropStages(db, itemKey, psd?)`** (`drops.ts:37`) e **`favFarm(db, psd, favKeys?)`**
  (`drops.ts:59`) **EXISTEM no engine portado** — suportam "onde dropa" e a integração
  com a aba Farm de favoritos (o explorador suspeitou que não tinham sido portados; foram).

---

## (b) Modelo de dados — item / gear / slot / herói / grade + save

### Três tabelas, mesma chave inteira
Join por `ItemKey` (string no DB):

| Tabela | Shape (`types.ts`) | Conteúdo |
|---|---|---|
| `db.items[k]` | `{ gt?, grade?, lvl?, type?, name?, icon? }` (`types.ts:41`) | flavor: tipo, grade, nível, ícone. **`name` NUNCA vem preenchido** (ver Nomes). |
| `db.gear[k]`  | `{ b1?, b2?, inh?:[stat,mod,val][] }` (`types.ts:42`) | stats: valores base b1/b2 + linhas inherentes. |
| `db.gearTypes[gt]` | `{ b1s?, b1m?, b2s?, b2m? }` (`types.ts:43`) | mapeia b1/b2 → (statKey, modType) por tipo. |

Exemplos reais: `items["300001"] = {gt:"SWORD",grade:"COMMON",lvl:1,type:"GEAR",icon:"/game/gear/sword/SWORD_300001.png"}`;
`gear["300001"] = {b1:1,b2:10,inh:[]}`; `gearTypes.SWORD = {b1s:"AttackDamage",b1m:"FLAT",b2s:"AttackSpeed",b2m:"FLAT"}`.

`gearStatLines(db, key)` (`stats.ts:132`) é o decodificador canônico:
empilha `[b1s,b1m,b1]`, `[b2s,b2m,b2]` e todas as `inh[]`.

### ⚠️ Gotcha verificado: `db.gearTypes` tem só **16 entradas**, não 20
São elas: 6 armas (SWORD, BOW, STAFF, SCEPTER, CROSSBOW, AXE), 6 off-hands
(SHIELD, ARROW, ORB, TOME, BOLT, HATCHET) e 4 armaduras (HELMET, ARMOR, GLOVES, BOOTS).
**As 4 joias (AMULET, EARING, RING, BRACER) NÃO existem em `db.gearTypes`**
(`gearTypes.AMULET === undefined`). Consequência: pra joia, `gearStatLines` não empilha
b1/b2 (o `gt` resolve `null`) — **as stats da joia vêm 100% das linhas `inh`**.
A UI do comparador precisa tratar joia como "só inherent stats". (Os ícones de joia
existem normalmente — 20 diretórios no copilot.)

### Slots (índice → gearType)
`PARAMS.SLOT_TYPES = [null, null, HELMET, ARMOR, GLOVES, BOOTS, AMULET, EARING, RING, BRACER]` (`stats.ts:49`).
Slot 0 = `hero.mainW`, slot 1 = `hero.subW` (`gear.ts:38-42`, `slotGearType`).
As 6 classes travam slots 0-1 no par de armas: Knight=SWORD+SHIELD, Ranger=BOW+ARROW,
Sorcerer=STAFF+ORB, Priest=SCEPTER+TOME, Hunter=CROSSBOW+BOLT, Slayer=AXE+HATCHET.
**Slots 2-9 (armadura/joia) são universais** — qualquer classe equipa. Implicação pro
comparador: comparar armas só dentro do mesmo `gt`; armadura/joia pode comparar livre
entre heróis.

### Grades e enchant slots
`db.grades = [COMMON, UNCOMMON, RARE, LEGENDARY, IMMORTAL, ARCANA, BEYOND, CELESTIAL, DIVINE, COSMIC]`
(ordem = tier crescente, `types.ts:65`).
`db.gradeSlots[grade]` tem shape **mais rico** que o tipo do engine declara — real:
`{inherent, deco, engr, inscr, extra}`. O engine só tipa `{extra}` (`types.ts:62`) e o
`enchantAdvisor` usa `.extra` como total de slots de encantamento:

| grade | extra (enchant slots) |
|---|---|
| COMMON / UNCOMMON | 0 |
| RARE | 1 |
| LEGENDARY | 2 |
| IMMORTAL | 3 |
| ARCANA | 4 |
| BEYOND | 5 |
| CELESTIAL / DIVINE / COSMIC | 6 |

### Save (double-encoded)
Arquivo externo `{ playerSaveData: "<json-escapado>" }`; `parseSave()` desencapa.
Estrutura interna (`types.ts:2-34`):
- `heroSaveDatas[i].equippedItemIds[0..9]` = UniqueId (0 = vazio) — 10 slots mapeados aos gearTypes.
- `itemSaveDatas[i]` = `{ UniqueId, ItemKey, EnchantData[], EnchantCount, IsBlocked, IsChaotic }` — lista mestre de instâncias.
- `inventorySaveDatas` / `stashSaveDatas` / `tradingStashSaveDatas` = grids de armazenamento (`StorageSlot`).
- **`EnchantData`** = `[{ StatModKey?, Tier?, Value? }]`; resolve via `db.statMods["${StatModKey}:${Tier}"] = {st, mt}` (`stats.ts:164-169`). No save demo está tudo zerado (nenhum item encantado). A UI deve mostrar só entradas com `StatModKey` não-nulo.

Cadeia de resolução: `equippedItemIds[slot]` → UniqueId → `itemSaveMap(psd)[uid]` → `.ItemKey`
→ `db.items[ItemKey]` + `db.gear[ItemKey]`. Helpers prontos: `heroSaveMap`, `itemSaveMap` (em `stats.ts`).

---

## (c) Ícones — existem? de onde?

**Sim, 100% disponível localmente.** Vendoring direto do copilot, mesmo padrão já usado
pra heroes/runes no companion.

- **Fonte:** `C:\Users\joao\Documents\01-projetos-2026\tbh-copilot\assets\game\gear\**`
  (20 subpastas por tipo — inclui joias — **396 PNGs**) e `...\assets\game\items\**`
  (materials: 118, boxes: 3 — **121 PNGs**). Total **517 PNGs**, pixel art, todos pequenos.
- **Destino:** `apps\web\public\game\gear\<tipo>\` e `apps\web\public\game\items\{materials,boxes}\`.
  O companion já tem `public/game/heroes/portraits/` e `public/game/runes/`; gear+items **ainda não** foram copiados.
- **Path no DB:** `db.items[k].icon` = URL web-root-relativa (ex `/game/gear/sword/SWORD_300001.png`),
  mapeia direto pra `public/game/...` no Next. Nomenclatura `TIPO_NNNNNN.png` (gear) / `Item_NNNNNN.png` (items).
- **Helper a criar:** ainda **não existe** um `itemIcon()` no companion (só `heroIcon` em
  `format.ts:89`). Adicionar `itemIcon(k, db) => db.items[String(k)]?.icon ?? ""`,
  espelhando `heroIcon`. Renderizar `<img onError=hide>` como já é feito pras runas
  (`rune-detail.tsx:72`, `runes-pane.tsx:119-129`).
- **Atenção visual:** variantes de grade superior **reusam o mesmo PNG** da COMMON do
  mesmo tier de nível (ex IMMORTAL lvl1 = `SWORD_300001.png`, igual COMMON lvl1). Não há
  sprite único por grade → a UI **tem que diferenciar grade por cor/overlay/badge**, não pelo ícone.

---

## (d) UI do copilot original (`tbh-copilot/dashboard.html`)

Aba "GEAR" (`tab id='whatif'`, `pane-whatif`) = comparador interativo **por herói → slot**:

1. **Hero picker** (`#wfHeroBar`): avatares clicáveis; não-owned aparecem locked/cinza.
   Clicar muda `wfHero` e reseta `wfSlot`.
2. **Level-cap slider** (`#gearLvlRange`): "up to level X" (default = nível do herói),
   filtra candidatos do DB por `idb.lvl <= gearCap`.
3. **Slot grid** (`#wfSlots`): 10 células (main/sub weapon + 8 armadura/joia). Cada célula =
   ícone do equipado + nível no canto; vazia = borda tracejada; selecionada = borda dourada.
4. **Candidate list** (`#wfCands`, só após selecionar slot): ordenada por ΔPOWER desc.
   Owned primeiro, depois itens do DB não-possuídos (até 24, máx 10 não-owned). Cada card:
   ícone 34×34, nome+grade, pills (EQUIPPED / BEST / DON'T HAVE / HAVE), linha
   "Lv.X · ΔDPS ±N · ΔEHP ±N", drop location, link Steam Market, estrela de favorito, e o
   **ΔPOWER grande à direita** (verde+ / vermelho− / cinza zero). Engine: `ENG.powerDelta(heroSave, PSD, slot, itemKey)`.
5. **Painéis inferiores:** Progression (`renderGearProg`, consome `rec.gearProgression`) e
   Synthesis (`renderSynth`, consome `rec.synthesis`, só informacional — sem UI de escolha).
6. **Extras:** sell-only toggle (só grades tradeable), preços do Steam Market (`loadGearPrices`,
   CORS proxies + cache localStorage 6h), favoritos (`favGear` Set → integra com aba Farm via `favFarm`).

Na **Overview** (não na aba gear): actions `gear_swap` / `gear_jewelry` / `gear_enchant` /
`synthesis` no "DO NOW", e fileira de ícones 20×20 do gear equipado por herói (`.rgear`, só visual).
No companion isso já está parcialmente refletido: `do-now.tsx:43-46` já tem ícones pra
`gear_swap`/`gear_enchant`/`gear_jewelry`/`synthesis`, e `recommend.ts:56-60` já emite essas actions.

Lógica que o copilot **nunca** transformou em painel dedicado (só virou action): `enchantAdvisor` e `apAdvisor`.

---

## (e) Escopo recomendado

### MVP — comparador por herói/slot com ΔPOWER
Núcleo, 100% suportado pelo engine atual (zero lógica nova):

1. **Aba Gear** — destravar em `app-shell.tsx:20` (`disabled:true → false`) e criar `GearPane`,
   wirando pelo `activeTab` (mesmo padrão de `runes-pane.tsx`).
2. **Hero picker** — reusar resolução de `heroIcon`/`heroName` (`format.ts:82,89`); party de `rec.meta.party`.
3. **Slot grid 10 células** — `rec.gear.slots` filtrado pelo herói; ícone do `current` + nível;
   vazio/selecionado por borda. Joia só inherent (ver gotcha 16-gearTypes).
4. **Candidate list por slot** — ordenada por ΔPOWER desc, com pills EQUIPPED/BEST/HAVE/DON'T-HAVE.
   Owned via `psd.itemSaveDatas` (filtrar por `gt`); ΔPOWER do `best` já vem em `rec.gear.slots[].best.dPower`,
   e pra candidatos manuais/DB chamar `powerDelta(db, heroSave, psd, slot, itemKey)`.
5. **ΔDPS e ΔEHP** como dados secundários por card (engine já retorna `dDps`/`dEhp` — só renderizar).
6. **Vendoring de 517 ícones** + helper `itemIcon()` + import de `gearNames` pra nome (ver Riscos).
7. **Diferenciação de grade por cor/badge** (ícone não distingue grade).

### DEFERIDO (engine já pronto, mas fora do MVP)
- **Synthesis** (`rec.synthesis`) — painel informacional; baixo esforço, mas não é o comparador.
- **Enchant advisor** (`rec.enchant`) — nunca virou painel nem no copilot; `totalOpen` serve de badge.
- **AP advisor** (`rec.ap`) — **não é gear** (hero build); manter noutra aba.
- **Drops** (`dropStages`) + **favoritos/favFarm** — engine pronto (`drops.ts:37,59`); tier-1 avançado.
- **Progression panel** (`rec.gearProgression`) — tier-2, fácil mas secundário.
- **Steam Market** — backend **já existe no companion** (`/api/items`, `/api/price`,
  `/api/orderbook` + `lib/steam/`, runtime node, region gru1). Mais barato de plugar do que
  o copilot sugeria (lá era CORS-proxy frágil no browser). Ainda assim, fora do MVP por
  exigir matching nome-do-item ↔ market hash name.
- **Level-cap slider** — filtro de candidatos do DB por nível; só faz sentido junto da listagem de itens não-possuídos.

---

## (f) Riscos e perguntas em aberto

**Riscos / gotchas confirmados:**
1. **Nomes de gear são English-only e separados do DB.** `db.items[k].name` nunca vem
   preenchido (verificado: `false` em todos os 5944 itens). Nome do gear vem de
   `gearNames` (export de `@tbh/game-data`, `itemKey→"Long Sword"`, 5760 entradas, **só EN**).
   Materiais têm i18n completo em `itemNames` (174 entradas, locale map). Implicação: o
   seletor de locale de entidades (`entity-locale.tsx`) **não localiza nomes de gear** —
   sempre inglês. Decidir se isso é aceitável ou se mostra fallback tipo `"Long Sword (#300001)"`.
2. **16 gearTypes, joia sem base stats** (ver seção b). Não tratar joia como arma/armadura
   ou as stats somem.
3. **Grade não tem ícone próprio** — precisa de sistema de cor/badge por grade.
4. **`gradeSlots` shape diverge do tipo do engine** (`{inherent,deco,engr,inscr,extra}` real
   vs `{extra}` tipado). Usar só `.extra`; não confiar no tipo pra outros campos sem checar o JSON.

**Perguntas em aberto (decidir na spec):**
- Layout: **por herói** (um herói, grid 10 slots — abordagem do copilot, mais simples) ou
  **por slot** (todos heróis em paralelo, tabela)? Recomendo seguir o copilot (por herói→slot).
- Picker de candidato manual: o MVP precisa permitir o usuário escolher um item arbitrário
  do DB (acionando `powerDelta` ad-hoc) ou basta mostrar o best-in-slot + itens owned do `gearAdvisor`?
- Vendorizar os 517 ícones de uma vez (gear+items) ou só os de gear (396) no MVP, deixando
  materials/boxes (121) pra quando a aba Research existir?
- Steam Market: plugar já no MVP (backend existe) ou deixar deferido pelo custo de
  matching nome↔market-hash? Os 65 ícones de skills do copilot são irrelevantes pra esta fase.
- Nível exibido por slot: o ícone é fixo por item; o nível vem de `db.items[k].lvl` (decodeItem já traz `level`).
