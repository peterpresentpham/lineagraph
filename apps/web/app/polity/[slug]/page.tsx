import { PagePlaceholder } from "@/components/page-placeholder";

export default async function PolityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PagePlaceholder title="Trang chính thể / triều đại" note={slug} />;
}
