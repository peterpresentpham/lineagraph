import Link from "next/link";
import { Flag } from "lucide-react";

type Props = {
  /** Path of the page the report is about, such as "/person/le-loi". */
  path: string;
};

// "Báo lỗi trang này": opens the report page with this page's address filled in.
export function ReportLink({ path }: Props) {
  return (
    <Link
      href={`/bao-loi?trang=${encodeURIComponent(path)}`}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm underline"
    >
      <Flag className="size-4" aria-hidden /> Báo lỗi trang này
    </Link>
  );
}
