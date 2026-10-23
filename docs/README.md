# Tài liệu thiết kế

Bản copy làm việc, đặt cùng code để tiếp tục phát triển không cần mở repo kiến thức riêng.
Nguồn gốc: repo kiến thức cá nhân `teencare/knowledge/stuff/` (xem ghi chú ở cuối file này) —
khi hai bản lệch nhau, coi bản ở đây là bản đang dùng để code.

| File                                       | Nội dung                                                                                                                                                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`design.md`](design.md)                   | Ý tưởng và thiết kế chi tiết: mục tiêu, mô hình khái niệm, **cấu trúc database và khả năng mở rộng (mục 5)**, thuật toán, chức năng chọn hai người (mục 7.7), học tập, kiến trúc, nguồn dữ liệu, rủi ro, MVP và lộ trình (mục 14) |
| [`database.md`](database.md)               | **Sơ đồ quan hệ (ER) của database hiện tại**, vẽ bằng Mermaid, theo schema Drizzle đang chạy: lõi `kg.node`/`kg.relation`, lớp `history`, nguồn và trích dẫn, lớp học, danh mục, các chỗ chưa có khoá ngoại                       |
| [`theme.md`](theme.md)                     | **Theme và hệ thống thiết kế dùng chung**: bốn lớp (nguyên liệu, ý nghĩa, mặc định, tiện ích), thang màu, khoảng cách, bo góc, đổ bóng, chữ, cách dùng lại cho app mới |
| [`services-and-ui.md`](services-and-ui.md) | Tách kiến trúc thành 3 service (backend, app user, app admin), danh sách đầy đủ trang cho từng app, nhóm API ở backend, khớp với lộ trình 8 tuần                                                                                  |

**Nên đọc theo thứ tự:** `design.md` mục 3 (nguyên tắc) → mục 5 (cơ sở dữ liệu) → mục 7.7 (chức
năng cốt lõi) → mục 14 (MVP và lộ trình) → mục 15–16 (câu hỏi mở và mức độ chắc chắn), rồi
`services-and-ui.md` mục 1 (kiến trúc service) → mục 2–3 (danh sách trang) → mục 5 (khớp lộ trình).

## Trạng thái

- **Sẵn sàng công khai (xem `deploy.md` mục "Checklist trước khi mở"):** phiên admin 30 phút và thu hồi được, giới hạn
  đăng nhập theo địa chỉ và theo tài khoản, giới hạn riêng cho các đường đắt, cấu hình production phải đủ mới chạy,
  `/health` kiểm tra DB, tắt êm, log JSON có mã yêu cầu, header bảo mật ở web/admin/API, font tự lưu, trang giới thiệu/nguồn/báo lỗi/
  riêng tư/điều khoản, giấy phép dữ liệu CC BY-SA 4.0, ảnh xem trước theo bản ghi, sitemap/robots chuẩn, tìm kiếm và dòng thời gian
  có sự kiện, script sao lưu/khôi phục và `scripts/smoke.mjs`. Vận hành: `operations.md`. Định dạng lỗi của API: `api-errors.md`.
- **Giai đoạn:** app đã chạy được: web công khai, trang admin (nhân vật, chính thể, địa điểm,
  quan hệ, chức vụ, nguồn, kiểm tra dữ liệu) và API đều có logic thật trên Postgres.
  Admin có menu nhóm (Nội dung, Tư liệu, Hệ thống), tìm nhanh `Ctrl/⌘+K`, nút "+ Thêm" ở mọi trang;
  danh sách có bộ lọc lưu trên URL, chọn nhiều dòng, xoá có "Hoàn tác" (xoá mềm nhân vật, chính thể,
  sự kiện); trang chi tiết là một trang cuộn có mục lục, thanh Lưu (`Ctrl/⌘+S`) và thêm nhanh
  cha/mẹ, vợ/chồng, con ngay trong thẻ Quan hệ; Tổng quan liệt kê việc cần làm và thay đổi gần đây. Chưa làm:
  hàng đợi duyệt (`/review-queue*`) và phần học thẻ (`/review/today`, `/progress`), các route này
  vẫn trả `501 not_implemented`; importer hàng loạt, ảnh và bản đồ.
  Đã có: sự kiện với người tham gia theo vai trò, độ chắc chắn và ghi chú tranh cãi cho quan hệ và
  chức vụ, phiên bản thay thế của chức vụ, trích dẫn có lập trường (ủng hộ, phản bác, nhắc đến). Với các bảng, nguồn sự thật là
  `docs/database.md` và `packages/core/src/schema/`; những mô tả bảng `parentage`, `union`,
  `person_closure`, `kinship_ruleset` trong `design.md` là thiết kế ban đầu đã được thay bằng
  `kg.relation`.
- Mọi SQL, thuật toán, con số ước tính trong `design.md` vẫn là **đề xuất thiết kế, chưa chạy
  thử** — mục 16 của `design.md` liệt kê rõ chỗ đã xác minh và chưa.

## Quy ước

- Nội dung tài liệu thiết kế viết bằng tiếng Việt (giữ nguyên như bản gốc) — quy tắc "code phải
  viết tiếng Anh" ở [`../CLAUDE.md`](../CLAUDE.md) áp dụng cho code, không áp dụng cho văn bản
  thiết kế trong `docs/`.
- Bản gốc/lịch sử chỉnh sửa trước khi có code nằm ở
  `/Users/peterteencare/Documents/teencare/knowledge/stuff/` (`y-tuong-su-pha-app-hoc-lich-su.md`
  và `thiet-ke-ui-va-kien-truc-service.md`). Từ khi có code, sửa tài liệu ở `docs/` này trước;
  đồng bộ ngược lại repo kiến thức chỉ khi cần giữ lịch sử ở đó.
