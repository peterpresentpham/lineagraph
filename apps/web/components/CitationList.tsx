import { Badge } from "@lineagraph/ui";
import type { Citation } from "@/lib/types";

type Props = { citations: Citation[] };

// Sources behind a page. Sources that disagree with what the page says are listed apart, under
// their own heading, so a reader sees both sides of a contested fact.
export function CitationList({ citations }: Props) {
  const disputing = citations.filter((c) => c.stance === "disputes");
  const rest = citations.filter((c) => c.stance !== "disputes");
  return (
    <div className="flex flex-col gap-5">
      {rest.length > 0 && <Items items={rest} />}
      {disputing.length > 0 && (
        <div>
          <h3 className="eyebrow !text-muted-foreground mb-3">Nguồn ghi khác</h3>
          <Items items={disputing} />
        </div>
      )}
    </div>
  );
}

type ItemsProps = { items: Citation[] };

function Items({ items }: ItemsProps) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((c) => (
        <li key={c.id} className="surface p-4 text-sm">
          <div className="font-medium">
            {c.source.url ? (
              <a href={c.source.url} target="_blank" rel="noreferrer">
                {c.source.title}
              </a>
            ) : (
              c.source.title
            )}
            {c.source.author && (
              <span className="text-muted-foreground font-normal"> — {c.source.author}</span>
            )}
            {c.stance === "disputes" && (
              <Badge variant="warning" className="ml-2 align-middle">
                Phản bác
              </Badge>
            )}
          </div>
          {c.locator && <div className="text-muted-foreground">{c.locator}</div>}
          {c.quote && (
            <blockquote className="text-muted-foreground mt-2 border-l-2 pl-3">
              {c.quote}
            </blockquote>
          )}
        </li>
      ))}
    </ul>
  );
}
