import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { Button } from "../components/ui/button";
import {
  GraphUi,
  TypeFilter,
  buildEdges,
  layout,
  nodeTypes,
  placeAround,
  useColorMode,
  type EntityNodeData,
  type Pos,
} from "./shared";
import type { EgoApi, EgoGraphData, GraphEdge, GraphNode, RenderNodeLink } from "./types";

const FIRST_LIMIT = 40;
// Graphs bigger than this open zoomed on the middle node and its closest neighbours.
const FOCUS_COUNT = 8;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const MORE_LIMIT = 30;

type Crumb = { id: string; slug: string; name: string };
type Props = {
  /** Slug or id of the node in the middle. */
  root: string;
  api: EgoApi;
  renderLink?: RenderNodeLink;
  height?: number;
  /** Called when the centre changes (the picker or the URL can follow). */
  onRootChange?: (node: GraphNode) => void;
  /** Admin: click a relationship line. */
  onEdgeClick?: (edge: GraphEdge) => void;
  /** Admin: drag from one person's bottom dot to another's top dot. */
  onConnect?: (sourceId: string, targetId: string) => void;
  /** Change this to force a reload (for example after an edit). */
  reloadKey?: number;
};

export function EgoGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}

function Inner({
  root,
  api,
  renderLink,
  height = 640,
  onRootChange,
  onEdgeClick,
  onConnect,
  reloadKey = 0,
}: Props) {
  const colorMode = useColorMode();
  const { fitView, getNodes } = useReactFlow();
  const [depth, setDepth] = useState(2);
  const [includeDisputed, setIncludeDisputed] = useState(true);
  // undefined = let the server choose (dynasties start with rulers only).
  const [minImportance, setMinImportance] = useState<number | undefined>(undefined);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [rootRef, setRootRef] = useState(root);
  const [trail, setTrail] = useState<Crumb[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [graphNodes, setGraphNodes] = useState<Map<string, GraphNode>>(new Map());
  const [graphEdges, setGraphEdges] = useState<Map<string, GraphEdge>>(new Map());
  const [hidden, setHidden] = useState<Record<string, number>>({});
  const [rootId, setRootId] = useState("");
  const [truncated, setTruncated] = useState(false);
  // Threshold the server actually applied (shown, and lowered one step by "Tải thêm").
  const [effMin, setEffMin] = useState(5);
  const [rfNodes, setRfNodes] = useState<Node<EntityNodeData>[]>([]);
  const fitSoon = useRef(0);

  // The parent changed the centre (for example through the person picker): start over there.
  // (Skipped when the change only echoes a re-centre made inside the graph.)
  const centre = useRef<{ id: string; slug: string } | null>(null);
  useEffect(() => {
    if (centre.current && (centre.current.id === root || centre.current.slug === root)) return;
    setRootRef(root);
    setTrail([]);
  }, [root]);

  const options = useMemo(
    () => ({ depth, limit: FIRST_LIMIT, includeDisputed, minImportance }),
    [depth, includeDisputed, minImportance],
  );

  // Load the graph around `rootRef`.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    api
      .graph(rootRef, options)
      .then((data) => {
        if (cancelled) return;
        const positions = layout(data.nodes, data.edges);
        setGraphNodes(new Map(data.nodes.map((n) => [n.id, n])));
        setGraphEdges(new Map(data.edges.map((e) => [e.id, e])));
        setHidden(data.hidden);
        setRootId(data.rootId);
        setTruncated(data.truncated);
        setEffMin(data.minImportance ?? 1);
        setRfNodes(
          data.nodes.map((n) => ({
            id: n.id,
            type: "entity",
            position: positions.get(n.id)!,
            data: { node: n, isRoot: n.id === data.rootId, hidden: data.hidden[n.id] ?? 0 },
          })),
        );
        const middle = data.nodes.find((n) => n.id === data.rootId);
        if (middle) {
          // Office-holding lines clutter a person's picture, and a polity with many office-holders
          // (a dynasty) turns into a fan of lines; the chip below brings them back.
          const tenureLines = data.edges.filter((e) => e.type === "tenure").length;
          setHiddenTypes((prev) => {
            const next = new Set(prev);
            if (middle.kind === "person" || tenureLines > 8) next.add("tenure");
            else next.delete("tenure");
            return next;
          });
          centre.current = { id: middle.id, slug: middle.slug };
          setTrail((t) =>
            t.some((c) => c.id === middle.id)
              ? t
              : [...t, { id: middle.id, slug: middle.slug, name: middle.name }],
          );
        }
        setStatus("ready");
        fitSoon.current++;
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [api, rootRef, options, reloadKey]);

  useEffect(() => {
    if (fitSoon.current === 0) return;
    const t = setTimeout(() => {
      // A long lineage is a tall tree that would shrink to unreadable text when fitted whole, so
      // a big graph opens on the middle node and its closest neighbours; pan or zoom for the rest.
      const all = getNodes();
      const middle = all.find((n) => n.id === rootId);
      if (!middle || all.length <= FOCUS_COUNT) {
        fitView({ padding: 0.15, duration: 300 });
        return;
      }
      const near = [...all]
        .sort((a, b) => dist(a.position, middle.position) - dist(b.position, middle.position))
        .slice(0, FOCUS_COUNT);
      fitView({ nodes: near, padding: 0.2, duration: 300 });
    }, 60);
    return () => clearTimeout(t);
  }, [rfNodes.length, rootId, fitView, getNodes]);

  const expand = useCallback(
    async (nodeId: string) => {
      setBusy(true);
      setMessage(null);
      try {
        const data: EgoGraphData = await api.expand(nodeId, [...graphNodes.keys()], {
          limit: MORE_LIMIT,
          includeDisputed,
        });
        if (data.nodes.length === 0) setMessage("Không còn ai để tải thêm.");
        setGraphNodes((prev) => new Map([...prev, ...data.nodes.map((n) => [n.id, n] as const)]));
        setGraphEdges((prev) => new Map([...prev, ...data.edges.map((e) => [e.id, e] as const)]));
        setHidden(data.hidden);
        setRfNodes((prev) => {
          const anchor = prev.find((n) => n.id === nodeId)?.position ?? { x: 0, y: 0 };
          const fresh = placeAround(
            anchor,
            data.nodes.length,
            prev.map((n) => n.position),
          );
          const updated = prev.map((n) => ({
            ...n,
            data: { ...n.data, hidden: data.hidden[n.id] ?? 0 },
          }));
          const added: Node<EntityNodeData>[] = data.nodes.map((n, i) => ({
            id: n.id,
            type: "entity",
            position: fresh[i]!,
            data: { node: n, isRoot: false, hidden: data.hidden[n.id] ?? 0 },
          }));
          return [...updated, ...added];
        });
        fitSoon.current++;
      } catch {
        setMessage("Không tải thêm được, thử lại sau.");
      } finally {
        setBusy(false);
      }
    },
    [api, graphNodes, includeDisputed],
  );

  const recenter = useCallback(
    (node: GraphNode) => {
      centre.current = { id: node.id, slug: node.slug };
      setRootRef(node.id);
      onRootChange?.(node);
    },
    [onRootChange],
  );

  // "Load more": first reveal the next importance tier for the whole graph; once every tier is
  // open, expand the node closest to the centre that still has people hidden.
  const loadMore = () => {
    if (effMin > 1) {
      setMinImportance(effMin - 1);
      return;
    }
    const dist = new Map<string, number>([[rootId, 0]]);
    const queue = [rootId];
    while (queue.length) {
      const id = queue.shift()!;
      for (const e of graphEdges.values()) {
        const other = e.source === id ? e.target : e.target === id ? e.source : null;
        if (other && !dist.has(other)) {
          dist.set(other, dist.get(id)! + 1);
          queue.push(other);
        }
      }
    }
    const next = [...graphNodes.keys()]
      .filter((id) => (hidden[id] ?? 0) > 0)
      .sort((a, b) => (dist.get(a) ?? 99) - (dist.get(b) ?? 99))[0];
    if (next) void expand(next);
  };
  const totalHidden = Object.values(hidden).reduce((s, n) => s + n, 0);

  const onNodesChange = useCallback((changes: NodeChange<Node<EntityNodeData>>[]) => {
    setRfNodes((prev) => applyNodeChanges(changes, prev));
  }, []);

  const positions = useMemo(
    () => new Map<string, Pos>(rfNodes.map((n) => [n.id, n.position])),
    [rfNodes],
  );
  const edges = useMemo(
    () => buildEdges([...graphEdges.values()], positions, hiddenTypes),
    [graphEdges, positions, hiddenTypes],
  );

  const toggleType = (type: string) =>
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  const ctx = useMemo(
    () => ({
      renderLink:
        renderLink ??
        ((node: GraphNode, p: { className: string; children: React.ReactNode }) => (
          <a href={`/${node.kind}/${node.slug}`} className={p.className}>
            {p.children}
          </a>
        )),
      connectable: Boolean(onConnect),
      onExpand: (id: string) => void expand(id),
      onRecenter: recenter,
    }),
    [renderLink, onConnect, expand, recenter],
  );

  const handleConnect = (c: Connection) => {
    if (c.source && c.target && c.source !== c.target) onConnect?.(c.source, c.target);
  };

  return (
    <GraphUi.Provider value={ctx}>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="text-muted-foreground flex items-center gap-2">
          Số bước
          <select
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="border-input bg-background text-foreground h-8 rounded-lg border px-2"
          >
            {[1, 2, 3].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="text-muted-foreground flex items-center gap-2">
          Hiển thị
          <select
            value={minImportance ?? "auto"}
            onChange={(e) =>
              setMinImportance(e.target.value === "auto" ? undefined : Number(e.target.value))
            }
            className="border-input bg-background text-foreground h-8 rounded-lg border px-2"
          >
            <option value="auto">Tự động</option>
            <option value={5}>Chỉ mối quan hệ cốt lõi</option>
            <option value={4}>Quan trọng trở lên</option>
            <option value={3}>Thông thường trở lên</option>
            <option value={2}>Gồm cả quan hệ phụ</option>
            <option value={1}>Tất cả</option>
          </select>
        </label>
        <label className="text-muted-foreground flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeDisputed}
            onChange={(e) => setIncludeDisputed(e.target.checked)}
          />
          Gồm quan hệ còn tranh cãi
        </label>
        <span className="text-muted-foreground">
          {graphNodes.size} người hiển thị
          {totalHidden > 0 ? `, còn ${totalHidden} liên kết chưa hiện` : ""}
        </span>
        {totalHidden > 0 && (
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={loadMore}>
            {busy ? "Đang tải..." : "Tải thêm"}
          </Button>
        )}
        {message && <span className="text-muted-foreground">{message}</span>}
      </div>
      {trail.length > 1 && (
        <nav
          className="text-muted-foreground mb-3 flex flex-wrap items-center gap-1 text-sm"
          aria-label="Đường đi giữa các trung tâm"
        >
          {trail.map((c, i) => (
            <span key={c.id} className="flex items-center gap-1">
              {i > 0 && <span>›</span>}
              {i === trail.length - 1 ? (
                <span className="text-foreground font-medium">{c.name}</span>
              ) : (
                <button
                  type="button"
                  className="hover:text-primary hover:underline"
                  onClick={() => {
                    setTrail(trail.slice(0, i));
                    setRootRef(c.id);
                  }}
                >
                  {c.name}
                </button>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="mb-3">
        <TypeFilter edges={[...graphEdges.values()]} hidden={hiddenTypes} onToggle={toggleType} />
      </div>
      <div
        className="bg-card shadow-card relative overflow-hidden rounded-2xl border"
        style={{ height }}
      >
        {status !== "ready" && (
          <div className="bg-card/80 text-muted-foreground absolute inset-0 z-10 grid place-items-center">
            {status === "loading" ? "Đang dựng sơ đồ..." : "Không tải được sơ đồ. Thử lại sau."}
          </div>
        )}
        <ReactFlow
          nodes={rfNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          colorMode={colorMode}
          onNodesChange={onNodesChange}
          onEdgeClick={(_, edge) => {
            const e = graphEdges.get(edge.id);
            if (e) onEdgeClick?.(e);
          }}
          onConnect={handleConnect}
          nodesConnectable={Boolean(onConnect)}
          elementsSelectable={false}
          minZoom={0.2}
          maxZoom={1.6}
          proOptions={{ hideAttribution: false }}
        >
          <Background gap={20} />
          <Controls showInteractive={false} />
          {rfNodes.length > 12 && <MiniMap pannable zoomable className="!bg-card" />}
        </ReactFlow>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        Kéo để di chuyển, cuộn để phóng to. Bấm vào tên để xem trang của người đó, bấm biểu tượng ◎
        để lấy người đó làm trung tâm, bấm “+N” để hiện thêm người liên quan.
        {truncated ? " Sơ đồ đã được giới hạn số người." : ""}
        {onEdgeClick ? " Bấm vào đường nối để sửa quan hệ." : ""}
        {onConnect ? " Kéo từ chấm dưới của một ô sang chấm trên của ô khác để thêm quan hệ." : ""}
      </p>
    </GraphUi.Provider>
  );
}
