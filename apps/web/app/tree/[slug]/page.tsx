import { redirect } from "next/navigation";

// The old per-person tree page now lives in the interactive graph.
export default async function TreePage({ params }: { params: Promise<{ slug: string }> }) {
  redirect(`/graph?node=${encodeURIComponent((await params).slug)}`);
}
