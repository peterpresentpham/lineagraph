import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@lineagraph/ui";
import { Empty } from "@/components/Section";
import { apiGet } from "@/lib/api";
import type { SearchResult } from "@/lib/types";

export const metadata: Metadata = {
  title: "Tìm kiếm",
  description: "Tìm nhân vật hoặc chính thể trong lịch sử Việt Nam theo tên, không cần gõ dấu.",
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const results = q.trim()
    ? await apiGet<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`)
    : [];

  return (
    <>
      <h1>{q ? `Kết quả cho "${q}"` : "Tìm kiếm"}</h1>
      <p className="text-muted-foreground mt-1">
        Tìm theo mọi tên của nhân vật hoặc chính thể, không cần gõ dấu.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        {!q.trim() ? (
          <Empty>Nhập từ khoá vào ô tìm kiếm phía trên.</Empty>
        ) : results.length === 0 ? (
          <Empty>Không tìm thấy kết quả nào.</Empty>
        ) : (
          results.map((r) => (
            <Link
              key={`${r.kind}-${r.slug}`}
              href={`/${r.kind}/${r.slug}`}
              className="bg-card flex items-center justify-between rounded-[var(--radius)] border p-4 no-underline transition-shadow hover:no-underline hover:shadow-md"
            >
              <div>
                <div className="text-foreground font-semibold">{r.name}</div>
                {r.matched !== r.name && (
                  <div className="text-muted-foreground text-sm">Còn gọi là: {r.matched}</div>
                )}
              </div>
              <Badge variant={r.kind === "person" ? "info" : "success"}>
                {r.kind === "person" ? "Nhân vật" : "Chính thể"}
              </Badge>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
