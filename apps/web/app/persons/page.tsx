import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@lineagraph/ui";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { PersonCard } from "@/components/PersonCard";
import { Empty } from "@/components/Section";
import { apiGet } from "@/lib/api";
import { listMetadata } from "@/lib/seo";
import type { PersonSummary } from "@/lib/types";

const PAGE_SIZE = 24;

type Props = {
  searchParams: Promise<{ page?: string; q?: string; sort?: string; sex?: string }>;
};

const SORTS = {
  name: "Theo tên",
  birth: "Theo năm sinh",
  notable: "Nổi bật trước",
} as const;
type SortKey = keyof typeof SORTS;
const SEXES = { male: "Nam", female: "Nữ" } as const;
type SexKey = keyof typeof SEXES;

// Only known values are passed on, so a mistyped filter shows everything instead of nothing.
const sortOf = (v?: string): SortKey => (v === "birth" || v === "notable" ? v : "name");
const sexOf = (v?: string): SexKey | null => (v === "male" || v === "female" ? v : null);

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  return listMetadata({
    title: "Nhân vật",
    description: "Danh sách nhân vật lịch sử thế giới, tra cứu theo tên.",
    path: "/persons",
    page: Math.max(1, Number(params.page) || 1),
    filtered: !!params.q?.trim() || !!sexOf(params.sex) || sortOf(params.sort) !== "name",
  });
}

export default async function PersonsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number(params.page) || 1);
  const sort = sortOf(params.sort);
  const sex = sexOf(params.sex);
  const { items, total } = await apiGet<{ items: PersonSummary[]; total: number }>(
    `/persons?${new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String((page - 1) * PAGE_SIZE),
      sort,
      ...(q ? { q } : {}),
      ...(sex ? { sex } : {}),
    })}`,
    { fresh: !!q },
  );
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // A page past the end is a dead link, not an empty list.
  if (page > pages) notFound();
  const hrefFor = (p: number) =>
    `/persons?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(sex ? { sex } : {}),
      ...(sort !== "name" ? { sort } : {}),
      ...(p > 1 ? { page: String(p) } : {}),
    })}`;

  return (
    <>
      <PageHeader
        eyebrow="Tra cứu"
        title="Nhân vật"
        description={
          q
            ? `${total} nhân vật có tên chứa "${q}".`
            : `${total} nhân vật${sex ? ` (${SEXES[sex].toLowerCase()})` : ""}, ${SORTS[sort].toLowerCase()}.`
        }
      />
      <form action="/persons" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1">
          <span className="sr-only">Lọc theo tên</span>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Lọc theo tên, không cần gõ dấu..."
            className="border-input bg-card focus:border-ring focus:ring-ring/25 h-11 w-full rounded-xl border px-4 text-[15px] outline-none transition focus:ring-4"
          />
        </label>
        <label className="text-muted-foreground text-sm">
          <span className="mb-1 block">Giới tính</span>
          <select
            name="sex"
            defaultValue={sex ?? ""}
            className="border-input bg-card h-11 rounded-xl border px-3 text-[15px]"
          >
            <option value="">Tất cả</option>
            {Object.entries(SEXES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-muted-foreground text-sm">
          <span className="mb-1 block">Sắp xếp</span>
          <select
            name="sort"
            defaultValue={sort}
            className="border-input bg-card h-11 rounded-xl border px-3 text-[15px]"
          >
            {Object.entries(SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">Lọc</Button>
      </form>
      <div className="mt-8">
        {items.length === 0 ? (
          <Empty>{q || sex ? "Không có nhân vật nào khớp." : "Dữ liệu đang được biên soạn."}</Empty>
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
