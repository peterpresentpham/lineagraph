import { PagePlaceholder } from "@/components/page-placeholder";

export default async function TreePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PagePlaceholder title="Cây phả hệ hoàng tộc" note={slug} />;
}
