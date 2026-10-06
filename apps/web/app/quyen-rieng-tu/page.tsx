import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = {
  title: "Quyền riêng tư",
  description:
    "Sử Phả không dùng cookie theo dõi, không phân tích hành vi người dùng và không yêu cầu tài khoản để đọc. Những gì máy chủ ghi lại và vì sao.",
  alternates: { canonical: "/quyen-rieng-tu" },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Chính sách"
        title="Quyền riêng tư"
        description="Cập nhật lần cuối: 6 tháng 10 năm 2026."
      />
      <Prose>
        <h2>Tóm tắt</h2>
        <p>
          Bạn đọc Sử Phả mà không cần tài khoản. Chúng tôi không dùng cookie theo dõi, không gắn
          công cụ phân tích hành vi hay quảng cáo, và không thu thập thông tin cá nhân của người
          đọc.
        </p>

        <h2>Điều chúng tôi không làm</h2>
        <ul>
          <li>Không đặt cookie theo dõi hay cookie quảng cáo, nên không có biểu ngữ cookie.</li>
          <li>Không dùng Google Analytics hay công cụ tương tự.</li>
          <li>
            Không tải phông chữ hay tài nguyên từ máy chủ bên thứ ba: phông chữ nằm trên chính trang
            này, nên trình duyệt của bạn không gửi địa chỉ IP cho bên nào khác chỉ vì bạn mở trang.
          </li>
          <li>Không bán hay chia sẻ dữ liệu về người đọc, vì không có dữ liệu như vậy.</li>
        </ul>

        <h2>Điều máy chủ ghi lại</h2>
        <p>
          Như mọi máy chủ web, hệ thống lưu trữ chúng tôi thuê (Railway) và máy chủ ứng dụng có thể
          ghi nhật ký kỹ thuật cho mỗi yêu cầu: thời điểm, địa chỉ trang được yêu cầu, mã trả về,
          thời gian xử lý và địa chỉ IP. Chúng tôi dùng nhật ký này để phát hiện lỗi và chống lạm
          dụng (ví dụ chặn một địa chỉ gửi quá nhiều yêu cầu), không dùng để xác định danh tính hay
          theo dõi từng người đọc. Nhật ký của nhà cung cấp hạ tầng tuân theo chính sách của họ.
        </p>
        <p>
          Ứng dụng của chúng tôi không ghi từ khoá bạn tìm kiếm vào nhật ký riêng, nhưng địa chỉ
          trang có từ khoá (ví dụ <code>/search?q=…</code>) có thể xuất hiện trong nhật ký của hạ
          tầng.
        </p>

        <h2>Lưu trên trình duyệt của bạn</h2>
        <p>
          Chỉ có một thiết lập được nhớ ở trình duyệt: chế độ sáng hoặc tối bạn chọn. Nó nằm trong
          bộ nhớ cục bộ của trình duyệt, không được gửi đi đâu.
        </p>

        <h2>Báo lỗi và liên hệ</h2>
        <p>
          Khi bạn gửi báo lỗi qua <Link href="/bao-loi">trang Báo lỗi</Link>, nội dung bạn gửi được
          xử lý theo chính sách của kênh tiếp nhận mà trang đó dẫn tới. Đừng đưa thông tin cá nhân
          không cần thiết vào nội dung báo lỗi.
        </p>

        <h2>Thay đổi</h2>
        <p>
          Nếu cách chúng tôi xử lý dữ liệu thay đổi (ví dụ thêm công cụ phân tích), trang này sẽ
          được cập nhật trước khi thay đổi có hiệu lực, kèm ngày cập nhật ở đầu trang.
        </p>
      </Prose>
    </>
  );
}
