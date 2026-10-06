import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description:
    "Sử Phả là kho dữ liệu mở về nhân vật, triều đại và sự kiện lịch sử thế giới, có nguồn dẫn cho từng thông tin. Cách biên soạn, giấy phép và cách trích dẫn.",
  alternates: { canonical: "/gioi-thieu" },
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Về Sử Phả"
        title="Giới thiệu"
        description="Lịch sử thế giới qua từng dòng phả hệ: ai là cha của ai, ai kế vị ai, sự kiện nào xảy ra ở đâu, và đọc điều đó ở đâu ra."
      />
      <Prose>
        <h2>Sử Phả có gì</h2>
        <p>
          Sử Phả là một kho dữ liệu về <Link href="/persons">nhân vật</Link>,{" "}
          <Link href="/polities">chính thể</Link> (triều đại, vương quốc, chính quyền) và{" "}
          <Link href="/events">sự kiện</Link> lịch sử, cùng các mối quan hệ giữa chúng: cha mẹ và
          con cái, vợ chồng, kế vị, đồng minh, chiến tranh. Bạn có thể xem{" "}
          <Link href="/graph">sơ đồ quan hệ</Link> quanh một nhân vật, hỏi{" "}
          <Link href="/relations">hai người có họ hàng thế nào</Link>, hoặc đi theo{" "}
          <Link href="/timeline">dòng thời gian</Link> từng thế kỷ.
        </p>

        <h2>Dữ liệu được biên soạn thế nào</h2>
        <p>
          Dữ liệu do người biên soạn nhập từng mục một, dựa trên sách sử, công trình nghiên cứu và
          các bách khoa toàn thư. Không có dữ liệu nào được sinh tự động. Mỗi nhân vật, chính thể,
          sự kiện, quan hệ hay chức vụ có thể gắn với một hoặc nhiều{" "}
          <Link href="/nguon">nguồn</Link>, kèm vị trí trong nguồn và mức độ chắc chắn.
        </p>
        <p>Một số quy ước bạn sẽ gặp:</p>
        <ul>
          <li>
            <strong>Còn tranh cãi</strong>: các nguồn ghi khác nhau về điều này. Khi có thể, trang
            hiện cả nguồn ủng hộ lẫn nguồn ghi khác, ở mục “Nguồn ghi khác”.
          </li>
          <li>
            <strong>Phiên bản khác</strong>: một sử gia khác hiểu thời gian giữ ngôi vị này khác với
            phiên bản đang dùng để vẽ sơ đồ.
          </li>
          <li>
            <strong>Ngày tháng</strong> có thể chỉ là năm hoặc tháng, có thể là ước chừng (dấu “~”).
            Năm trước Công nguyên ghi là “TCN” và không có năm 0: sau năm 1 TCN là năm 1. Ngày theo
            lịch Julius được ghi rõ.
          </li>
          <li>
            <strong>Tên</strong>: một người có thể có nhiều tên (tên húy, tên tự, hiệu, thụy hiệu,
            miếu hiệu). Tìm kiếm không cần gõ dấu và tìm theo mọi tên.
          </li>
        </ul>

        <h2>Giới hạn</h2>
        <p>
          Dữ liệu còn đang được bổ sung và chưa đầy đủ. Việc một nhân vật hay sự kiện chưa có ở đây
          không có nghĩa là họ không quan trọng, chỉ là chưa được nhập. Dù đã cố gắng dẫn nguồn, vẫn
          có thể có sai sót, đặc biệt ở những thời kỳ sử liệu ít và mâu thuẫn. Nếu bạn thấy chỗ sai,
          xin <Link href="/bao-loi">báo cho chúng tôi</Link>.
        </p>

        <h2 id="giay-phep">Giấy phép và cách ghi nguồn</h2>
        <p>
          Phần dữ liệu do Sử Phả biên soạn (nhân vật, chính thể, sự kiện, quan hệ và các đoạn tóm
          tắt, tiểu sử) được chia sẻ theo giấy phép{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.vi" rel="license noreferrer">
            Creative Commons Ghi nguồn – Chia sẻ tương tự 4.0 (CC BY-SA 4.0)
          </a>
          . Bạn được sao chép, phân phối, chỉnh sửa và dùng cho cả mục đích thương mại, với điều
          kiện:
        </p>
        <ul>
          <li>
            <strong>Ghi nguồn</strong>: nêu “Sử Phả” kèm liên kết tới trang bạn dùng, và ghi rõ nếu
            bạn đã chỉnh sửa.
          </li>
          <li>
            <strong>Chia sẻ tương tự</strong>: nếu bạn biến đổi hoặc xây dựng tiếp từ dữ liệu này,
            sản phẩm của bạn phải dùng cùng giấy phép CC BY-SA 4.0.
          </li>
        </ul>
        <p>
          Một số đoạn tóm tắt tham khảo từ Wikipedia (giấy phép CC BY-SA 4.0); trang nào có đoạn như
          vậy đều nêu bài gốc ở mục “Nguồn tư liệu”. Các nguồn trích dẫn có giấy phép riêng của
          chúng, hiển thị ở <Link href="/nguon">thư mục nguồn</Link>; giấy phép trên chỉ áp dụng cho
          phần do Sử Phả biên soạn, không áp dụng ngược cho sách, bài báo hay tác phẩm được dẫn.
        </p>

        <h2>Cách trích dẫn một trang</h2>
        <p>Ví dụ:</p>
        <p>
          <em>
            “[Tên trang]”. Sử Phả, [địa chỉ trang]. CC BY-SA 4.0. Truy cập ngày [ngày truy cập].
          </em>
        </p>
        <p>
          Địa chỉ mỗi trang ổn định: nhân vật dạng <code>/person/ten-nhan-vat</code>, chính thể
          <code> /polity/…</code>, sự kiện <code> /event/…</code>.
        </p>

        <h2>Liên hệ</h2>
        <p>
          Góp ý, đính chính hoặc đề nghị bổ sung: xem trang <Link href="/bao-loi">Báo lỗi</Link>.
        </p>
      </Prose>
    </>
  );
}
