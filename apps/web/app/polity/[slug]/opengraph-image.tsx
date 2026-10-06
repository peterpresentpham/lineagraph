import { apiGet, getLabels } from "@/lib/api";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/ogImage";
import type { PolityDetail } from "@/lib/types";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Chính thể trên Sử Phả";

type Props = { params: Promise<{ slug: string }> };

export default async function Image({ params }: Props) {
  const polity = await apiGet<PolityDetail>(`/polities/${(await params).slug}`);
  const types = await getLabels("polity_type");
  const span =
    polity.started || polity.ended
      ? `${polity.started?.label ?? "?"} – ${polity.ended?.label ?? "?"}`
      : "";
  return renderOgImage({
    title: polity.name,
    kind: "Chính thể",
    subtitle: [types[polity.polityType] ?? polity.polityType, span].filter(Boolean).join(" · "),
  });
}
