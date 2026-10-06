import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCard } from "@/components/EventCard";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { Empty } from "@/components/Section";
import { apiGet, getLabels } from "@/lib/api";
import type { EventSummary } from "@/lib/types";

export const metadata: Metadata = {
  title: "Sự kiện",
  description: "Trận đánh, hiệp ước, lễ đăng quang và các sự kiện lịch sử, theo thứ tự thời gian.",
};
const PAGE_SIZE = 24;

type Props = { searchParams: Promise<{ page?: string; type?: string }> };

export default async function EventsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const typeLabels = await getLabels("event_type");
  const type = params.type && params.type in typeLabels ? params.type : "";
  const { items, total } = await apiGet<{ items: EventSummary[]; total: number }>(
    `/events?limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}${type ? `&type=${encodeURIComponent(type)}` : ""}`,
  );
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > pages) notFound();
  const hrefFor = (p: number, t = type) =>
    `/events?${new URLSearchParams({ ...(t ? { type: t } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <>
      <PageHeader
        eyebrow="Biến cố lịch sử"
        title="Sự kiện"
        description={`${total} sự kiện, theo thứ tự thời gian.`}
      />
      <nav aria-label="Lọc theo loại" className="mt-6 flex flex-wrap gap-2">
        {[["", "Tất cả"], ...Object.entries(typeLabels)].map(([code, label]) => (
          <Link
            key={code || "all"}
            href={hrefFor(1, code)}
            aria-current={code === type ? "true" : undefined}
            className={
              code === type
                ? "border-primary bg-accent text-foreground rounded-full border px-3 py-1 text-xs"
                : "bg-card text-muted-foreground hover:text-foreground rounded-full border px-3 py-1 text-xs"
            }
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-8">
        {items.length === 0 ? (
          <Empty>Chưa có dữ liệu.</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
      <Pagination page={page} pages={pages} hrefFor={hrefFor} />
    </>
  );
}
