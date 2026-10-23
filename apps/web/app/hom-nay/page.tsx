import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Empty } from "@/components/Section";
import { TodayList } from "@/components/TodayList";
import { apiGet } from "@/lib/api";
import type { TodayEntry } from "@/lib/types";

type Props = { searchParams: Promise<{ d?: string }> };

type TodayData = { month: number; day: number; entries: TodayEntry[] };

export const metadata: Metadata = {
  title: "Hôm nay trong lịch sử",
  description: "Những nhân vật sinh ra, qua đời và những sự kiện xảy ra vào đúng ngày này.",
  alternates: { canonical: "/hom-nay" },
};

// The page shows today's date, and the API is not running while the site is built.
export const dynamic = "force-dynamic";

/** `?d=3-15` for 15 March; anything else means "today". */
function parseDay(value: string | undefined): { month: number; day: number } | null {
  const match = /^(\d{1,2})-(\d{1,2})$/.exec(value ?? "");
  if (!match) return null;
  const [month, day] = [Number(match[1]), Number(match[2])];
  return month >= 1 && month <= 12 && day >= 1 && day <= 31 ? { month, day } : null;
}

/** The day before or after, counted in a leap year so 29 February can be reached. */
function shiftDay(month: number, day: number, by: number) {
  const date = new Date(Date.UTC(2000, month - 1, day + by));
  return `${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
}

export default async function TodayPage({ searchParams }: Props) {
  const picked = parseDay((await searchParams).d);
  const query = picked ? `?month=${picked.month}&day=${picked.day}` : "";
  const data = await apiGet<TodayData>(`/today${query}`, { fresh: true }).catch(() => null);
  const currentYear = new Date().getFullYear();

  return (
    <>
      <PageHeader
        hero
        eyebrow="Hôm nay trong lịch sử"
        title={data ? `Ngày ${data.day} tháng ${data.month}` : "Hôm nay trong lịch sử"}
        description="Ai sinh ra, ai qua đời và việc gì đã xảy ra vào đúng ngày này, qua các thời đại."
      />
      {data && (
        <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Chọn ngày">
          <Link
            href={`/hom-nay?d=${shiftDay(data.month, data.day, -1)}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium"
          >
            <ArrowLeft className="size-4" aria-hidden /> Hôm trước
          </Link>
          {picked && (
            <Link href="/hom-nay" className="text-sm font-medium">
              Về hôm nay
            </Link>
          )}
          <Link
            href={`/hom-nay?d=${shiftDay(data.month, data.day, 1)}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium"
          >
            Hôm sau <ArrowRight className="size-4" aria-hidden />
          </Link>
        </nav>
      )}
      <div className="mt-8">
        {!data ? (
          <Empty>Không tải được dữ liệu lúc này, bạn thử lại sau ít giây.</Empty>
        ) : data.entries.length === 0 ? (
          <Empty>
            Chưa có nhân vật hay sự kiện nào được ghi đúng ngày này. Hãy thử{" "}
            <Link href={`/hom-nay?d=${shiftDay(data.month, data.day, 1)}`}>ngày hôm sau</Link>.
          </Empty>
        ) : (
          <TodayList entries={data.entries} currentYear={currentYear} />
        )}
      </div>
    </>
  );
}
