import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { Button } from "@lineagraph/ui";
import { PageHeader } from "@/components/PageHeader";
import { Prose } from "@/components/Prose";
import { FEEDBACK_URL, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Báo lỗi và góp ý",
  description:
    "Phát hiện sai sót, muốn bổ sung nguồn hoặc đề nghị thêm một nhân vật, sự kiện? Cách gửi góp ý cho Sử Phả.",
  alternates: { canonical: "/bao-loi" },
};

type Props = { searchParams: Promise<{ trang?: string }> };

// Only an address on this site is accepted from the query string, so the page cannot be used to
// display a link to somewhere else under the site's name.
function pageToReport(value: string | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.length > 200) return null;
  return value;
}

// Only an https link or a mailto: address is offered as the place to report to, so a mistyped or
// hostile value in the environment cannot turn the button into something else.
const feedbackUrl = /^(https:\/\/|mailto:)/i.test(FEEDBACK_URL) ? FEEDBACK_URL : "";

export default async function ReportPage({ searchParams }: Props) {
  const path = pageToReport((await searchParams).trang);
  const address = path ? `${SITE_URL}${path}` : null;

  return (
    <>
      <PageHeader
        eyebrow="Góp phần làm dữ liệu đúng hơn"
        title="Báo lỗi và góp ý"
        description="Sử Phả được biên soạn thủ công và chắc chắn còn sai sót. Mọi đính chính đều có giá trị."
      />
      <Prose>
        {address && (
          <p className="surface p-4">
            Bạn đang báo lỗi cho trang: <br />
            <code className="break-all">{address}</code>
          </p>
        )}
        <h2>Nên nêu những gì</h2>
        <ul>
          <li>Địa chỉ trang có vấn đề (nếu bạn bấm “Báo lỗi trang này” thì đã có sẵn ở trên).</li>
          <li>Điều gì sai, và điều đúng theo bạn là gì.</li>
          <li>
            <strong>Nguồn</strong> cho điều bạn nói: tên sách hoặc bài, tác giả, trang hay đường
            dẫn. Có nguồn thì chúng tôi kiểm tra và sửa nhanh hơn nhiều.
          </li>
          <li>Nếu muốn đề nghị thêm nhân vật, chính thể hay sự kiện: tên, thời gian và nguồn.</li>
        </ul>
        <p>
          Đừng đưa thông tin cá nhân của bạn hay của người khác vào nội dung báo lỗi nếu không cần
          thiết.
        </p>

        <h2>Gửi ở đâu</h2>
        {feedbackUrl ? (
          <p>
            <Button asChild>
              <a href={feedbackUrl} target="_blank" rel="noreferrer noopener">
                Gửi báo lỗi <ExternalLink />
              </a>
            </Button>
          </p>
        ) : (
          <p>
            Kênh nhận báo lỗi trực tuyến chưa được mở. Trong lúc đó, bạn có thể ghi lại nội dung
            theo các gợi ý trên để gửi khi kênh mở.
          </p>
        )}
      </Prose>
    </>
  );
}
