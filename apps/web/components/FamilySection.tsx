import Link from "next/link";
import { Badge } from "@lineagraph/ui";
import { dateKey, variantLabels } from "@/lib/labels";
import type { NodeRelation } from "@/lib/types";

type Props = { relations: NodeRelation[] };

type Group = { title: string; items: NodeRelation[] };

// Parents, spouses and children of a person, picked out of their relations (read from their own
// point of view: `child_of` means the other person is a parent). Spouses come in the order of
// their marriages, so a person with several can be read as a sequence.
export function FamilySection({ relations }: Props) {
  const byDate = (a: NodeRelation, b: NodeRelation) =>
    (dateKey(a.start) ?? Infinity) - (dateKey(b.start) ?? Infinity);
  const groups: Group[] = [
    { title: "Cha mẹ", items: relations.filter((r) => r.type === "child_of") },
    { title: "Vợ / chồng", items: relations.filter((r) => r.type === "spouse_of").sort(byDate) },
    { title: "Con", items: relations.filter((r) => r.type === "parent_of").sort(byDate) },
  ].filter((g) => g.items.length > 0);
  if (groups.length === 0) return null;
  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {groups.map((g) => (
        <div key={g.title}>
          <h3 className="eyebrow !text-muted-foreground mb-3">{g.title}</h3>
          <ol className="flex flex-col gap-2">
            {g.items.map((r, i) => (
              <li key={r.id}>
                <Link
                  href={`/${r.other.kind}/${r.other.slug}`}
                  className="surface-interactive block px-3.5 py-2.5"
                >
                  <div className="text-foreground font-semibold">
                    {g.title === "Vợ / chồng" && g.items.length > 1 && (
                      <span className="text-muted-foreground mr-1.5 font-normal">{i + 1}.</span>
                    )}
                    {r.other.name}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    {r.variant && variantLabels[r.variant] && (
                      <Badge variant="neutral">{variantLabels[r.variant]}</Badge>
                    )}
                    {r.disputed && <Badge variant="warning">Còn tranh cãi</Badge>}
                    {(r.start || r.end) && (
                      <span className="text-muted-foreground">
                        {r.start?.label ?? "?"} – {r.end?.label ?? "?"}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
