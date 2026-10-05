import Link from "next/link";
import { Landmark } from "lucide-react";
import { Badge } from "@lineagraph/ui";
import type { PolitySummary } from "@/lib/types";

type Props = { polity: PolitySummary; typeLabel: string };

export function PolityCard({ polity, typeLabel }: Props) {
  return (
    <Link href={`/polity/${polity.slug}`} className="surface-interactive group flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="bg-accent text-accent-foreground grid size-10 place-items-center rounded-xl">
          <Landmark className="size-5" />
        </span>
        <Badge variant="neutral">{typeLabel}</Badge>
      </div>
      <div className="text-foreground mt-4 font-serif text-xl font-semibold">{polity.name}</div>
      <div className="text-muted-foreground mt-0.5 text-sm">
        {polity.started || polity.ended
          ? `${polity.started?.label ?? "?"} – ${polity.ended?.label ?? "?"}`
          : "Chưa rõ thời gian"}
      </div>
    </Link>
  );
}
