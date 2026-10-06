import Link from "next/link";
import type { RenderNodeLink } from "@lineagraph/ui/graph";

// How the graph links a node's name to its page: through Next's router rather than a full reload.
export const renderNodeLink: RenderNodeLink = (node, { className, children }) => (
  <Link href={`/${node.kind}/${node.slug}`} className={className}>
    {children}
  </Link>
);
