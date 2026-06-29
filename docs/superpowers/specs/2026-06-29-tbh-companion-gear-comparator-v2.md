# TBH Companion — Gear Comparador v2 (métrica + stats + explicação + upgrades óbvios) — Design Spec

- **Data:** 2026-06-29 · Status: aprovado em bloco (autônomo — pedidos diretos do João, 4 mensagens).
- Depende de: Fase 4b-ii Gear (mergeada `9d7e3cb`, deployada). Estende `components/gear/{slot-compare,slot-grid,gear-pane}.tsx`.

## Objetivo (consolidação de 4 pedidos do João)
Tornar o comparador de slot **escolhível por métrica, completo na identidade do item, e explicado** — pra o jogador decidir trocar com confiança:
1. **Seletor de métrica** — Poder / DPS / Defesa(sustain). Ex.: "nessa luva quero dano" → ranquear/destacar por DPS.
2. **Identidade completa do item** — nome + **cor de raridade do JOGO** + nível + **os stats do gear**.
3. **Explicar a troca** — destacar (negrito/cor) o stat que move a métrica escolhida + frase plain ("+X DPS via +ataque, −Y EHP via −armadura").
4. **Upgrades óbvios** — marcar visualmente QUAIS slots têm upgrade (não só o contador "X upgrades"), com indicador chamativo, pro cara decidir.

**Sem mudar o engine** (consome `rec.gear`/`powerDelta`/`gearStatLines` já existentes).

## Fatos confirmados (escotados)
- **`powerDelta(...)` → `{ base, next, dPower, dDps, dEhp }`** (stats.ts:16-22) — os 3 deltas por candidato já vêm prontos (em `scoreOwnedCandidates(...).delta`). Métrica = só escolher qual delta dirige ranking/destaque.
- **`gearStatLines(db, key): [stat, modType, value][]`** (stats.ts:132) — decodifica b1/b2 (de `gearTypes`) + linhas `inh`. Para rotular o `stat` → reusar `statLabel` (`lib/stat-labels.ts`, com humanize fallback). `modType` (mt) = `FLAT`/`ADDITIVE`(percent) → exibir flat vs "%".
- **Cores de raridade (do jogo, `GRADE_COL` em copilot dashboard.html:1174):** COMMON `#9aa7c2` · UNCOMMON `#74d28e` · RARE `#5fd0e0` · LEGENDARY `#f6c552` · IMMORTAL `#ff8a5c` · ARCANA `#a98cff` · BEYOND `#ff6fae` · CELESTIAL `#6fe0d0` · DIVINE `#ffd76a` · COSMIC `#ff5fae`. (Exceção justificada a "só tokens war-table": cor de raridade é dado do jogo — o João pediu "exatamente a mesma cor".)
- **Stats que movem cada métrica** (stats.ts:63-79, 200-267): **DPS** ← AttackDamage, AttackSpeed, CriticalChance, CriticalDamage. **Defesa(EHP)** ← MaxHp, Armor. **Poder** = média geométrica `sqrt(effDps*ehp)` (ambos). O mapa `[target, modType]` (stats.ts:74) liga as stat keys de gear (AllHeroAttackDamage→AttackDamage etc.) ao target → usar pra decidir qual stat line "conta" pra métrica escolhida (destaque).
- **`rec.gear.swaps`** = lista de swaps recomendados (heroKey+slot) → fonte do "upgrade neste slot".

## Decisões (recomendados)
- **Métrica:** 3 botões (Poder/DPS/Defesa), estado no `GearPane` (compartilhado com o grid). A métrica dirige: ranking dos candidatos owned (por `delta.dPower|dDps|dEhp`), qual leva o pill **MELHOR**, e o número-título. **Sempre mostrar os 3 deltas**, com o escolhido enfatizado.
- **Item completo:** cada item (atual/best/candidato) mostra ícone + nome + **selo de raridade na cor do jogo** + nível + **stats** (`gearStatRows`). Stats que movem a métrica escolhida vêm **destacados** (negrito + teal); os demais normais.
- **Explicação:** abaixo do best/candidato comparado, uma frase derivada dos deltas+diff ("Troca: +X DPS (mais ataque), −Y EHP (menos armadura)"). Cor: ganho=teal, perda=coral.
- **Upgrades óbvios (slot-grid/gear-pane):** célula de slot com upgrade (em `rec.gear.swaps`) ganha um **badge chamativo "↑ upgrade"** (teal) + realce de borda; o header "X upgrades" vira clicável/explicado (lista os slots, ou ao menos eles brilham no grid). Pro cara ver de relance ONDE trocar.
- War-table (exceto as cores de raridade), PT-BR na UI (nomes de gear EN), mono nos números, TS strict zero `any`. Engine intocado.

## Não-objetivos (DEFERIDOS — "deixa pro final", pedido do João)
- **Polês & beleza v2** (fase final): linhas fracas da árvore de runas (reforçar stroke), bolinha→quadrado nos nós de runa (opcional), e a beautificação geral ("deixar mais da hora/bonito"). Anotado pra a fase de polimento final.
- Gear avançado (synthesis/enchant/ap/drops), Fase 5 Mercado, Fase 6.

## Arquitetura (apps/web)
```
lib/item-format.ts                 # + rarityStyle(grade) (cores do jogo) [estende o gradeStyle]
lib/gear-stats.ts                  # gearStatRows(db,key) (rotulado) + GEAR_METRICS + metricStatTargets (puro, +test)
components/gear/slot-compare.tsx    # seletor de métrica + stats do item + destaque + explicação
components/gear/slot-grid.tsx       # badge "↑ upgrade" + realce nos slots com swap
components/gear/gear-pane.tsx       # estado da métrica (compartilhado) + header de upgrades explicado
```

## Testes
- pure: `gearStatRows` rotula as linhas de um gear real (+ percent/flat); `rarityStyle` cobre as 10 grades com a cor certa; `GEAR_METRICS`/`metricStatTargets` mapeiam (DPS↔attack, Defesa↔armor/hp).
- jsdom smoke: trocar a métrica re-ranqueia/re-destaca; um item mostra seus stats com a cor de raridade; o stat da métrica aparece destacado; a frase de explicação renderiza; um slot com swap mostra o badge "↑ upgrade".
- typecheck + build + CI verdes; engine intocado; zero `any`; não quebrar os 194 testes.

## Critérios de sucesso
- [ ] Seletor Poder/DPS/Defesa dirige ranking + MELHOR + número-título; 3 deltas sempre visíveis.
- [ ] Cada item mostra raridade (cor do jogo) + nível + stats; stat da métrica destacado.
- [ ] Frase explicando a troca (ganho/perda) por métrica.
- [ ] Slots com upgrade marcados de forma chamativa no grid; "X upgrades" explicado.
- [ ] `pnpm -F web test` + typecheck + build + CI verdes; engine intocado.

## Riscos
| Risco | Mitigação |
|---|---|
| Mapear stat line → métrica (qual conta pra DPS/Defesa) | usar o mapa `[target]` do engine (stats.ts:74) + os targets de effDps/ehp; testar |
| Cor de raridade fora da paleta war-table | exceção justificada (dado do jogo, pedido explícito); isolar num `rarityStyle` (CSS color), não espalhar |
| statLabel não cobrir todas as stat keys de gear | humanize fallback já existe; nunca mostra key crua |
| Densidade: stats + 3 métricas podem poluir o aside w-80 | hierarquia clara; stats compactos; só o item comparado expande |
| screenshot estala | verificar via tests/build |
