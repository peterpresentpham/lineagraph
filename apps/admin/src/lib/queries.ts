import { api } from "./api";
import type { RelationshipView } from "./types";

// Query definitions shared by a record's page (for the counts in its outline) and the panels that
// list the same data, so both read one cached request.

export const relationsOfNode = (nodeId: string) => ({
  queryKey: ["relationships", "node", nodeId],
  queryFn: () => api.get<RelationshipView[]>(`/relationships?nodeId=${nodeId}&limit=500`),
});

export const tenuresOf = (filter: string) => ({
  queryKey: ["tenures", filter],
  queryFn: () => api.get<{ id: string }[]>(`/tenures?${filter}`),
});

export const citationsOf = (subjectTable: string, subjectId: string) => ({
  queryKey: ["citations", subjectTable, subjectId],
  queryFn: () =>
    api.get<{ id: string }[]>(`/citations?subjectTable=${subjectTable}&subjectId=${subjectId}`),
});

export const eventsOfNode = (nodeId: string) => ({
  queryKey: ["events", "node", nodeId],
  queryFn: () =>
    api.get<{
      items: {
        id: string;
        name: string;
        eventTypeLabel: string;
        start: { label: string } | null;
      }[];
    }>(`/events?node=${nodeId}&limit=100`),
});
