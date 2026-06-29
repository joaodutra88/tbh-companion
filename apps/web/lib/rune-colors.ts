// Cores war-table dos nós da árvore de runas.
// Decisão (spec 4b-i): a cor do nó = STATUS (a informação acionável).
// As cores referenciam os tokens CSS do tema (var(--gold)/--teal/...), então
// acompanham o tema e a função continua pura/testável (sem ler o DOM).

export type RuneStatus =
  | "maxed"
  | "owned"
  | "locked"
  | "skip"
  | "recommended"
  | "almostfree"
  | "available";

/** Todos os status conhecidos — usado pela legenda e pelos testes. Ordem = prioridade visual. */
export const RUNE_STATUSES: readonly RuneStatus[] = [
  "recommended",
  "almostfree",
  "owned",
  "maxed",
  "available",
  "locked",
  "skip",
] as const;

/** Rótulos PT-BR por status (legenda / detalhe placeholder). */
export const RUNE_STATUS_LABEL: Record<RuneStatus, string> = {
  recommended: "Recomendado",
  almostfree: "Quase de graça",
  owned: "Possuído",
  maxed: "Maxado",
  available: "Disponível",
  locked: "Bloqueado",
  skip: "Pular",
};

/**
 * Classe(s) Tailwind do "ponto" colorido de cada status — usado pela legenda e
 * pelo detalhe. Espelha as cores de nó de `COLORS` em tokens war-table (sem
 * inline `var()`), pra um chip/ponto consistente com a árvore.
 */
export const RUNE_STATUS_DOT: Record<RuneStatus, string> = {
  recommended: "bg-gold",
  almostfree: "border border-gold bg-surface-2",
  owned: "bg-teal",
  maxed: "bg-teal/40",
  available: "border border-line bg-surface-2",
  locked: "border border-line bg-surface-2/40",
  skip: "bg-coral/50",
};

// ── Categorias ────────────────────────────────────────────────────────────────
// Decisão (spec 4b-i): a categoria = filtro (highlight), não a cor do nó.

export type RuneCat = "combat" | "gold" | "qol" | "exp" | "loot" | "offline";

/** Ordem de exibição dos chips de categoria. */
export const RUNE_CATS: readonly RuneCat[] = [
  "combat",
  "gold",
  "qol",
  "exp",
  "loot",
  "offline",
] as const;

/** Rótulos PT-BR das categorias (chips de filtro / detalhe). */
export const RUNE_CAT_LABEL: Record<RuneCat, string> = {
  combat: "Combate",
  gold: "Ouro",
  qol: "Conforto",
  exp: "EXP",
  loot: "Saque",
  offline: "Offline",
};

/** Narrow seguro: o `cat` do nó vem do engine como `string`. */
export function isRuneCat(value: string): value is RuneCat {
  return (RUNE_CATS as readonly string[]).includes(value);
}

/** Rótulo de categoria com fallback pro valor cru (categoria desconhecida). */
export function catLabel(value: string): string {
  return isRuneCat(value) ? RUNE_CAT_LABEL[value] : value;
}

export interface RuneNodeColor {
  /** Preenchimento do corpo do nó. */
  fill: string;
  /** Cor do contorno. */
  stroke: string;
  /** Opacidade geral do nó (0..1). */
  opacity: number;
  /** Espessura do contorno (unidades de viewBox). */
  strokeWidth: number;
}

const GOLD = "var(--gold)";
const TEAL = "var(--teal)";
const CORAL = "var(--coral)";
const LINE = "var(--line)";
const SURFACE2 = "var(--surface-2)";

const COLORS: Record<RuneStatus, RuneNodeColor> = {
  // recomendado → ouro cheio (a jogada de agora)
  recommended: { fill: GOLD, stroke: GOLD, opacity: 1, strokeWidth: 2 },
  // quase de graça → corpo neutro com anel de ouro (custo baixo p/ o teu gold)
  almostfree: { fill: SURFACE2, stroke: GOLD, opacity: 1, strokeWidth: 2.5 },
  // já possuído → teal
  owned: { fill: TEAL, stroke: TEAL, opacity: 0.92, strokeWidth: 2 },
  // maxado → teal apagado (concluído, sem ação)
  maxed: { fill: TEAL, stroke: TEAL, opacity: 0.38, strokeWidth: 1.5 },
  // disponível → neutro (surface-2 / line)
  available: { fill: SURFACE2, stroke: LINE, opacity: 1, strokeWidth: 1.5 },
  // bloqueado → apagado, baixa opacidade
  locked: { fill: SURFACE2, stroke: LINE, opacity: 0.3, strokeWidth: 1 },
  // pular → coral apagado (caro demais pra agora)
  skip: { fill: CORAL, stroke: CORAL, opacity: 0.42, strokeWidth: 1.5 },
};

const FALLBACK: RuneNodeColor = COLORS.available;

/**
 * Cor war-table pra um status de runa. Aceita `string` (o status vem do engine
 * tipado como string) e cai num neutro seguro para valores desconhecidos. Pura.
 */
export function statusColor(status: string): RuneNodeColor {
  return COLORS[status as RuneStatus] ?? FALLBACK;
}
