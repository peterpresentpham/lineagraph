import Link from "next/link";
import { Button } from "@lineagraph/ui";

type Props = {
  page: number;
  pages: number;
  /** Builds the URL of another page, keeping the other filters in the query string. */
  hrefFor: (page: number) => string;
};

// Previous / next links for a list page. The buttons are the links themselves (asChild), so each
// control is one focusable element rather than a button nested inside a link.
export function Pagination({ page, pages, hrefFor }: Props) {
  if (pages <= 1) return null;
  return (
    <nav
      aria-label="Phân trang"
      className="text-muted-foreground mt-6 flex items-center justify-center gap-3 text-sm"
    >
      {page > 1 && (
        <Button asChild variant="secondary" size="sm">
          <Link href={hrefFor(page - 1)} rel="prev">
            Trước
          </Link>
        </Button>
      )}
      <span aria-current="page">
        Trang {page}/{pages}
      </span>
      {page < pages && (
        <Button asChild variant="secondary" size="sm">
          <Link href={hrefFor(page + 1)} rel="next">
            Sau
          </Link>
        </Button>
      )}
    </nav>
  );
}
