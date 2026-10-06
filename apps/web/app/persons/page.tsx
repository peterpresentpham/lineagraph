import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@lineagraph/ui";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { PersonCard } from "@/components/PersonCard";
import { Empty } from "@/components/Section";
import { apiGet } from "@/lib/api";
import type { PersonSummary } from "@/lib/types";

export const metadata: Metadata = {
  title: "Nhân vật",
  description: "Danh sách nhân vật lịch sử thế giới, tra cứu theo tên.",
};
const PAGE_SIZE = 24;

type Props = { searchParams: Promise<{ page?: string; q?: string }> };

export default async function PersonsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number(params.page) || 1);
  const { items, total } = await apiGet<{ items: PersonSummary[]; total: number }>(
    `/persons?limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    { fresh: !!q },
  );
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // A page past the end is a dead link, not an empty list.
  if (page > pages) notFound();
  const hrefFor = (p: number) =>
    `/persons?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <>
      <PageHeader
        eyebrow="Tra cứu"
        title="Nhân vật"
        description={
          q ? `${total} nhân vật có tên chứa "${q}".` : `${total} nhân vật, sắp xếp theo tên.`
        }
      />
      <form action="/persons" className="mt-6 flex max-w-xl gap-2">
        <label className="flex-1">
          <span className="sr-only">Lọc theo tên</span>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Lọc theo tên, không cần gõ dấu..."
            className="border-input bg-card focus:border-ring focus:ring-ring/25 h-11 w-full rounded-xl border px-4 text-[15px] outline-none transition focus:ring-4"
          />
        </label>
        <Button type="submit">Lọc</Button>
      </form>
      <div className="mt-8">
        {items.length === 0 ? (
          <Empty>{q ? "Không có nhân vật nào khớp." : "Chưa có dữ liệu."}</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => (
              <PersonCard key={p.id} person={p} />
            ))}
          </div>
        )}
      </div>
      <Pagination page={page} pages={pages} hrefFor={hrefFor} />
    </>
  );
}
