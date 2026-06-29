# TBH Companion — Fase 4b-i.1: Clareza de combate — Design Spec

- **Data:** 2026-06-29 · Status: aprovado em bloco (autônomo, João: "pode fazer nesse escopo mesmo, qlqr coisa eu adiciono dps").
- Depende de: Fases 1-4b-i (engine, UI core, Farm/Baús/Runas) — na main, deployadas.
- Origem: review interativo com o João sobre o app ao vivo. Dois achados dele, mesma raiz.

## Raiz do problema
**O engine calcula a resposta certa, mas a tela esconde o contexto que o jogador precisa pra agir.**
Ou o dado foi derrubado no port (ícones de runa, dificuldade), ou a resposta acionável existe mas fica ilegível (qual runa / qual dificuldade). Esta sub-fase fecha esse gap nas abas vivas. **Sem mudar a lógica do engine** — só reexpor dados já existentes + UI.

## Objetivo (4 itens)
1. **Dificuldade visível em todo lugar** — o jogo tem 4 dificuldades (NORMAL, NIGHTMARE, HELL, TORMENT; 27 fases cada → cada label, ex. "3-9", se repete 4×). `db.stages[k].diff` e `FarmRow.diff` já carregam o dado, mas **nenhuma tela mostra**. Surfacing em: card recomendado, "deixa rolando"/"estaciona offline", tabela de stages, **os dois seletores da calibração** (primário + 2º), e Baús "melhor stage". Grave porque escolher a "3-9" errada na calibração injeta HP/waves errados → calibra com lixo.
2. **Runas — ícones** — 43→39 PNGs já vendorizados em `apps/web/public/game/runes/`; cada nó já tem `icon` no `gamedata.json` (`runeNodes[k].icon = "/game/runes/<statKey>.png"`), mas a tipagem (`types.ts:50` = `{x,y,cat}`) e o `runeTreeStatus()` (`runes.ts`) largaram o campo. Reexpor + desenhar no nó (imagem clipada no círculo + anel de status por cima, igual o copilot original).
3. **Runas — clareza** — a resposta "qual runa comprar" já existe no `RunePanels` mas fica num cantinho `w-80` ao lado da árvore-canhão. Adicionar um **card largo no topo "Próxima runa recomendada"** (a melhor compra agora) + ícones nas listas/detalhe.
4. **`statLabel()` PT-BR** — `st` cru (ex. `AllHeroAttackDamage`) vira "Dano de ataque de todos os heróis". Usado em rune-detail + rune-panels (e reservado pro Gear).

**Não-objetivos:** Gear (4b-ii, vem depois); mudar a lógica/saída numérica do engine (só ADITIVO: reexpor `icon`); mexer em Overview/Baús além do `<StageName>`.

## Dados confirmados
- **Dificuldades:** `NORMAL`, `NIGHTMARE`, `HELL`, `TORMENT` (string em `db.stages[k].diff` e `FarmRow.diff`). PT-BR: Normal / Pesadelo / Inferno / Tormento. Ordem de tier crescente; cor escalando (Normal neutro → Tormento coral/perigo) dentro da paleta war-table (não inventar cores novas: usar dim/text/gold/coral).
- **Ícone de runa:** path determinístico `/game/runes/<statKey>.png`. O dado bruto `runeNodes[k]` já tem `icon`. Original (`dashboard.html`) desenhava `<image href x=1 y=1 w=30 h=30>` clipado num círculo r≈17 + anel colorido por status + nº de nível por cima.
- **Stat keys** (os 39 nomes dos PNGs): `AllHeroAttackDamage`, `AllHeroAttackDamagePercent`, `AllHeroArmor`, `AllHeroAttackSpeed`, `AllHeroMoveSpeed`, `AdditionalGold/Exp[*]`, `IncreaseGoldAmount`, `IncreaseExpAmount`, `DropChance*Chest`, `MaxAmount*Chest`, `ReduceAutoOpen*ChestTime`, `UnlockAutoOpen*Chest`, `UnlockOfflineReward`, `OfflineReward(Gold|Exp)Percent`, `Cube*`, `MaxInventorySlot`, `Unlock(Skill|ArrangeSlot|StashPage)*`, `WaveCountReduction`, `OpenAllTypeChestAllAtOnce`, `OpenOneTypeChestAllAtOnce` (lista completa = nomes dos arquivos em `public/game/runes/`).

## Decisões (recomendados)
- **`<StageName>` reutilizável** (apps/web): dado uma stage (key+db, ou label/diff/lvl), renderiza `<selo de dificuldade> <label> <nv X>`. Selo = chip compacto com nome PT-BR da dificuldade + cor por tier. Variante só-texto pra `<option>` do `<select>` (ex. `"Tormento · 3-9 (nv 95)"`).
- **Ícone no nó** (rune-tree): `<image>` 28–30px clipado no círculo (`clipPath`), com os anéis de status/dps/almostfree/important POR CIMA. `onError` → fallback pro círculo colorido atual (não quebrar se faltar PNG). Manter perf (React.memo, hover CSS).
- **"Próxima runa recomendada"** (RunesPane topo): pega a melhor compra agora — prioridade: 1º item do `goldPlan.cart` (cabe no gold), senão top `runeROI` (combate), senão `almostFree`. Card largo: ícone + nome + efeito (statLabel) + custo + ΔPOWER + botão "ver na árvore" (`onSelect`). Mesmo padrão visual do CoachCard do Overview.
- **Calibração:** seletor 2º stage mais largo (não `w-20`), `<option>` com dificuldade+label+nv via a variante texto; rótulo do stage primário também com `<StageName>`.
- War-table (tokens Tailwind), PT-BR, mono nos números, TS strict zero `any`. Oráculo do engine (106 asserts) tem que continuar verde.

## Arquitetura
```
apps/web/lib/stage-format.ts      # DIFF_LABEL/DIFF_ORDER/DIFF_TONE + stageOptionText() (puro, testável)
apps/web/components/stage-name.tsx # <StageName> (selo dificuldade + label + nv) + variante compacta
apps/web/lib/stat-labels.ts       # statLabel(key): PT-BR (puro, testável)
packages/engine/src/types.ts      # runeNodes ganha icon?: string ; RuneTreeNode ganha icon?: string
packages/engine/src/runes.ts      # runeTreeStatus(): base node passa icon: pos.icon
apps/web/components/runes/rune-tree.tsx     # <image> no nó
apps/web/components/runes/runes-pane.tsx    # card "Próxima runa recomendada"
apps/web/components/runes/rune-panels.tsx + rune-detail.tsx # ícone + statLabel
apps/web/components/farm/{farm-pane,stage-table,calibration}.tsx # <StageName>
apps/web/components/chests/chests-pane.tsx  # <StageName> no "melhor stage"
```

## Testes
- pure: `stageOptionText()` inclui a dificuldade PT-BR; `statLabel()` mapeia keys conhecidas e faz fallback gracioso; oráculo do engine 106 asserts verde (icon é aditivo).
- jsdom smoke: `<StageName>` mostra o selo de dificuldade; opção do `<select>` da calibração contém o texto da dificuldade; nó da runa renderiza um `<image>`; card "Próxima runa recomendada" aparece com nome/custo quando há recomendação.
- typecheck + build + CI verdes; zero `any`.

## Critérios de sucesso
- [ ] Toda fase nomeada no app mostra a dificuldade (cards Farm, tabela, **ambos seletores da calibração**, Baús).
- [ ] Nós da árvore de runas mostram o ícone da runa (fallback gracioso); recomendação "qual comprar" lidera a aba.
- [ ] Stat keys aparecem em PT-BR legível.
- [ ] `pnpm -F web test` + engine oráculo + typecheck + build + CI verdes; zero `any`; war-table.

## Riscos
| Risco | Mitigação |
|---|---|
| Mudar engine quebra o oráculo | `icon` é aditivo (campo opcional); rodar o oráculo (106) antes de mergear |
| PNG de runa faltando p/ alguma stat | `<image onError>` → fallback pro círculo atual; nunca quebra o nó |
| Cor de dificuldade fugindo da paleta | usar só tokens existentes (dim/text/gold/coral) escalando por tier |
| `<image>` em 197 nós = perf | mesma estrutura memoizada/React.memo já existente; imagem é estática |
| screenshot via automação estala (gamedata chunk) | verificar via tests + read_page, não screenshot |
