# TBH Companion — Fase 4b-ii: Gear (comparador) — Design Spec

- **Data:** 2026-06-29 · Status: aprovado em bloco (autônomo — João: "pode dale"). MVP; avançado deferido.
- Depende de: Fases 1-4b-i.2 (engine, UI, a11y/shadcn) — na main, deployadas.
- **Fonte:** `docs/superpowers/research/2026-06-29-gear-domain-map.md` (workflow de entendimento, 4 exploradores + síntese Opus).

## Objetivo
Aba **Gear**: comparador de equipamento **por herói → slot**, mostrando o item atual vs o melhor candidato (best-in-slot) e a lista de candidatos que o jogador possui, ranqueada por **ΔPOWER** (com ΔDPS/ΔEHP secundários). **O engine portado JÁ TEM toda a lógica** (`rec.gear`/`powerDelta`/swaps) — esta fase é **UI + vendorizar ícones + helper de nomes; ZERO lógica nova de engine no MVP.**

## Fatos confirmados (do mapa do domínio — file:line lá)
- **Engine pronto:** `recommend()` já computa `rec.gear` = `GearAdvice { slots: SlotResult[], swaps, emptyJewelry }` (gear.ts:164). `SlotResult = { heroKey, slot, gearType, current: DecodedItem|null, best: (DecodedItem & {dPower})|null, empty, worth }`. Comparação sob demanda: **`powerDelta(db, heroSave, psd, slot, newGearKey)` → `{ base, next, dPower, dDps, dEhp }`** (stats.ts:16-22); `newGearKey=null` = perda ao desequipar.
- **Slots:** `PARAMS.SLOT_TYPES = [null,null,HELMET,ARMOR,GLOVES,BOOTS,AMULET,EARING,RING,BRACER]` (stats.ts:49). Slot 0 = `hero.mainW`, slot 1 = `hero.subW` (armas, travadas por classe — comparar só dentro do mesmo gearType). Slots 2-9 (armadura/joia) universais entre heróis.
- **Dados:** `db.items[k] = {gt, grade, lvl, type, name?, icon}` (name **NUNCA** preenchido). `db.gear[k] = {b1,b2,inh}`. `db.gearTypes[gt]` só **16 entradas** (6 armas + 6 off-hands + 4 armaduras) — **joias (AMULET/EARING/RING/BRACER) NÃO existem em gearTypes → stats de joia vêm 100% das linhas `inh`; UI trata joia como só-inherent.**
- **Save (double-encoded):** interno `heroSaveDatas[i].equippedItemIds[0..9]` (UniqueId; 0=vazio) → `itemSaveDatas[i] = {UniqueId, ItemKey, EnchantData, ...}` → `db.items/db.gear`. Resolução: `equippedItemIds[slot] → UniqueId → itemSaveMap[uid].ItemKey`.
- **Ícones:** existem **517 PNGs** em `tbh-copilot/assets/game/{gear,items}/` em **subpastas por tipo** (gear/sword, gear/staff, gear/armor, items/materials...), ~20 por tipo. `db.items[k].icon` = path `/game/...png` (ex. `/game/items/materials/Item_110001.png`; gear = `/game/gear/<tipo>/...png`) → mapeia direto pra `public/game/`. **GOTCHA: grades superiores reusam o MESMO PNG da COMMON do mesmo tier de nível → o ícone NÃO distingue grade; diferenciar grade por cor/badge/overlay.**
- **Nomes:** EN-only via export `gearNames` (`@tbh/game-data`, itemKey→"Long Sword", 5760 entradas). O seletor de entity-locale NÃO localiza nomes de gear (aceitável — decisão de nomes já é inglês).
- **Métrica:** POWER = média geométrica `sqrt(effDps*ehp)` (stats.ts:365) → peça de tank pode dar `dPower>0` só subindo EHP. Grades crescentes: COMMON, UNCOMMON, RARE, LEGENDARY, IMMORTAL, ARCANA, BEYOND, CELESTIAL, DIVINE, COSMIC (types.ts:65).

## Decisões (recomendados)
- **Layout por herói → slot** (igual aba "whatif" do copilot): hero picker no topo + grid de 10 slots do herói selecionado.
- **Comparador:** ao selecionar um slot → painel com **(a) atual vs best-in-slot** (`rec.gear.slots[].best`) com ΔPOWER/ΔDPS/ΔEHP; **(b) lista de candidatos que o jogador POSSUI** pra aquele slot, ranqueada por `powerDelta` desc, com pills **EQUIPADO / MELHOR / TENHO**; realçar swaps recomendados (`rec.gear.swaps`).
  - Enumerar os candidatos owned = filtrar `itemSaveDatas` por gearType compatível com o slot (puro, em apps/web a partir de psd+db; **sem lógica nova de engine** — só query de dados); `powerDelta` pontua cada um.
- **Ícones:** vendorizar os 517 (gear+items) preservando subpastas → `apps/web/public/game/{gear,items}/`. `itemIcon(k, db)` resolve `db.items[k].icon` (espelha `heroIcon`). **Badge de grade por cor** (`gradeStyle(grade)`) já que o ícone não distingue.
- **Nomes:** `gearName(k)` via `gearNames` (EN); fallback `Item #${k}`.
- War-table, PT-BR na UI (nomes de gear em EN), mono nos números, TS strict zero `any`. Engine intocado.

## Não-objetivos (DEFERIDOS — fora do MVP)
Synthesis (`rec.synthesis`), Enchant advisor (`rec.enchant`), AP advisor (`rec.ap` — é build de herói, não gear), Drop locations (`dropStages`/favFarm), Progression panel (`rec.gearProgression`), Steam Market (backend já existe mas matching nome↔market-hash é custoso), browse do DB inteiro / level-cap slider (itens não-possuídos), i18n de nomes de gear.

## Arquitetura (apps/web)
```
public/game/{gear,items}/**         # 517 PNGs vendorizados (subpastas preservadas)
lib/item-format.ts                  # itemIcon(k,db), gearName(k), gradeStyle(grade) — puros (+test)
components/gear/gear-pane.tsx        # orquestra: hero picker + slot grid + comparador
components/gear/hero-picker.tsx      # (ou inline) party de rec.meta + heroIcon/heroName
components/gear/slot-grid.tsx        # 10 slots do herói: ícone+grade+nv do current; vazio/selecionado
components/gear/slot-compare.tsx     # atual vs best + lista de candidatos owned (powerDelta) + pills
app-shell.tsx                        # destravar aba "Gear" (disabled:false → painel keepMounted automático)
app/page.tsx                         # montar <GearPane> quando activeTab==='gear'
lib/engine-bridge.ts (ou context)    # expor powerDelta + psd/heroSave pro comparador (sem nova lógica)
```

## Testes
- pure: `itemIcon` resolve o path do db; `gearName` mapeia + fallback; `gradeStyle` cobre as 10 grades; helper de candidatos-owned-por-slot (se extraído) com save demo.
- jsdom smoke: aba Gear navegável; hero picker troca herói; slot grid mostra 10 slots com o item atual; selecionar um slot abre o comparador com ΔPOWER; um candidato owned aparece ranqueado.
- typecheck + build + CI verdes; zero `any`; **oráculo do engine continua verde** (engine intocado); não quebrar os 150 testes.

## Critérios de sucesso
- [ ] Aba Gear destravada e navegável; hero picker + grid de 10 slots com item atual (ícone+grade+nv); joia tratada como só-inherent.
- [ ] Selecionar slot → atual vs best-in-slot (ΔPOWER/ΔDPS/ΔEHP) + lista de candidatos owned ranqueada por `powerDelta` com pills EQUIPADO/MELHOR/TENHO; swaps realçados.
- [ ] 517 ícones vendorizados + `itemIcon`/`gearName`/`gradeStyle`; grade por cor/badge.
- [ ] `pnpm -F web test` + typecheck + build + CI verdes; engine intocado; zero `any`; war-table.

## Riscos
| Risco | Mitigação |
|---|---|
| Resolver gear equipado do save (double-encoded, equippedItemIds→UniqueId→ItemKey) | o engine JÁ decodifica (rec.gear.slots[].current vem pronto); usar isso, não re-decodificar |
| Enumerar candidatos owned por slot sem lógica nova de engine | query pura em apps/web (filtrar itemSaveDatas por gearType do slot) + powerDelta; se ficar complexo, helper puro isolado e testado |
| 517 ícones incham o repo | PNGs pequenos (~0,5KB cada, ~260KB total como runas); aceitável; preservar subpastas |
| Grade não distinguível pelo ícone | `gradeStyle` (cor/badge/overlay) por grade; testar as 10 |
| Joias sem gearType | tratar como só-inherent (sem b1/b2); o engine já lida — UI só não assume gearType |
| Nomes EN-only | aceitável (decisão de nomes = inglês); fallback `Item #k` |
| screenshot estala (gamedata chunk) | verificar via tests/build, não screenshot |
