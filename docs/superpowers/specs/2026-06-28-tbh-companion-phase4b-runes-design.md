# TBH Companion — Fase 4b-i: Runas (árvore interativa) — Design Spec

- **Data:** 2026-06-28 · Status: aprovado em bloco (autônomo). Fase 4b parte 1 (Runas); parte 2 = Gear.
- Depende de: Fases 1-4a.1 (engine, UI, Farm/Chests, auto-cal) — na main, deployadas.

## Objetivo
Aba **Runas**: a **árvore interativa de 197 nós** (SVG, pan/zoom/fit, nós coloridos por status, arestas, filtro por categoria, caminho de DPS destacado, slider de orçamento) + painéis laterais (runas recomendadas mais baratas + plano de gasto/ROI). É a aba mais interativa do app.

**Sem mudança no engine** — tudo vem do `recommend()`: `rec.runeTree` (`{ nodes:{[key]:{x,y,cat,level,status,max,name,cost,st,value,dPower,affordable,onDpsPath,important,farmSeconds}}, bounds:{minX,maxX,minY,maxY}, edges:[[from,to]], firstDpsPath }`), `rec.runes` (RunePlan: `almostFree[]`, `combat[]`, `all[]`, `afThreshold`, `gold`, `firstDpsPath`), `rec.runeROI` (ordenado por `perGold`), `rec.goldPlan` (`{ cart[], totalCost, totalPower, gold }`).

**Não-objetivos:** Gear (4b-ii); mexer no engine.

## Dados confirmados
- 197 nós, 195 arestas. Categorias (`cat`): `combat`(20) `gold`(26) `qol`(33) `exp`(25) `loot`(82) `offline`(11). Bounds `[-864,1512] × [-648,432]` (w≈2376, h≈1080). Status: `maxed | owned | locked | skip | recommended | almostfree | available`.

## Decisões (recomendados)
- **Cor do nó = STATUS** (a info acionável): `recommended`→ouro cheio; `almostfree`→anel ouro; `owned`→teal; `maxed`→teal-dim/✓; `available`→neutro (surface-2/line); `locked`→dim baixa-opacidade; `skip`→coral-dim. `important` (combat AD/AS) → leve glow.
- **Categoria = filtro** (highlight): chips de legenda por categoria (com contagem); selecionar uma destaca os nós dela e esmaece o resto. "Todas" reseta.
- **Caminho de DPS:** `firstDpsPath` (nós em `onDpsPath`) com contorno especial + arestas do caminho realçadas.
- **Slider de orçamento** ("habilitar até X gold"): filtro CLIENT-side — destaca nós com `cost ≤ X` (default = gold atual `rec.runes.gold`). Sem re-rodar engine.
- **Pan/zoom/fit:** viewBox do `bounds`; controles + / − / fit; arrastar pra pan; scroll pra zoom. `prefers-reduced-motion` respeitado.
- **Detalhe (hover/click):** painel com nome, categoria, status, nível/max, custo, stat (`st`+`value`), ΔPOWER (`dPower`), tempo de farm (`farmSeconds`, `fmtDur`).
- Design war-table (tokens Tailwind), PT-BR, mono nos números, TS strict zero `any`.

## Arquitetura (apps/web/components/runes/)
```
runes-pane.tsx        # orquestra: árvore + legenda/filtro + slider + detalhe + painéis
rune-tree.tsx         # SVG: viewBox(bounds), <line> edges, <circle/g> nodes por status; pan/zoom/fit
rune-node.tsx         # (ou inline) um nó: cor por status, ring almostfree, glow important, dps outline
rune-detail.tsx       # painel de detalhe do nó selecionado/hover
rune-legend.tsx       # chips de categoria (filtro) + legenda de status + slider de orçamento
rune-panels.tsx       # recomendadas (almostFree + ROI combat) + plano de gasto (goldPlan)
```
Montar no `page.tsx` quando `tab==='runas'` (a aba "Runas" deixa de ser "em breve"; habilitar na nav igual Farm/Baús).

## Componentes
- **RuneTree (SVG):** `<svg viewBox={`${minX} ${minY} ${w} ${h}`}>` com um `<g>` transformado por pan/zoom. Arestas: `edges.map(([a,b]) => <line>)` entre `nodes[a]`/`nodes[b]` positions (dim; realçar as do dps-path). Nós: `<g transform=translate(x,y)>` com `<circle>` colorido por status + (almostfree) anel + (important) glow + (onDpsPath) contorno. Hover/click → seleção. Pan (drag), zoom (scroll/botões), fit (ajusta ao bounds). Teclado: nós focáveis? (custoso p/ 197 — pelo menos os controles + os nós recomendados acessíveis; documentar limitação).
- **RuneLegend:** chips das 6 categorias (com contagem) p/ filtrar + legenda de status (cores) + slider de orçamento (0..maxCost, default = gold) com label do valor.
- **RuneDetail:** dado o nó selecionado, mostra os campos (acima). Vazio → dica "passe o mouse / clique num nó".
- **RunePanels:** "Recomendadas" = `rec.runes.almostFree` (mais baratas) + top de `rec.runeROI` (combat por `perGold`, com ΔPOWER/gold). "Plano de gasto" = `rec.goldPlan` (cart de runas dentro do orçamento + `totalCost` + `totalPower`). Caminho de DPS: `rec.runes.firstDpsPath` (custo total + alvo).

## Fluxo
```
useRecommendation() → rec.runeTree/runes/runeROI/goldPlan + db
  → RuneTree desenha (status colors, edges, dps-path) ; Legend filtra (categoria/orçamento) ; Detail mostra nó ; Panels listam recomendadas + plano
```
Tudo client-side; sem rede.

## Testes
- jsdom smoke: RunesPane com demo rec → renderiza um `<svg>` com N `<circle>` (≈197) e ≥1 aresta; RunePanels mostra ≥1 runa recomendada; clicar/hover num nó popula o detalhe (ou via prop).
- pure: helper de cor-por-status (`statusColor(status)`) testado; helper de fit/viewBox se extraído.
- typecheck/build verdes; zero `any`.

## Critérios de sucesso
- [ ] Aba Runas navegável; árvore com 197 nós + arestas, coloridos por status; pan/zoom/fit funcionam.
- [ ] Filtro de categoria destaca/esmaece; slider de orçamento filtra por custo; caminho de DPS destacado.
- [ ] Hover/click num nó → detalhe (custo/stat/ΔPOWER/farm time); painéis de recomendadas + plano de gasto.
- [ ] `pnpm -F web test` + typecheck + build + CI verdes; zero `any`; war-table.

## Riscos
| Risco | Mitigação |
|---|---|
| 197 nós + pan/zoom = perf/complexidade | SVG puro (não canvas) aguenta 197 nós; memoizar; evitar re-render por hover (usar estado local/CSS) |
| Coordenadas/escala (bounds negativos) | viewBox com minX/minY negativos + w/h; testar fit |
| a11y de 197 nós | controles + recomendadas acessíveis; documentar que a navegação por teclado da árvore inteira é limitada (polish F6) |
| screenshot via automação estala (gamedata chunk) | verificar via tests + read_page, não screenshot |
