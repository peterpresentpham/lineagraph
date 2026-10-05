"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Button } from "@lineagraph/ui";
import { categoryLabels, variantLabels } from "@/lib/labels";
import type { NodeRelation } from "@/lib/types";

type RelationListProps = { relations: NodeRelation[] };

const INITIAL_COUNT = 4;

// Relationships of one person or polity, grouped by category and read from its point of view.
// Starts collapsed to a handful of items so a person with a long record doesn't push the rest
// of the page down; "Tải thêm" reveals the remainder in place.
export function RelationList({ relations }: RelationListProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? relations : relations.slice(0, INITIAL_COUNT);
  const hidden = relations.length - visible.length;

  const groups = new Map<string, NodeRelation[]>();
  for (const r of visible) groups.set(r.category, [...(groups.get(r.category) ?? []), r]);
  return (
    <div className="flex flex-col gap-5">
      {[...groups.entries()].map(([category, items]) => (
        <div key={category}>
          <h3 className="eyebrow mb-3 !text-muted-foreground">{categoryLabels[category] ?? category}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((r) => (
              <Link
                key={r.id}
                href={`/${r.other.kind}/${r.other.slug}`}
                className="surface-interactive block px-4 py-3"
              >
                <div className="text-muted-foreground text-xs">
                  {r.typeLabel}
                  {r.variant && variantLabels[r.variant] ? ` (${variantLabels[r.variant]})` : ""}
                </div>
                <div className="text-foreground font-semibold">{r.other.name}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {r.label && <Badge variant="info">{r.label}</Badge>}
                  {r.disputed && <Badge variant="warning">Còn tranh cãi</Badge>}
                  {(r.start || r.end) && (
                    <span className="text-muted-foreground text-xs">
                      {r.start?.label ?? "?"} – {r.end?.label ?? "?"}
                    </span>
                  )}
                </div>
                {r.note && <p className="text-muted-foreground mt-1 text-sm">{r.note}</p>}
              </Link>
            ))}
          </div>
        </div>
      ))}
      {hidden > 0 && (
        <Button
          type="button"
          variant="secondary"
          className="self-start"
          onClick={() => setExpanded(true)}
        >
          Tải thêm ({hidden})
        </Button>
      )}
    </div>
  );
}

type AttributesProps = { items: { type: string; label: string; value: string }[] };

export function Attributes({ items }: AttributesProps) {
  return (
    <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
      {items.map((a, i) => (
        <div key={i} className="flex gap-3 border-b py-1.5">
          <dt className="text-muted-foreground w-32 shrink-0">{a.label}</dt>
          <dd>{a.value}</dd>
        </div>
      ))}
    </dl>
  );
}
