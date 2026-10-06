import { apiGet } from "@/lib/api";
import { lifeSpan } from "@/lib/labels";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/ogImage";
import type { PersonDetail } from "@/lib/types";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Nhân vật trên Sử Phả";

type Props = { params: Promise<{ slug: string }> };

export default async function Image({ params }: Props) {
  const person = await apiGet<PersonDetail>(`/persons/${(await params).slug}`);
  return renderOgImage({
    title: person.name,
    kind: "Nhân vật",
    subtitle: lifeSpan(person.birth, person.death) || undefined,
  });
}
