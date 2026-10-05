"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Network } from "lucide-react";
import { Button } from "@lineagraph/ui";
import { egoApi } from "@/lib/egoApi";
import { renderNodeLink } from "./GraphClient";

const EgoGraph = dynamic(() => import("@lineagraph/ui/graph").then((m) => m.EgoGraph), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground grid h-[420px] place-items-center rounded-2xl border">
      Đang dựng sơ đồ...
    </div>
  ),
});

type Props = { slug: string; height?: number };

// The same ego-graph as /graph, rooted here and sized to live inline on a person/polity page
// instead of sending the visitor to a separate page. Both React Flow's bundle and the graph
// fetch are deferred behind a click so the page itself isn't held up by a widget that may not
// even be looked at. Clicking ◎ recenters the view in place; clicking a name still opens that
// entity's own page. "Mở sơ đồ đầy đủ" hands off to /graph for deeper, multi-step exploration
// with the depth/picker controls that don't fit here.
export function EntityEgoGraph({ slug, height = 420 }: Props) {
  const [show, setShow] = useState(false);

  if (!show) {
    return (
      <button
        type="button"
        onClick={() => setShow(true)}
        className="text-muted-foreground hover:border-primary hover:text-foreground bg-dots flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed transition-colors"
      >
        <Network className="size-5" />
        Xem sơ đồ quan hệ
      </button>
    );
  }

  return (
    <div>
      <EgoGraph root={slug} api={egoApi} renderLink={renderNodeLink} height={height} />
      <div className="mt-2 flex items-center justify-between">
        <Link
          href={`/graph?node=${encodeURIComponent(slug)}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          Mở sơ đồ đầy đủ →
        </Link>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShow(false)}>
          Ẩn sơ đồ
        </Button>
      </div>
    </div>
  );
}
