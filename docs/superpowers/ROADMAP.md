# TBH Companion — ROADMAP mestre

> Consolidação de TODO o trabalho (pedido do João: "adiciona todas as tasks, coloca essas como fazer agora, depois a gente mexe no que faltou e nas próximas abas").
> Cada fase futura ganha seu **spec + plano detalhado** (`docs/superpowers/`) ao começar e roda **subagent-driven** (implementer+review por task → review final Opus → merge `--no-ff` → push → deploy). Atualizado: 2026-06-29.

## Princípios fixos
- Web-only, grátis, **save nunca sai do browser**; UI PT-BR, **nomes do jogo em inglês + seletor de 16 idiomas**.
- TS strict zero `any`; war-table tokens (exceto cores de raridade = dado do jogo); engine só muda quando necessário (oráculo 106 verde).
- Ritmo por fase: spec→plano→subagent-driven→review final→merge→deploy. Ledger em `.superpowers/sdd/progress.md`.

---

## ✅ JÁ ENTREGUE & DEPLOYADO (live: https://tbh-companion-web.vercel.app)
- **Fundação** (engine portado JS→TS, oráculo 106; monorepo; save decrypt/watch) · **Backend de mercado** (proxy Steam `/api/{items,price,orderbook}` + `lib/steam`) · **UI core** (war-table, abas).
- **Fase 4a/4a.1** Farm (melhor stage, calibração, auto-cal live, idle) + Baús.
- **Fase 4b-i.1 Clareza** (`a988722`): dificuldade visível; ícones de runa; card "próxima runa" + statLabel + dedupe; **nomes em inglês + seletor de idioma**.
- **Fase 4b-i.2 Design/A11y/shadcn** (`b241e8a`): h1/contraste/roles/estados; shadcn Tabs/Select/Tooltip; zebra/teclado/microinterações.
- **Fase 4b-ii Gear** (`9d7e3cb`): aba Gear — hero picker + grid 10 slots + comparador (atual vs best + candidatos owned por powerDelta, pills).
- **Gear Comparador v2** (`18f275a`): seletor métrica Poder/DPS/Defesa + stats do item + cor de raridade do jogo + explicação da troca + badge "↑ upgrade" nos slots.
- **Lançamento** (`991b4f5`): README/CREDITS/LICENSE públicos + OG/keywords + topics.
- **Fix cálculo MULTIPLICATIVE** (`c5c8d5a`): escala /100→/1000 (game-verified "17% More Attack Speed") → Arcano>Lendário; + enchant leak no powerDelta; + display +17,1%.

---

## 🐞 CORREÇÕES DE CÁLCULO DO ENGINE (achadas 2026-06-30, PENDENTES)
> Descobertas debugando o comparador de gear (mesma classe do bug do attack speed). Tocam a matemática de dano do engine validado → blast radius no oráculo (reconciliar como no assert do swap). Convenção /1000 confirmada in-game. Detalhe na memória `tbh-engine-calc-scale`.
- **B (confiança ALTA):** `dmgMult` (`stats.ts:~243`) usa `/100` p/ dano elemental (`Physical/Fire/Cold/Lightning/ChaosDamagePercent`, FLAT 100–150 de passivas/enchants). Deveria ser `/1000` (igual crit/CDR/AS). Hoje passiva de 150 dá ×2,5; certo ×1,15. **10× forte.**
- **A (confiança média-alta):** `Increase{Melee,Projectile,AOE,Summon}Damage` são ADDITIVE-only sem base FLAT → `aggregate` faz `0×(1+add)=0` → **ignorados**. Gear DIVINE "+800% Projectile Damage" não conta nada. Precisa decidir como agregar stat-modificador-puro + 1 print confirmando que o jogo aplica.

---

## 🔨 FAZER AGORA (em andamento)
### A. Gear Comparador v2 — branch `feat/gear-comparator-v2` (tasks #14-17)
Spec/plano: `docs/superpowers/{specs,plans}/2026-06-29-tbh-companion-gear-comparator-v2.md`.
1. Helpers (stats rotulados + cores de raridade do jogo + métricas) — **rodando**
2. SlotCompare v2 (seletor Poder/DPS/Defesa + stats do item + raridade + explicação da troca)
3. Upgrades óbvios no grid (badge "↑ upgrade" nos slots de `rec.gear.swaps`)

### B. Lançamento / SEO / README / Créditos — workflow `wf_78b89043-543`
Rascunhos em `docs/launch/` (README + CREDITS + topics/descrição com pesquisa de termos). **João revisa antes de aplicar** (público). Créditos: shigake (tbh-copilot), lezards (giba-steam-market), taskbarhero.wiki. Checklist: topics, descrição, LICENSE, social-preview, "tudo na cara pra usar".

---

## 🗂️ PRÓXIMAS ABAS (as "em breve" da nav)
> Loja / Vender / Histórico ainda estão `disabled` no `app-shell`. Engine de mercado já existe; só falta UI.
### C. Aba **Vender** (Mercado — sell advisor)
Sell advisor + orderbook real da Steam (nº de compradores, preço de venda) + valor do baú/stash. Consome `/api/{orderbook,price}` (já existe). **Converter US$→R$ no client** (orderbook vem US$ no Hobby). Matching nome-item ↔ market-hash. Varredura Fiel (cache).
### D. Aba **Loja** (Mercado — buy / o que comprar)
O que vale comprar/craftar; comparar custo de mercado vs ganho de POWER; integrar com o comparador de gear ("esse upgrade custa X na Steam").
### E. Aba **Histórico** (progressão)
Charts de POWER/gold/nível/DPS ao longo do tempo (snapshots de saves); marcos. (Charts respeitando reduced-motion + a11y.)

---

## 🧩 GEAR AVANÇADO (engine já pronto, só UI)
### F. Synthesis / Enchant / AP / Drops / Progression
- `rec.synthesis` (painel de síntese) · `rec.enchant` (enchant advisor) · `rec.ap` (attribute points — build de herói) · `dropStages`/favFarm (onde dropar cada item) · `rec.gearProgression` (caminho de progressão). Tudo já computado no `recommend()`.

---

## 🎨 POLÊS & BELEZA v2 (DEFERIDO — "deixa pro final", João)
### G. Beautificação geral + ajustes finos
- **Árvore de runas:** reforçar as **linhas (stroke fraco)**; **bolinha→quadrado** nos nós (runas no jogo são quadradas — opcional).
- Deixar o site "mais da hora/bonito" — passe de identidade visual além do básico (o João acha "bom de básico, mas falta charme").
- Charts/visualizações, transições, microinterações extras.

## 🔧 FASE 6 — POLIMENTO FINAL
### H. i18n completo (16 idiomas na UI), PWA (instalável/offline), notificações, geradores.

---

## 📋 BACKLOG — follow-ups deferidos (acumulados das fases)
- **A11y:** aba "em breve" com `role=button` no span do tooltip; `role="button"` em nós de runa não-acionáveis (escopar p/ isActionable); skip-link target sem `tabIndex={-1}`; arrow-key roving na árvore.
- **Locale:** `dedupeByNameAndSt` usa nome en-US na chave (edge em locale não-inglês).
- **Gear:** JSDoc da rampa de grade (BEYOND); `parseSave` catch silencioso (observabilidade); `rgba` cru no shadow do slot → token `ring-gold`; label de arma vazia sem `mainW`; `SelectItemIndicator` sem checkmark; wrappers ui/* sem forwardRef.
- **Outros:** lint pré-existente FSA `window as any` (connect.ts/connect-save.tsx); spinner smoke `button .animate-spin`; stage-table empty-state ternário.

---

## Execução
Modelo já escolhido e em uso: **subagent-driven** (implementer+review por task, review final Opus, merge→deploy). Cada fase acima vira spec+plano próprios ao iniciar. Ordem sugerida pós-"agora": **C/D Mercado (Vender/Loja)** → **F Gear avançado** → **E Histórico** → **G Polês & Beleza v2** → **H Fase 6**. João reordena à vontade.
