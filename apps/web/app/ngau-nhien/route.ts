import { NextResponse } from "next/server";
import { API_URL, SITE_URL } from "@/lib/site";

// Never cache: every visit should land somewhere different.
export const dynamic = "force-dynamic";

const KINDS = ["person", "polity", "event"];

// "Xem ngẫu nhiên": sends the visitor to a random person, polity or event.
export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get("loai") ?? "person";
  const kind = KINDS.includes(asked) ? asked : "person";
  let target = "/";
  try {
    const res = await fetch(`${API_URL}/random?kind=${kind}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const { slug } = (await res.json()) as { slug: string | null };
      if (slug) target = `/${kind}/${slug}`;
    }
  } catch {
    // The API is down: the home page is a better landing than an error.
  }
  const response = NextResponse.redirect(new URL(target, SITE_URL), 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
