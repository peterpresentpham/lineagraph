import type { Metadata } from "next";
import { ChallengeGame } from "@/components/ChallengeGame";
import { PageHeader } from "@/components/PageHeader";
import { Empty } from "@/components/Section";
import { apiGet } from "@/lib/api";
import type { Challenge } from "@/lib/challenge";

export const metadata: Metadata = {
  title: "Thử thách nối hai người",
  description:
    "Mỗi ngày một cặp nhân vật lịch sử: lần theo cha con, vợ chồng, người kế vị để nối họ lại trong ít bước nhất.",
  alternates: { canonical: "/thu-thach" },
};

// Today's pair depends on the date, and the API is not running while the site is built.
export const dynamic = "force-dynamic";

export default async function ChallengePage() {
  let challenge: Challenge | null = null;
  try {
    challenge = await apiGet<Challenge>("/challenge/daily");
  } catch {
    // No puzzle yet (too little family data) or the API is down: the page says so below.
  }

  return (
    <>
      <PageHeader
        eyebrow="Trò chơi mỗi ngày"
        title="Thử thách nối hai người"
        description="Bắt đầu từ một nhân vật và đi qua cha mẹ, con cái, vợ chồng, người kế vị cho tới khi gặp người còn lại. Càng ít bước càng tốt."
      />
      {challenge ? (
        <ChallengeGame initial={challenge} />
      ) : (
        <div className="mt-8">
          <Empty>
            Chưa đủ dữ liệu quan hệ để tạo thử thách, hoặc hệ thống đang bận. Bạn quay lại sau nhé.
          </Empty>
        </div>
      )}
    </>
  );
}
