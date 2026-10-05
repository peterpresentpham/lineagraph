export type DateValue = {
  year: number;
  month: number | null;
  day: number | null;
  approximate: boolean;
  label: string;
};

// Shape sent to the API for dates (label is display-only).
export type DateInput = {
  year: number;
  month?: number | null;
  day?: number | null;
  approximate: boolean;
};

export type NameValue = {
  name: string;
  kind: string;
  language?: string | null;
  isPrimary: boolean;
};

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

export type RegistryItem = { code: string; label: string };

export type NodeKind = "person" | "polity";
export type NodeRef = { id: string; kind: NodeKind; slug: string; name: string };

export type RelationType = {
  code: string;
  label: string;
  category: string;
  inverseCode: string | null;
  inverseLabel: string | null;
  isSymmetric: boolean;
  isPrimary: boolean;
  isAcyclic: boolean;
  defaultImportance: number;
  subjectKinds: NodeKind[];
  objectKinds: NodeKind[];
};

export type RelationshipView = {
  id: string;
  type: string;
  typeLabel: string;
  inverseTypeLabel: string;
  category: string;
  from: NodeRef;
  to: NodeRef;
  variant: string | null;
  label: string | null;
  note: string | null;
  disputed: boolean;
  importance: number;
  start: DateValue | null;
  end: DateValue | null;
};

export type AttributeValue = { type: string; value: string };
