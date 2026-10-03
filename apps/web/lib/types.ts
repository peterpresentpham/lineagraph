export type DateValue = {
  year: number;
  month: number | null;
  day: number | null;
  approximate: boolean;
  label: string;
};

export type RegistryItem = { code: string; label: string };

export type PersonSummary = {
  id: string;
  slug: string;
  name: string;
  sex: string;
  historicity: string;
  birth: DateValue | null;
  death: DateValue | null;
};

export type PolitySummary = {
  id: string;
  slug: string;
  name: string;
  polityType: string;
  started: DateValue | null;
  ended: DateValue | null;
};

export type NameEntry = { name: string; kind: string; language: string | null; isPrimary: boolean };

export type NodeRef = { id: string; kind: "person" | "polity"; slug: string; name: string };

export type NodeRelation = {
  id: string;
  type: string;
  typeLabel: string;
  category: string;
  other: NodeRef;
  variant: string | null;
  label: string | null;
  note: string | null;
  disputed: boolean;
  start: DateValue | null;
  end: DateValue | null;
};

export type AttributeView = { type: string; label: string; value: string };

export type PersonDetail = PersonSummary & {
  summary: string | null;
  body: string | null;
  names: NameEntry[];
  attributes: AttributeView[];
  relations: NodeRelation[];
  siblings: PersonSummary[];
  tenures: {
    id: string;
    polity: { id: string; slug: string | null; name: string | null } | null;
    officeType: string;
    start: DateValue | null;
    end: DateValue | null;
  }[];
};

export type PolityDetail = PolitySummary & {
  summary: string | null;
  body: string | null;
  attributes: AttributeView[];
  relations: NodeRelation[];
  names: NameEntry[];
  tenures: {
    id: string;
    person: { id: string; slug: string; name: string };
    officeType: string;
    successionMode: string | null;
    start: DateValue | null;
    end: DateValue | null;
    seq: number | null;
    eras: string[];
  }[];
};

export type GraphNode = {
  id: string;
  slug: string;
  kind: "person" | "polity";
  name: string;
  sex: "male" | "female" | "unknown" | null;
  birth: DateValue | null;
  death: DateValue | null;
  offices: string[];
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  typeLabel: string;
  category: string;
  symmetric: boolean;
  text: string | null;
  disputed: boolean;
};

export type GraphView = { rootId: string; nodes: GraphNode[]; edges: GraphEdge[] };

export type PathStep = {
  from: NodeRef;
  to: NodeRef;
  type: string;
  typeLabel: string;
  details: string[];
  source: "relation" | "tenure";
  disputed: boolean;
};

export type RelationResult = {
  a: NodeRef;
  b: NodeRef;
  kinship: {
    sentence: string;
    aIs: string;
    bIs: string;
    note: string | null;
    line: string | null;
    ancestor: NodeRef | null;
  } | null;
  direct: NodeRelation[];
  paths: { cost: number; steps: PathStep[] }[];
};

export type Citation = {
  id: string;
  locator: string | null;
  quote: string | null;
  confidence: number;
  source: { id: string; title: string; author: string | null; url: string | null };
};

export type SearchResult = { id: string; kind: "person" | "polity"; slug: string; name: string; matched: string };

export type TimelineEntry = {
  kind: "person" | "polity";
  slug: string;
  name: string;
  start: DateValue | null;
  end: DateValue | null;
  detail: string | null;
};
