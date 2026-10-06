import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { Empty } from "@/components/Section";
import { apiGet } from "@/lib/api";
import type { BibliographyEntry } from "@/lib/types";

export const metadata: Metadata = {
  title: "Nguồn tư liệu",
  description:
    "Thư mục các sách sử, công trình nghiên cứu và bách khoa toàn thư được dùng làm căn cứ cho dữ liệu của Sử Phả, kèm giấy phép sử dụng của từng nguồn.",
  alternates: { canonical: "/nguon" },
};

const PAGE_SIZE = 50;

type Props = { searchParams: Promise<{ page?: string }> };

// Rendered per request: it reads the API, which is not running while the site is built.
export const dynamic = "force-dynamic";

export default async function SourcesPage({ searchParams }: Props) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { items, total } = await apiGet<{ items: BibliographyEntry[]; total: number }>(
    `/bibliography?limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}`,
  );
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > pages) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Thư mục"
        title="Nguồn tư liệu"
        description={`${total} nguồn đang được dùng làm căn cứ. Mỗi trang nhân vật, chính thể và sự kiện nêu nguồn của riêng nó, kèm vị trí trong nguồn.`}
      />
      <div className="mt-8">
        {items.length === 0 ? (
          <Empty>Dữ liệu đang được biên soạn, chưa có nguồn nào để liệt kê.</Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((s) => (
              <li key={s.id} className="surface p-4">
                <div className="font-semibold">
                  {s.url && /^https?:\/\//i.test(s.url) ? (
                    <a href={s.url} target="_blank" rel="noreferrer noopener" className="underline">
                      {s.title}
                    </a>
                  ) : (
                    s.title
                  )}
                </div>
                <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {s.author && <span>{s.author}</span>}
                  {s.kind && <span>{s.kind}</span>}
                  <span>Giấy phép: {s.license ?? "chưa rõ"}</span>
                  <span>{s.citations} trích dẫn</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Pagination
        page={page}
        pages={pages}
        hrefFor={(p) => (p > 1 ? `/nguon?page=${p}` : "/nguon")}
      />
    </>
  );
}
