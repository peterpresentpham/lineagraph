"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { GraphNode } from "@lineagraph/ui/graph";
import { egoApi } from "@/lib/egoApi";
import { NodePicker } from "./NodePicker";
import { renderNodeLink } from "./GraphClient";

const EgoGraph = dynamic(() => import("@lineagraph/ui/graph").then((m) => m.EgoGraph), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground grid h-96 place-items-center rounded-2xl border">
      Đang dựng sơ đồ...
    </div>
  ),
});

type Props = { initial?: { slug: string; name: string } };

// Pick someone, see the people around them, grow the picture on demand.
export function GraphExplorer({ initial }: Props) {
  const [node, setNode] = useState(initial ?? null);
  const [pickerKey, setPickerKey] = useState(0);

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
          <EgoGraph
            root={node.slug}
            api={egoApi}
            renderLink={renderNodeLink}
            onRootChange={onRecenter}
          />
        ) : (
          <p className="text-muted-foreground bg-dots rounded-2xl border border-dashed p-10 text-center">
            Chọn một nhân vật hoặc chính thể để xem sơ đồ những người liên quan.
          </p>
        )}
      </div>
    </>
  );
}
