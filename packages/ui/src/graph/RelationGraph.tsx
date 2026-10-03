import "@xyflow/react/dist/style.css";
import { useMemo, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, type Node } from "@xyflow/react";
import { GraphUi, TypeFilter, buildEdges, layout, nodeTypes, useColorMode, type EntityNodeData } from "./shared";
import type { GraphView, RenderNodeLink } from "./types";

// A fixed graph (for example the people of one dynasty), laid out once.
export function RelationGraph({
  data,
  height = 640,
  renderLink,
  emptyText = "Chưa có đủ dữ liệu để vẽ cây quan hệ.",
}: {
  data: GraphView;
  height?: number;
  renderLink?: RenderNodeLink;
  emptyText?: string;
}) {
  const colorMode = useColorMode();
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());

  const { nodes, edges } = useMemo(() => {
    const positions = layout(data.nodes, data.edges);
    const rfNodes: Node<EntityNodeData>[] = data.nodes.map((n) => ({
      id: n.id,
      type: "entity",
      position: positions.get(n.id)!,
      data: { node: n, isRoot: n.id === data.rootId, hidden: 0 },
    }));
    return { nodes: rfNodes, edges: buildEdges(data.edges, positions, hiddenTypes) };
  }, [data, hiddenTypes]);

  if (data.nodes.length === 0) {
    return <p className="rounded-md border border-dashed p-8 text-center text-muted-foreground">{emptyText}</p>;
  }
  const toggle = (type: string) =>
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  return (
    <GraphUi.Provider value={{ renderLink: renderLink ?? defaultRender, connectable: false }}>
      <div className="mb-3"><TypeFilter edges={data.edges} hidden={hiddenTypes} onToggle={toggle} /></div>
      <div className="overflow-hidden rounded-md border bg-card" style={{ height }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          colorMode={colorMode}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={1.6}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background gap={20} />
          <Controls showInteractive={false} />
          {data.nodes.length > 12 && <MiniMap pannable zoomable className="!bg-card" />}
        </ReactFlow>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Kéo để di chuyển, cuộn để phóng to. Bấm vào một ô để xem trang của người đó. Nét liền là quan hệ huyết thống, nét đứt là quan hệ khác.
      </p>
    </GraphUi.Provider>
  );
}

const defaultRender: RenderNodeLink = (node, { className, children }) => (
  <a href={`/${node.kind}/${node.slug}`} className={className}>{children}</a>
);
