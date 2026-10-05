import type { EgoApi } from "@lineagraph/ui/graph";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4200";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) throw new Error(`API ${path} failed with ${res.status}`);
  return res.json();
}

// Shared by every embedded ego-graph widget (the full /graph explorer and the smaller
// in-context one on a person/polity page) so the API wiring lives in one place.
export const egoApi: EgoApi = {
  graph: (root, o) =>
    request(
      `/nodes/${encodeURIComponent(root)}/graph?depth=${o.depth}&limit=${o.limit}&disputed=${o.includeDisputed ? 1 : 0}`,
    ),
  expand: (nodeId, known, o) =>
    request("/graph/expand", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nodeId,
        known,
        limit: o.limit,
        includeDisputed: o.includeDisputed,
      }),
    }),
};
