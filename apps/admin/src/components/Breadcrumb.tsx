import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

type Props = {
  /** The section list this page belongs to, e.g. "Nhân vật" -> /persons. */
  section: { label: string; to: string };
  /** The record being edited; "Thêm mới" for a new one. */
  current: string;
};

// Trail at the top of a detail page: the list it came from, then the record.
export function Breadcrumb({ section, current }: Props) {
  return (
    <nav
      aria-label="Vị trí hiện tại"
      className="text-muted-foreground mb-3 flex items-center gap-1 text-sm"
    >
      <Link to={section.to} className="hover:text-foreground">
        {section.label}
      </Link>
      <ChevronRight className="size-4" aria-hidden />
      <span className="text-foreground max-w-[60ch] truncate" aria-current="page">
        {current}
      </span>
    </nav>
  );
}
