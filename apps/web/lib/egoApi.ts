import type { EgoApi } from "@lineagraph/ui/graph";

import { PUBLIC_API_URL } from "./site";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // A request that never answers would leave the graph on "loading" forever.
  const res = await fetch(`${PUBLIC_API_URL}${path}`, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`API ${path} failed with ${res.status}`);
  return res.json();
}

// Shared by every embedded ego-graph widget (the full /graph explorer and the smaller
// in-context one on a person/polity page) so the API wiring lives in one place.
export const egoApi: EgoApi = {
  graph: (root, o) =>
    request(
      `/nodes/${encodeURIComponent(root)}/graph?depth=${o.depth}&limit=${o.limit}&disputed=${o.includeDisputed ? 1 : 0}${o.minImportance ? `&minImportance=${o.minImportance}` : ""}`,
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
