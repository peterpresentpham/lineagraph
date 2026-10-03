import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@lineagraph/ui";
import { PersonCard } from "@/components/PersonCard";
import { Empty } from "@/components/Section";
import { apiGet } from "@/lib/api";
import type { PersonSummary } from "@/lib/types";

export const metadata: Metadata = {
  title: "Nhân vật",
  description: "Danh sách nhân vật lịch sử Việt Nam, tra cứu theo tên.",
};
const PAGE_SIZE = 24;

type Props = { searchParams: Promise<{ page?: string }> };

export default async function PersonsPage({ searchParams }: Props) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { items, total } = await apiGet<{ items: PersonSummary[]; total: number }>(
    `/persons?limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}`,
  );
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <h1>Nhân vật</h1>
      <p className="text-muted-foreground mt-1">{total} nhân vật, sắp xếp theo tên.</p>
      <div className="mt-6">
        {items.length === 0 ? (
          <Empty>Chưa có dữ liệu.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <PersonCard key={p.id} person={p} />
            ))}
          </div>
        )}
      </div>
      {pages > 1 && (
        <div className="text-muted-foreground mt-6 flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link href={`/persons?page=${page - 1}`}>
              <Button variant="secondary" size="sm">
                Trước
              </Button>
            </Link>
          )}
          Trang {page}/{pages}
          {page < pages && (
            <Link href={`/persons?page=${page + 1}`}>
              <Button variant="secondary" size="sm">
                Sau
              </Button>
            </Link>
          )}
        </div>
      )}
    </>
  );
}
