# Tài liệu thiết kế

Bản copy làm việc, đặt cùng code để tiếp tục phát triển không cần mở repo kiến thức riêng.
Nguồn gốc: repo kiến thức cá nhân `teencare/knowledge/stuff/` (xem ghi chú ở cuối file này) —
khi hai bản lệch nhau, coi bản ở đây là bản đang dùng để code.

| File | Nội dung |
|---|---|
| [`design.md`](design.md) | Ý tưởng và thiết kế chi tiết: mục tiêu, mô hình khái niệm, **cấu trúc database và khả năng mở rộng (mục 5)**, thuật toán, chức năng chọn hai người (mục 7.7), học tập, kiến trúc, nguồn dữ liệu, rủi ro, MVP và lộ trình (mục 14) |
| [`services-and-ui.md`](services-and-ui.md) | Tách kiến trúc thành 3 service (backend, app user, app admin), danh sách đầy đủ trang cho từng app, nhóm API ở backend, khớp với lộ trình 8 tuần |

**Nên đọc theo thứ tự:** `design.md` mục 3 (nguyên tắc) → mục 5 (cơ sở dữ liệu) → mục 7.7 (chức
năng cốt lõi) → mục 14 (MVP và lộ trình) → mục 15–16 (câu hỏi mở và mức độ chắc chắn), rồi
`services-and-ui.md` mục 1 (kiến trúc service) → mục 2–3 (danh sách trang) → mục 5 (khớp lộ trình).

## Trạng thái

- **Giai đoạn:** khung project đã dựng ở repo này (`apps/`, `packages/`), chưa có logic thật
  (routes trả `501 not_implemented`, trang là placeholder). Xem mục 14 của `design.md` để biết
  thứ tự làm tiếp — tuần 1–2 là chốt mô hình dữ liệu bằng dữ liệu thật rồi chạy migration Drizzle
  thật trên Postgres.
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
