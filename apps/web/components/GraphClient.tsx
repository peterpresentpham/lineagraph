"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { GraphView, RenderNodeLink } from "@lineagraph/ui/graph";

// React Flow needs the browser, so it is loaded on the client only.
const RelationGraph = dynamic(() => import("@lineagraph/ui/graph").then((m) => m.RelationGraph), {
  ssr: false,
  loading: () => <div className="grid h-96 place-items-center rounded-md border text-muted-foreground">Đang vẽ sơ đồ...</div>,
});

export const renderNodeLink: RenderNodeLink = (node, { className, children }) => (
  <Link href={`/${node.kind}/${node.slug}`} className={className}>{children}</Link>
);

export function GraphClient({ data, height }: { data: GraphView; height?: number }) {
  return <RelationGraph data={data} height={height} renderLink={renderNodeLink} />;
}
