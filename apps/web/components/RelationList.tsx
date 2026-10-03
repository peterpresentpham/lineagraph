import Link from "next/link";
import { Badge } from "@lineagraph/ui";
import { categoryLabels, variantLabels } from "@/lib/labels";
import type { NodeRelation } from "@/lib/types";

// Relationships of one person or polity, grouped by category and read from its point of view.
export function RelationList({ relations }: { relations: NodeRelation[] }) {
  const groups = new Map<string, NodeRelation[]>();
  for (const r of relations) groups.set(r.category, [...(groups.get(r.category) ?? []), r]);
  return (
    <div className="flex flex-col gap-5">
      {[...groups.entries()].map(([category, items]) => (
        <div key={category}>
          <h3 className="mb-2 text-muted-foreground">{categoryLabels[category] ?? category}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((r) => (
              <Link
                key={r.id}
                href={`/${r.other.kind}/${r.other.slug}`}
                className="block rounded-md border bg-card px-4 py-3 no-underline transition-shadow hover:no-underline hover:shadow-md"
              >
                <div className="text-xs text-muted-foreground">
                  {r.typeLabel}
                  {r.variant && variantLabels[r.variant] ? ` (${variantLabels[r.variant]})` : ""}
                </div>
                <div className="font-semibold text-foreground">{r.other.name}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {r.label && <Badge variant="info">{r.label}</Badge>}
                  {r.disputed && <Badge variant="warning">Còn tranh cãi</Badge>}
                  {(r.start || r.end) && (
                    <span className="text-xs text-muted-foreground">{r.start?.label ?? "?"} – {r.end?.label ?? "?"}</span>
                  )}
                </div>
                {r.note && <p className="mt-1 text-sm text-muted-foreground">{r.note}</p>}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Attributes({ items }: { items: { type: string; label: string; value: string }[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
      {items.map((a, i) => (
        <div key={i} className="flex gap-3 border-b py-1.5">
          <dt className="w-32 shrink-0 text-muted-foreground">{a.label}</dt>
          <dd>{a.value}</dd>
        </div>
      ))}
    </dl>
  );
}
