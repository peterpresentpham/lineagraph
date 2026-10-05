import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { PolityCard } from "@/components/PolityCard";
import { Empty } from "@/components/Section";
import { apiGet, getLabels } from "@/lib/api";
import type { PolitySummary } from "@/lib/types";

export const metadata: Metadata = {
  title: "Chính thể",
  description: "Danh sách triều đại và chính quyền trong lịch sử Việt Nam, theo thứ tự thời gian.",
};

export default async function PolitiesPage() {
  const [polities, typeLabels] = await Promise.all([
    apiGet<PolitySummary[]>("/polities"),
    getLabels("polity_type"),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Triều đại & chính quyền"
        title="Chính thể"
        description="Các triều đại và chính quyền, theo thứ tự thời gian."
      />
      <div className="mt-8">
        {polities.length === 0 ? (
          <Empty>Chưa có dữ liệu.</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {polities.map((p) => (
              <PolityCard key={p.id} polity={p} typeLabel={typeLabels[p.polityType] ?? p.polityType} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
