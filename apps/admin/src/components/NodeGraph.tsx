import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EgoGraph, type EgoApi, type GraphEdge, type GraphNode, type RenderNodeLink } from "@lineagraph/ui/graph";
import { api } from "../lib/api";
import type { NodeRef } from "../lib/types";
import { RelationForm } from "./RelationForm";

const renderLink: RenderNodeLink = (node, { className, children }) => (
  <Link to={`/${node.kind === "person" ? "persons" : "polities"}/${node.id}`} className={className}>{children}</Link>
);

// The graph around one person or polity, with editing: click a line to edit that relationship,
// drag from one box to another to create one.
export function NodeGraph({ node }: { node: NodeRef }) {
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [preset, setPreset] = useState<{ from: NodeRef; to: NodeRef } | undefined>();
  const [seen, setSeen] = useState<Map<string, GraphNode>>(new Map());

  const egoApi = useMemo<EgoApi>(() => {
    const remember = <T extends { nodes: GraphNode[] }>(data: T) => {
      setSeen((prev) => new Map([...prev, ...data.nodes.map((n) => [n.id, n] as const)]));
      return data;
    };
    return {
      graph: (root, o) =>
        api.get<Awaited<ReturnType<EgoApi["graph"]>>>(
          `/nodes/${encodeURIComponent(root)}/graph?depth=${o.depth}&limit=${o.limit}&disputed=${o.includeDisputed ? 1 : 0}`,
        ).then(remember),
      expand: (nodeId, known, o) =>
        api.post<Awaited<ReturnType<EgoApi["expand"]>>>("/graph/expand", {
          nodeId, known, limit: o.limit, includeDisputed: o.includeDisputed,
        }).then(remember),
    };
  }, []);

  const ref = (n: GraphNode): NodeRef => ({ id: n.id, kind: n.kind, slug: n.slug, name: n.name });
  const onEdgeClick = (edge: GraphEdge) => {
    if (edge.type === "tenure") return; // office-holding is edited in the Chức vụ tab
    setPreset(undefined);
    setEditingId(edge.id);
    setFormOpen(true);
  };
  const onConnect = (sourceId: string, targetId: string) => {
    const a = seen.get(sourceId);
    const b = seen.get(targetId);
    if (!a || !b) return;
    setEditingId(null);
    setPreset({ from: ref(a), to: ref(b) });
    setFormOpen(true);
  };

  return (
    <div>
      <EgoGraph
        root={node.id}
        api={egoApi}
        renderLink={renderLink}
        onEdgeClick={onEdgeClick}
        onConnect={onConnect}
        reloadKey={reloadKey}
        height={600}
      />
      <RelationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingId={editingId}
        preset={preset}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
