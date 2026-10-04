"use client";

import { useRouter } from "next/navigation";
import type { SearchResult } from "@/lib/types";
import { NodePicker } from "./NodePicker";

type Props = { subjectSlug: string };

// Lets a visitor ask "how is this person/polity related to...?" without leaving the page: pick
// someone and jump straight to the computed result on /relations, both ends already filled in.
export function RelationCompare({ subjectSlug }: Props) {
  const router = useRouter();

  return (
    <div className="max-w-sm">
      <NodePicker
        name="b"
        label="So sánh quan hệ với..."
        onSelect={(r: SearchResult) => {
          if (r.slug === subjectSlug) return;
          router.push(`/relations?a=${subjectSlug}&b=${r.slug}`);
        }}
      />
    </div>
  );
}
