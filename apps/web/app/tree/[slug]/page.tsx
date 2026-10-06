import { permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

// The old per-person tree page now lives in the interactive graph.
export default async function TreePage({ params }: Props) {
  permanentRedirect(`/graph?node=${encodeURIComponent((await params).slug)}`);
}
