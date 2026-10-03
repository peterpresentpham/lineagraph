"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { EgoApi, GraphNode } from "@lineagraph/ui/graph";
import { NodePicker } from "./NodePicker";
import { renderNodeLink } from "./GraphClient";

const EgoGraph = dynamic(() => import("@lineagraph/ui/graph").then((m) => m.EgoGraph), {
  ssr: false,
  loading: () => <div className="grid h-96 place-items-center rounded-md border text-muted-foreground">Đang dựng sơ đồ...</div>,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) throw new Error(`API ${path} failed with ${res.status}`);
  return res.json();
}

// Pick someone, see the people around them, grow the picture on demand.
export function GraphExplorer({ initial }: { initial?: { slug: string; name: string } }) {
  const [node, setNode] = useState(initial ?? null);
  const [pickerKey, setPickerKey] = useState(0);

  const api = useMemo<EgoApi>(() => ({
    graph: (root, o) =>
      request(`/nodes/${encodeURIComponent(root)}/graph?depth=${o.depth}&limit=${o.limit}&disputed=${o.includeDisputed ? 1 : 0}`),
    expand: (nodeId, known, o) =>
      request("/graph/expand", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nodeId, known, limit: o.limit, includeDisputed: o.includeDisputed }),
      }),
  }), []);

  const follow = (slug: string, name: string) => {
    setNode({ slug, name });
    window.history.replaceState(null, "", `/graph?node=${encodeURIComponent(slug)}`);
  };
  const onRecenter = (n: GraphNode) => {
    follow(n.slug, n.name);
    setPickerKey((k) => k + 1);
  };

  return (
    <>
      <div className="max-w-md">
        <NodePicker
          key={pickerKey}
          name="node"
          label="Nhân vật hoặc chính thể ở trung tâm"
          initial={node ?? undefined}
          onSelect={(r) => follow(r.slug, r.name)}
        />
      </div>
      <div className="mt-6">
        {node ? (
          <EgoGraph root={node.slug} api={api} renderLink={renderNodeLink} onRootChange={onRecenter} />
        ) : (
          <p className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
            Chọn một nhân vật hoặc chính thể để xem sơ đồ những người liên quan.
          </p>
        )}
      </div>
    </>
  );
}
