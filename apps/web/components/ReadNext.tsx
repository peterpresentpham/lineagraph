import Link from "next/link";
import { ArrowLeft, ArrowRight, History, Network, Swords, Users, Landmark } from "lucide-react";
import { Section } from "@/components/Section";
import { apiGet, getLabels } from "@/lib/api";
import { centuryLabel, centuryOf, lifeSpan } from "@/lib/labels";
import type { DateValue, NodeRelation, ReadNextData, ReadRef } from "@/lib/types";

type Props = {
  slug: string;
  kind: "person" | "polity" | "event";
  /** The subject's own relationships, read for who comes before and after it. */
  relations?: NodeRelation[];
  /** Start of the subject's life or existence, for the link to its century on the timeline. */
  start?: DateValue | null;
};

// Relationship types that say who came before or after, as seen from the subject's page.
const NEXT_TYPES = new Set(["predecessor_of", "succeeded_by"]);
const PREVIOUS_TYPES = new Set(["successor_of", "succeeds"]);

const kindIcon = { person: Users, polity: Landmark, event: Swords } as const;
const kindHref = { person: "person", polity: "polity", event: "event" } as const;

const spanOf = (r: ReadRef) =>
  r.kind === "event" ? (r.start?.label ?? "") : lifeSpan(r.start, r.end);

/** "Đọc tiếp": where to go from this page, so one visit can turn into several. */
export async function ReadNext({ slug, kind, relations = [], start }: Props) {
  const [data, offices] = await Promise.all([
    apiGet<ReadNextData>(`/nodes/${slug}/read-next`).catch(() => null),
    getLabels("office_type").catch(() => ({}) as Record<string, string>),
  ]);
  const successors = relations.filter((r) => NEXT_TYPES.has(r.type));
  const predecessors = relations.filter((r) => PREVIOUS_TYPES.has(r.type));
  const contemporaries = data?.contemporaries ?? [];
  const samePolity = data?.samePolity ?? [];
  const century = start ? centuryOf(start.year) : null;

  return (
    <Section title="Đọc tiếp" description="Những trang nên xem tiếp sau trang này.">
      {(successors.length > 0 || predecessors.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {predecessors.slice(0, 2).map((r) => (
            <StepCard
              key={r.id}
              direction="back"
              label={kind === "polity" ? "Kế tục chính thể" : "Người tiền nhiệm"}
              node={r.other}
            />
          ))}
          {successors.slice(0, 2).map((r) => (
            <StepCard
              key={r.id}
              direction="forward"
              label={kind === "polity" ? "Được kế tục bởi" : "Người kế vị"}
              node={r.other}
            />
          ))}
        </div>
      )}

      {samePolity.map((group) => (
        <div key={group.polity.slug} className="mt-6">
          <h3 className="mb-3 flex items-center gap-2 text-base">
            <Landmark className="text-muted-foreground size-4" aria-hidden />
            Cùng triều đại: <Link href={`/polity/${group.polity.slug}`}>{group.polity.name}</Link>
          </h3>
          <RefGrid refs={group.people} note={(r) => (r.detail ? offices[r.detail] : undefined)} />
        </div>
      ))}

      {contemporaries.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 flex items-center gap-2 text-base">
            <History className="text-muted-foreground size-4" aria-hidden />
            Cùng thời
          </h3>
          <RefGrid refs={contemporaries} withKind />
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <ActionLink href={`/graph?node=${encodeURIComponent(slug)}`} icon={Network}>
          {kind === "polity" ? "Xem sơ đồ chính thể" : "Xem sơ đồ gia tộc"}
        </ActionLink>
        {century !== null && (
          <ActionLink href={`/timeline?c=${century}`} icon={History}>
            Xem {centuryLabel(century)} trên dòng thời gian
          </ActionLink>
        )}
      </div>
    </Section>
  );
}

type StepCardProps = {
  direction: "back" | "forward";
  label: string;
  node: { slug: string; name: string; kind: "person" | "polity" };
};

function StepCard({ direction, label, node }: StepCardProps) {
  const Arrow = direction === "back" ? ArrowLeft : ArrowRight;
  return (
    <Link
      href={`/${kindHref[node.kind]}/${node.slug}`}
      className="surface-interactive group flex items-center justify-between gap-3 p-4 no-underline"
    >
      <span className={direction === "back" ? "order-2 text-right" : ""}>
        <span className="text-muted-foreground block text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
        <span className="text-foreground block font-serif text-lg font-semibold">{node.name}</span>
      </span>
      <Arrow
        className="text-primary size-5 shrink-0 transition-transform group-hover:translate-x-1"
        aria-hidden
      />
    </Link>
  );
}

type RefGridProps = {
  refs: ReadRef[];
  /** Show a small icon for what each entry is (people, events and polities are mixed). */
  withKind?: boolean;
  note?: (ref: ReadRef) => string | undefined;
};

function RefGrid({ refs, withKind, note }: RefGridProps) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {refs.map((r) => {
        const Icon = kindIcon[r.kind];
        const span = spanOf(r);
        const extra = note?.(r);
        return (
          <li key={`${r.kind}-${r.slug}`}>
            <Link
              href={`/${kindHref[r.kind]}/${r.slug}`}
              className="surface-interactive flex items-center gap-3 p-3 no-underline"
            >
              {withKind && <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />}
              <span className="min-w-0">
                <span className="text-foreground block truncate font-medium">{r.name}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {[extra, span].filter(Boolean).join(" · ")}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

type ActionLinkProps = {
  href: string;
  icon: typeof Network;
  children: React.ReactNode;
};

function ActionLink({ href, icon: Icon, children }: ActionLinkProps) {
  return (
    <Link
      href={href}
      className="bg-card hover:bg-muted text-foreground inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium no-underline transition-colors"
    >
      <Icon className="size-4" aria-hidden /> {children}
    </Link>
  );
}
