import { createContext, useContext, useEffect, useState } from "react";
import dagre from "@dagrejs/dagre";
import { Handle, MarkerType, Position, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { Crosshair } from "lucide-react";
import { cn } from "../lib/utils";
import type { GraphEdge, GraphNode, RenderNodeLink } from "./types";

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 74;
const GAP = 30;

export type EntityNodeData = { node: GraphNode; isRoot: boolean; hidden: number };

type GraphUiContext = {
  renderLink: RenderNodeLink;
  connectable: boolean;
  onExpand?: (nodeId: string) => void;
  onRecenter?: (node: GraphNode) => void;
};
const defaultLink: RenderNodeLink = (node, { className, children }) => (
  <a href={`/${node.kind}/${node.slug}`} className={className}>{children}</a>
);
export const GraphUi = createContext<GraphUiContext>({ renderLink: defaultLink, connectable: false });

// Follows the site theme (data-theme attribute, or the OS setting) so React Flow's own
// controls and minimap match.
export function useColorMode(): "light" | "dark" {
  const [mode, setMode] = useState<"light" | "dark">("light");
  useEffect(() => {
    const read = () => {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "dark" || attr === "light") return attr;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    };
    setMode(read());
    const observer = new MutationObserver(() => setMode(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMedia = () => setMode(read());
    media.addEventListener("change", onMedia);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", onMedia);
    };
  }, []);
  return mode;
}

function EntityNode({ data }: NodeProps<Node<EntityNodeData>>) {
  const { node, isRoot, hidden } = data;
  const { renderLink, connectable, onExpand, onRecenter } = useContext(GraphUi);
  const years = node.birth || node.death ? `${node.birth?.label ?? "?"} – ${node.death?.label ?? "?"}` : "";
  const handle = connectable ? "!size-2.5 !border-primary !bg-card" : "!opacity-0";
  return (
    <div
      className={cn(
        "relative rounded-md border bg-card px-3 py-2 text-card-foreground shadow-sm transition-colors hover:border-primary",
        isRoot && "border-primary ring-1 ring-primary",
        node.kind === "polity" && "border-gold bg-accent",
      )}
      style={{ width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
    >
      <Handle id="t" type="target" position={Position.Top} className={handle} isConnectable={connectable} />
      <Handle id="b" type="source" position={Position.Bottom} className={handle} isConnectable={connectable} />
      <Handle id="l" type="source" position={Position.Left} className="!opacity-0" isConnectable={false} />
      <Handle id="lt" type="target" position={Position.Left} className="!opacity-0" isConnectable={false} />
      <Handle id="r" type="source" position={Position.Right} className="!opacity-0" isConnectable={false} />
      <Handle id="rt" type="target" position={Position.Right} className="!opacity-0" isConnectable={false} />
      {renderLink(node, {
        className: "block pr-5 text-foreground no-underline hover:no-underline",
        children: (
          <>
            <div className="text-sm leading-tight font-semibold">{node.name}</div>
            {years && <div className="mt-0.5 text-xs text-muted-foreground">{years}</div>}
            {node.offices.slice(0, 2).map((o) => (
              <div key={o} className="mt-1 truncate rounded-sm bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{o}</div>
            ))}
          </>
        ),
      })}
      {onRecenter && !isRoot && (
        <button
          type="button"
          title="Lấy làm trung tâm"
          aria-label="Lấy làm trung tâm"
          onClick={() => onRecenter(node)}
          className="nodrag absolute top-1.5 right-1.5 text-muted-foreground hover:text-primary"
        >
          <Crosshair className="size-3.5" />
        </button>
      )}
      {onExpand && hidden > 0 && (
        <button
          type="button"
          title={`Còn ${hidden} người liên quan chưa hiện`}
          onClick={() => onExpand(node.id)}
          className="nodrag absolute -right-2 -bottom-2 rounded-full border border-primary bg-card px-1.5 text-[11px] leading-5 font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
        >
          +{hidden}
        </button>
      )}
    </div>
  );
}
export const nodeTypes = { entity: EntityNode };

export type Pos = { x: number; y: number };

/**
 * Parent -> child links decide the layout (parents above children). Spouses are then moved onto
 * their partner's row, and rows are spread out so nothing overlaps. Every other relationship is
 * drawn on top without moving anything. (dagre cannot lay out zero-length edges, so spouses
 * are not part of the dagre graph.)
 */
export function layout(nodes: GraphNode[], edges: GraphEdge[]): Map<string, Pos> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 90, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  const hasParent = new Set<string>();
  for (const e of edges) {
    if (e.category !== "family" || e.symmetric) continue;
    g.setEdge(e.source, e.target, { minlen: 1, weight: 2 });
    hasParent.add(e.target);
  }
  dagre.layout(g);
  const pos = new Map(nodes.map((n) => {
    const p = g.node(n.id);
    return [n.id, { x: p.x - NODE_WIDTH / 2, y: p.y - NODE_HEIGHT / 2 }] as const;
  }));
  // A spouse without parents of their own joins the partner's row, beside them.
  for (const e of edges) {
    if (e.category !== "family" || !e.symmetric) continue;
    const [a, b] = hasParent.has(e.source) || !hasParent.has(e.target) ? [e.source, e.target] : [e.target, e.source];
    if (hasParent.has(b)) continue;
    const anchor = pos.get(a)!;
    pos.set(b, { x: anchor.x + NODE_WIDTH + GAP, y: anchor.y });
  }
  // Push apart nodes that now share a row and overlap.
  const rows = new Map<number, string[]>();
  for (const [id, p] of pos) rows.set(p.y, [...(rows.get(p.y) ?? []), id]);
  for (const ids of rows.values()) {
    ids.sort((u, v) => pos.get(u)!.x - pos.get(v)!.x);
    for (let i = 1; i < ids.length; i++) {
      const prev = pos.get(ids[i - 1]!)!;
      const cur = pos.get(ids[i]!)!;
      const minX = prev.x + NODE_WIDTH + GAP;
      if (cur.x < minX) pos.set(ids[i]!, { x: minX, y: cur.y });
    }
  }
  return pos;
}

const overlaps = (a: Pos, b: Pos) => Math.abs(a.x - b.x) < NODE_WIDTH + GAP && Math.abs(a.y - b.y) < NODE_HEIGHT + GAP;

/**
 * Positions for nodes added next to `anchor` without moving anything already on screen:
 * they fan out on an arc facing away from the middle of the existing graph, and slide
 * outwards until they no longer overlap anything.
 */
export function placeAround(anchor: Pos, count: number, existing: Pos[]): Pos[] {
  if (count === 0) return [];
  const cx = existing.reduce((s, p) => s + p.x, 0) / Math.max(existing.length, 1);
  const cy = existing.reduce((s, p) => s + p.y, 0) / Math.max(existing.length, 1);
  let base = Math.atan2(anchor.y - cy, anchor.x - cx);
  if (anchor.x === cx && anchor.y === cy) base = Math.PI / 2;
  const spread = Math.min(Math.PI * 1.4, 0.6 * count);
  const taken = [...existing];
  const placed: Pos[] = [];
  for (let i = 0; i < count; i++) {
    const angle = count === 1 ? base : base - spread / 2 + (spread * i) / (count - 1);
    let radius = 280;
    let p: Pos;
    do {
      p = { x: anchor.x + Math.cos(angle) * radius * 1.3, y: anchor.y + Math.sin(angle) * radius };
      radius += 60;
    } while (taken.some((q) => overlaps(p, q)) && radius < 2000);
    taken.push(p);
    placed.push(p);
  }
  return placed;
}

const categoryColor: Record<string, string> = {
  family: "var(--ink-soft)",
  politics: "var(--vermilion)",
  personal: "var(--info)",
  other: "var(--ink-faint)",
};

/** React Flow edges for the given relationships; line style tells family from other links. */
export function buildEdges(edges: GraphEdge[], positions: Map<string, Pos>, hiddenTypes: Set<string>): Edge[] {
  return edges
    .filter((e) => !hiddenTypes.has(e.type) && positions.has(e.source) && positions.has(e.target))
    .map((e) => {
      const from = positions.get(e.source)!;
      const to = positions.get(e.target)!;
      const lateral = e.symmetric || Math.abs(from.y - to.y) < 10;
      const color = categoryColor[e.category] ?? categoryColor.other;
      const label = e.type === "parent_of" ? e.text : [e.typeLabel, e.text].filter(Boolean).join(" · ");
      const leftToRight = from.x <= to.x;
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: lateral ? (leftToRight ? "r" : "l") : "b",
        targetHandle: lateral ? (leftToRight ? "lt" : "rt") : "t",
        type: lateral ? "straight" : "smoothstep",
        label: label || undefined,
        labelStyle: { fontSize: 11, fill: "var(--foreground)" },
        labelBgStyle: { fill: "var(--card)" },
        labelBgPadding: [4, 2] as [number, number],
        style: {
          stroke: color,
          strokeWidth: e.category === "family" && !e.symmetric ? 1.6 : 1.4,
          strokeDasharray: e.disputed ? "2 4" : e.category === "family" && !e.symmetric ? undefined : e.symmetric ? "6 4" : "3 3",
          cursor: "pointer",
        },
        markerEnd: e.symmetric ? undefined : { type: MarkerType.ArrowClosed, color },
      } satisfies Edge;
    });
}

/** One filter chip per relationship type present in the data. */
export function TypeFilter({
  edges,
  hidden,
  onToggle,
}: {
  edges: GraphEdge[];
  hidden: Set<string>;
  onToggle: (type: string) => void;
}) {
  const seen = new Map<string, string>();
  for (const e of edges) if (!seen.has(e.type)) seen.set(e.type, e.typeLabel);
  if (seen.size < 2) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {[...seen].map(([type, label]) => (
        <button
          key={type}
          type="button"
          onClick={() => onToggle(type)}
          className={cn(
            "rounded-sm border px-2.5 py-1 text-xs transition-colors",
            hidden.has(type) ? "bg-card text-muted-foreground line-through" : "border-primary bg-accent text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
