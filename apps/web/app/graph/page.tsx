import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { GraphExplorer } from "@/components/GraphExplorer";
import { apiGet } from "@/lib/api";

export const metadata: Metadata = {
  title: "Sơ đồ quan hệ",
  description: "Sơ đồ trực quan quan hệ giữa nhân vật và chính thể trong lịch sử Việt Nam.",
};

type Props = { searchParams: Promise<{ node?: string }> };

export default async function GraphPage({ searchParams }: Props) {
  const { node } = await searchParams;
  let initial: { slug: string; name: string } | undefined;
  if (node) {
    try {
      const found = await apiGet<{ name: string }>(`/persons/${encodeURIComponent(node)}`);
      initial = { slug: node, name: found.name };
    } catch {
      // Not a person: it may be a polity.
      try {
        const found = await apiGet<{ name: string }>(`/polities/${encodeURIComponent(node)}`);
        initial = { slug: node, name: found.name };
      } catch {
        /* unknown slug: start with an empty picker */
      }
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="Khám phá"
        title="Sơ đồ quan hệ"
        description="Chọn một nhân vật hoặc chính thể để xem những ai liên quan quanh họ. Mỗi lần hiện một số lượng vừa phải, bấm “+N” hoặc “Tải thêm” để mở rộng."
        className="mb-8"
      />
      <GraphExplorer key={initial?.slug ?? "none"} initial={initial} />
    </>
  );
}
