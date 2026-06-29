"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, Maximize2 } from "lucide-react";
import type { Recommendation } from "@tbh/engine";
import { statusColor } from "@/lib/rune-colors";

// ── RuneTree (SVG) ──────────────────────────────────────────────────────────
// Árvore interativa de 197 nós: viewBox = bounds (origem negativa), um <g>
// interno transformado por pan/zoom. Arestas primeiro (dim; realçadas no
// caminho de DPS), depois os nós coloridos por status. Pan = arrastar; zoom =
// scroll + botões + / − ; fit = volta ao viewBox dos bounds.
//
// Perf: 197 nós. As listas de arestas/nós são memoizadas; cada nó é um
// componente React.memo, então hover é puro CSS (não re-renderiza o pai) e a
// seleção (clique, raro) re-renderiza só a lista de nós. O transform do <g>
// muda no estado do pai, mas afeta um único elemento (o viewport), não 197.

type RuneTreeData = Recommendation["runeTree"];
type RuneNodeData = RuneTreeData["nodes"][string];

export interface RuneBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface RuneTreeProps {
  nodes: Record<string, RuneNodeData>;
  edges: readonly (readonly [number, number])[];
  bounds: RuneBounds;
  /** Caminho de DPS — aceito p/ a interface (T2 usa direto); o realce de
   *  arestas/nós já vem de `node.onDpsPath`. */
  firstDpsPath?: RuneTreeData["firstDpsPath"];
  selectedKey: string | null;
  onSelect?: (key: string) => void;
  /** T2: orçamento (gold) p/ destacar nós acessíveis. Aceito, não aplicado aqui. */
  budget?: number;
  /** T2: categoria ativa p/ filtro. Aceito, não aplicado aqui. */
  activeCat?: string | null;
}

// ── Geometria pan/zoom ──────────────────────────────────────────────────────
// O <g> interno aplica `translate(t.x,t.y) scale(t.s)` em unidades de viewBox.
// Um ponto-dado p mapeia para `s*p + t` no espaço do viewBox. Fit = identidade
// (t={0,0,1}) → mostra os bounds inteiros, já que o viewBox = bounds.

interface Transform {
  x: number;
  y: number;
  s: number;
}

const IDENTITY: Transform = { x: 0, y: 0, s: 1 };
const MIN_SCALE = 0.5;
const MAX_SCALE = 8;
const DRAG_THRESHOLD = 4; // px antes de virar "arrasto" (preserva o clique no nó)
const NODE_R = 18;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Zoom por `factor` mantendo fixo o ponto focal (fx,fy) em coords de viewBox. */
function zoomAbout(cur: Transform, factor: number, fx: number, fy: number): Transform {
  const s = clamp(cur.s * factor, MIN_SCALE, MAX_SCALE);
  const ratio = s / cur.s;
  return { s, x: fx - ratio * (fx - cur.x), y: fy - ratio * (fy - cur.y) };
}

// ── Nó (memoizado) ──────────────────────────────────────────────────────────

interface RuneNodeElProps {
  nodeKey: string;
  n: RuneNodeData;
  selected: boolean;
  onSelect?: (key: string) => void;
  draggedRef: React.RefObject<boolean>;
}

const RuneNodeEl = React.memo(function RuneNodeEl({
  nodeKey,
  n,
  selected,
  onSelect,
  draggedRef,
}: RuneNodeElProps) {
  const c = statusColor(n.status);
  const handleClick = useCallback(() => {
    // Suprime a seleção se o gesto foi um arrasto (pan), não um clique.
    if (draggedRef.current) return;
    onSelect?.(nodeKey);
  }, [draggedRef, onSelect, nodeKey]);

  return (
    <g
      className="rune-node"
      transform={`translate(${n.x} ${n.y})`}
      onClick={onSelect ? handleClick : undefined}
      role={onSelect ? "button" : undefined}
      aria-label={n.name ?? `Runa ${nodeKey}`}
    >
      {/* important (combat AD/AS) → glow suave atrás */}
      {n.important ? (
        <circle r={NODE_R + 11} fill="var(--gold)" opacity={0.12} className="rune-glow" />
      ) : null}
      {/* selecionado → ênfase em texto/branco */}
      {selected ? (
        <circle r={NODE_R + 8} fill="none" stroke="var(--text)" strokeWidth={2.5} opacity={0.9} />
      ) : null}
      {/* no caminho de DPS → contorno ouro tracejado */}
      {n.onDpsPath ? (
        <circle
          r={NODE_R + 5}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={2}
          strokeDasharray="3 4"
          opacity={0.9}
        />
      ) : null}
      {/* almostfree → anel ouro extra */}
      {n.status === "almostfree" ? (
        <circle r={NODE_R + 4} fill="none" stroke="var(--gold)" strokeWidth={1.5} opacity={0.7} />
      ) : null}
      {/* corpo do nó, colorido por status */}
      <circle
        r={NODE_R}
        fill={c.fill}
        stroke={c.stroke}
        strokeWidth={c.strokeWidth}
        opacity={c.opacity}
      />
    </g>
  );
});

// ── Controle de zoom (botão) ────────────────────────────────────────────────

interface ZoomBtnProps {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}

function ZoomBtn({ label, onClick, children }: ZoomBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-8 items-center justify-center rounded-md border border-line bg-surface text-dim shadow-sm transition-colors hover:border-line/80 hover:text-text"
    >
      {children}
    </button>
  );
}

// ── RuneTree ────────────────────────────────────────────────────────────────

export function RuneTree({
  nodes,
  edges,
  bounds,
  selectedKey,
  onSelect,
}: RuneTreeProps) {
  const { minX, minY } = bounds;
  const vbW = bounds.maxX - bounds.minX;
  const vbH = bounds.maxY - bounds.minY;

  const [t, setT] = useState<Transform>(IDENTITY);
  const [dragging, setDragging] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  /** true durante/após um arrasto, até o próximo pointerdown — guarda o clique. */
  const draggedRef = useRef(false);
  const panRef = useRef<
    { px: number; py: number; ox: number; oy: number; sf: number } | null
  >(null);

  // px por unidade de viewBox (preserveAspectRatio="xMidYMid meet").
  const fitScale = useCallback(
    (rect: DOMRect): number => Math.min(rect.width / vbW, rect.height / vbH),
    [vbW, vbH],
  );

  // ── Wheel zoom (listener nativo p/ poder preventDefault — não-passivo) ──
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const sf = Math.min(rect.width / vbW, rect.height / vbH);
      if (!Number.isFinite(sf) || sf <= 0) return;
      const offX = (rect.width - vbW * sf) / 2;
      const offY = (rect.height - vbH * sf) / 2;
      const fx = minX + (e.clientX - rect.left - offX) / sf;
      const fy = minY + (e.clientY - rect.top - offY) / sf;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setT((cur) => zoomAbout(cur, factor, fx, fy));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [vbW, vbH, minX, minY]);

  // ── Pan (pointer drag), com limiar p/ não engolir cliques nos nós ──
  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): void => {
      if (e.button !== 0) return;
      const svg = svgRef.current;
      if (!svg) return;
      const sf = fitScale(svg.getBoundingClientRect()) || 1;
      panRef.current = { px: e.clientX, py: e.clientY, ox: t.x, oy: t.y, sf };
      draggedRef.current = false;
    },
    [t.x, t.y, fitScale],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>): void => {
    const p = panRef.current;
    if (!p) return;
    const ddx = e.clientX - p.px;
    const ddy = e.clientY - p.py;
    if (!draggedRef.current) {
      if (Math.hypot(ddx, ddy) < DRAG_THRESHOLD) return;
      draggedRef.current = true;
      setDragging(true);
      svgRef.current?.setPointerCapture(e.pointerId);
    }
    setT((cur) => ({ ...cur, x: p.ox + ddx / p.sf, y: p.oy + ddy / p.sf }));
  }, []);

  const endPan = useCallback((e: React.PointerEvent<SVGSVGElement>): void => {
    if (!panRef.current) return;
    panRef.current = null;
    setDragging(false);
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer já liberado */
    }
  }, []);

  // ── Controles +/−/fit (zoom discreto em torno do centro do viewBox) ──
  const zoomCenter = useCallback(
    (factor: number): void => {
      setT((cur) => zoomAbout(cur, factor, minX + vbW / 2, minY + vbH / 2));
    },
    [minX, minY, vbW, vbH],
  );
  const fit = useCallback(() => setT(IDENTITY), []);

  // ── Listas memoizadas ──
  const edgeEls = useMemo(
    () =>
      edges.map(([a, b], i) => {
        const p = nodes[a];
        const q = nodes[b];
        if (!p || !q) return null;
        const dps = !!p.onDpsPath && !!q.onDpsPath;
        return (
          <line
            key={i}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            stroke={dps ? "var(--gold)" : "var(--line)"}
            strokeWidth={dps ? 4 : 2.5}
            strokeOpacity={dps ? 0.85 : 0.5}
            strokeLinecap="round"
          />
        );
      }),
    [edges, nodes],
  );

  const nodeEls = useMemo(
    () =>
      Object.entries(nodes).map(([key, n]) => (
        <RuneNodeEl
          key={key}
          nodeKey={key}
          n={n}
          selected={key === selectedKey}
          onSelect={onSelect}
          draggedRef={draggedRef}
        />
      )),
    [nodes, selectedKey, onSelect],
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-line bg-bg/40">
      <svg
        ref={svgRef}
        viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        className={`block h-full w-full touch-none select-none ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        role="img"
        aria-label="Árvore de runas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <g
          className={`rune-viewport${dragging ? " dragging" : ""}`}
          transform={`translate(${t.x} ${t.y}) scale(${t.s})`}
        >
          <g>{edgeEls}</g>
          <g>{nodeEls}</g>
        </g>
      </svg>

      {/* Controles de zoom */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        <ZoomBtn label="Aproximar" onClick={() => zoomCenter(1.25)}>
          <Plus className="size-4" aria-hidden="true" />
        </ZoomBtn>
        <ZoomBtn label="Afastar" onClick={() => zoomCenter(1 / 1.25)}>
          <Minus className="size-4" aria-hidden="true" />
        </ZoomBtn>
        <ZoomBtn label="Ajustar à tela" onClick={fit}>
          <Maximize2 className="size-3.5" aria-hidden="true" />
        </ZoomBtn>
      </div>
    </div>
  );
}
