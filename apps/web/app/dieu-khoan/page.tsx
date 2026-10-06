import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng",
  description: "Điều kiện sử dụng nội dung và dịch vụ của Sử Phả.",
  alternates: { canonical: "/dieu-khoan" },
};

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Chính sách"
        title="Điều khoản sử dụng"
        description="Cập nhật lần cuối: 6 tháng 10 năm 2026."
      />
      <Prose>
        <h2>Nội dung</h2>
        <p>
          Dữ liệu do Sử Phả biên soạn được chia sẻ theo giấy phép CC BY-SA 4.0: bạn được dùng lại
          với điều kiện ghi nguồn và chia sẻ tương tự. Chi tiết và cách ghi nguồn ở trang{" "}
          <Link href="/gioi-thieu#giay-phep">Giới thiệu</Link>. Các tác phẩm được trích dẫn thuộc về
          tác giả của chúng và có giấy phép riêng.
        </p>

        <h2>Độ chính xác</h2>
        <p>
          Nội dung được cung cấp để tham khảo và học tập, “nguyên trạng”, không bảo đảm đầy đủ hay
          hoàn toàn chính xác. Lịch sử có nhiều chỗ còn tranh cãi; trang cố gắng nêu rõ điều đó
          nhưng có thể còn sai sót. Với việc học thuật hoặc xuất bản, hãy kiểm tra lại với nguồn gốc
          được dẫn. Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm về thiệt hại
          phát sinh từ việc dùng thông tin trên trang.
        </p>

        <h2>Sử dụng hợp lý</h2>
        <ul>
          <li>
            Bạn được duyệt, tìm kiếm và trích dẫn tự do. Hệ thống có giới hạn số yêu cầu mỗi phút;
            chương trình tự động tải hàng loạt, hoặc cố làm quá tải hay vượt qua giới hạn này, sẽ bị
            chặn.
          </li>
          <li>
            Không dò tìm lỗ hổng, truy cập khu vực quản trị khi không được phép, hay làm gián đoạn
            dịch vụ. Nếu phát hiện lỗ hổng bảo mật, xin báo qua trang{" "}
            <Link href="/bao-loi">Báo lỗi</Link> mà không công bố trước.
          </li>
        </ul>

        <h2>Liên kết</h2>
        <p>
          Trang có liên kết tới nguồn bên ngoài để bạn kiểm chứng. Chúng tôi không kiểm soát nội
          dung của các trang đó.
        </p>

        <h2>Thay đổi</h2>
        <p>
          Chúng tôi có thể cập nhật điều khoản này; bản mới có hiệu lực khi đăng ở trang này, kèm
          ngày cập nhật ở đầu trang. Dịch vụ có thể thay đổi hoặc ngừng mà không báo trước.
        </p>
      </Prose>
    </>
  );
}
