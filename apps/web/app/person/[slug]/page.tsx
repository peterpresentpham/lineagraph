import { PagePlaceholder } from "@/components/page-placeholder";

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PagePlaceholder title="Trang nhân vật" note={slug} />;
}
