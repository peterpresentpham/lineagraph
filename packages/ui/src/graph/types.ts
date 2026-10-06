export type DateLabel = {
  year: number;
  month: number | null;
  day: number | null;
  approximate: boolean;
  calendar?: "gregorian" | "julian";
  label: string;
};

export type GraphNode = {
  id: string;
  slug: string;
  kind: "person" | "polity";
  name: string;
  sex: "male" | "female" | "unknown" | null;
  birth: DateLabel | null;
  death: DateLabel | null;
  /** Offices held in the polity the graph is about, e.g. "Hoàng đế (1428 – 1433)". */
  offices: string[];
};

export type GraphEdge = {
  id: string;
  /** Edge reads source -> target in its stored (primary) direction. */
  source: string;
  target: string;
  type: string;
  typeLabel: string;
  category: string;
  symmetric: boolean;
  text: string | null;
  disputed: boolean;
  /** 1 (minor) to 5 (core). */
  importance?: number;
};

export type GraphView = { rootId: string; nodes: GraphNode[]; edges: GraphEdge[] };

/** A graph plus, per node, how many neighbours are not drawn yet. */
export type EgoGraphData = GraphView & {
  hidden: Record<string, number>;
  truncated: boolean;
  /** Importance threshold the server applied (1-5). */
  minImportance?: number;
};

export type EgoOptions = {
  depth: number;
  limit: number;
  includeDisputed: boolean;
  /** Show only links at or above this importance (1-5); omit for the server default. */
  minImportance?: number;
};

export type EgoApi = {
  graph: (root: string, options: EgoOptions) => Promise<EgoGraphData>;
  expand: (
    nodeId: string,
    known: string[],
    options: { limit: number; includeDisputed: boolean },
  ) => Promise<EgoGraphData>;
};

/** How a node's name links to its page; each app supplies its own router link. */
export type RenderNodeLink = (
  node: GraphNode,
  props: { className: string; children: React.ReactNode },
) => React.ReactNode;
