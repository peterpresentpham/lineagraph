# Thiết kế UI và kiến trúc service — Sử Phả

> Ngày lập: 2026-10-03. Tiếp theo [`design.md`](design.md) mục 9 (giao diện) và mục 10 (kiến trúc).
> Tài liệu gốc đề xuất một Next.js gộp chung khám phá + học + quản trị (`apps/web`). Tài liệu này **tách app quản trị ra riêng** theo quyết định của người làm, và liệt kê cụ thể các trang cho từng phần. Chưa có code — đây là đề xuất thiết kế.

---

## 1. Kiến trúc service

Tối thiểu 3 phần nhìn thấy được, cộng 1 phần nền (worker) nên gộp vào backend lúc đầu:

| Service | Vai trò | Ai dùng | Công nghệ | Ghi chú |
|---|---|---|---|---|
| **backend (api)** | Một REST API duy nhất, chia theo module (xem mục 4). Phục vụ cả app user và app admin — admin không có API riêng, chỉ có thêm quyền và endpoint ghi/duyệt | Cả hai app gọi vào | Hono/Express + zod như mục 10.2 tài liệu gốc | |
| **app user** | Đọc là chính: khám phá đồ thị, tra cứu, học/ôn tập | Người dùng cuối (ban đầu là bạn, sau mở rộng) | **Next.js** | Public, cần SEO cho trang nhân vật/triều đại (index được trên Google) và tốc độ tải lần đầu — cần SSR/SSG |
| **app admin** | Ghi là chính: nhập liệu, duyệt, quản lý danh mục, báo cáo | Chỉ bạn (và sau này biên tập viên nếu có) | **React thường (Vite + React)** | Luôn sau đăng nhập, không cần SEO/SSR — SPA đơn giản, build/dev nhanh hơn Next cho giao diện CRUD/bảng |
| **worker** | Nhập hàng loạt (Wikidata), kiểm tra nhất quán định kỳ, sinh câu hỏi, sao lưu | Chạy theo lịch/hàng đợi, không có UI | — | **Khuyến nghị: gộp vào backend làm cron job/route nội bộ ở MVP**, tách thành service riêng khi khối lượng nhập/worker thật sự nặng (mục 5.8, 5.9 tài liệu gốc) |

**Vì sao 2 app dùng 2 framework khác nhau (không cả hai đều Next):** app user cần SSR/SSG để trang nội dung công khai được index; app admin không ai cần index, luôn đứng sau đăng nhập, nên một SPA React thuần (Vite) đơn giản và nhanh hơn để làm CRUD/bảng/form. Đánh đổi: package UI dùng chung (`packages/ui`, xem mục 10.1 tài liệu gốc) phải là **React thuần, không dùng API riêng của Next** (`next/link`, `next/image`...) để còn tái dùng được ở admin; phần nào cần API của Next thì wrap thêm ở tầng app user, không đưa vào package chung.

**Vì sao tách admin khỏi app user** (khác với đề xuất gộp ban đầu):
- Mô hình truy cập khác hẳn: user là public/anonymous, admin luôn cần đăng nhập — tách app giúp không phải canh "route nào cần auth" trong một app.
- User app cần tối ưu cho người đọc (SEO, tải nhanh, cache công khai); admin app ngược lại là công cụ nội bộ, ưu tiên tốc độ làm việc (bảng, form, bulk action) hơn là giao diện đẹp.
- Deploy/scale độc lập: admin có thể chỉ chạy khi cần, không ảnh hưởng uptime của app user.
- Đánh đổi: hai codebase Next.js nghĩa là nhân đôi phần cấu hình/design system — giảm bằng cách dùng chung `packages/core`, `packages/graph-view`, `packages/provenance` như mục 10.1 tài liệu gốc đã định.

---

## 2. Trang cho app user

Dựa theo mục 8, 9.1, 7.7.7 của tài liệu gốc. Cột "MVP" đánh dấu theo phạm vi mục 14.1.

| # | Trang | Route gợi ý | Nội dung chính | MVP? |
|---|---|---|---|---|
| 1 | Trang chủ / Khám phá đồ thị | `/` hoặc `/explore` | Chọn một nhân vật/triều đại làm tâm, hiển thị lân cận độ sâu 1–2, bấm để mở rộng (mục 9.1.1) | Có |
| 2 | Tìm mối liên hệ (chức năng cốt lõi) | `/relations?a=&b=` | Hai ô chọn người + nút đổi chỗ, kết luận lớn, nhãn hai hướng, đồ thị mini, nguồn, độ chắc chắn, mục "quan hệ khác" (đặc tả đầy đủ mục 7.7) | **Có — ưu tiên cao nhất** |
| 3 | Trang nhân vật | `/person/[slug]` | Tên và các tên khác, tóm tắt, quan hệ, nhiệm kỳ, sự kiện, bảng nguồn + độ tin cậy từng dữ kiện, cờ `historicity` nếu bán huyền thoại | Có |
| 4 | Trang chính thể/triều đại | `/polity/[slug]` | Hai khu: chuỗi vua (sovereign) và triều thần/tướng lĩnh; quan hệ với triều trước/sau/song song (mục 5.11.C) | Có |
| 5 | Cây phả hệ hoàng tộc | `/tree/[polity-slug]` | Cây theo đời, lọc theo triều đại, thu gọn nhánh, đánh dấu vua/hoàng hậu (mục 9.1.2) | Có |
| 6 | Dòng thời gian | `/timeline` | Triều đại là thanh ngang, nhân vật là điểm/đoạn, vùng mờ thể hiện độ không chắc chắn, phân biệt chuỗi vua với chức vụ khác, vẽ được triều song song (mục 9.1.3, 5.11.C) | Có (bản cơ bản) |
| 7 | Tìm kiếm | `/search?q=` | Khớp mọi tên (húy, tự, miếu hiệu, thụy hiệu, niên hiệu), không dấu, lọc theo loại/bộ sưu tập | Có |
| 8 | Trang sự kiện | `/event/[slug]` | Loại sự kiện, thời gian, địa danh, người tham gia + vai trò | Sau MVP (mục 2.3 loại trừ event ở bản đầu, nhưng mục 14.1 cho phép bỏ qua) |
| 9 | Trang nguồn | `/source/[id]` | Thông tin nguồn, danh sách dữ kiện trích dẫn từ nguồn này | Có (tối thiểu: xem trong popup, không cần route riêng) |
| 10 | Dashboard học tập | `/learn` | Thẻ cần ôn hôm nay, tiến độ tổng, lối vào lộ trình (mục 8) | Có (cơ bản) |
| 11 | Ôn tập (phiên học) | `/learn/review` | Giao diện thẻ ôn ngắt quãng, trả lời, chỉ số dễ/khó (SM-2/FSRS) | Có |
| 12 | Lộ trình (curriculum) | `/learn/path/[polity-slug]` | Cây mở khoá theo triều đại/nhân vật, unlock tuần tự hoặc tự do (mục 8.3) | Sau MVP (map đơn giản ở MVP) |
| 13 | Tiến độ | `/learn/progress` | % nắm theo nhánh/triều đại, bản đồ nhiệt trên đồ thị (mục 8.4) | Sau MVP |
| 14 | Dữ kiện đang tranh cãi (công khai) | `/disputed` | Tổng hợp các chỗ nguồn mâu thuẫn, minh bạch cho người đọc (mục 11.3) | Sau MVP |
| 15 | Giới thiệu dự án | `/about` | Mục tiêu, nguyên tắc (nguồn + độ chắc chắn), cách đóng góp sau này | Tuỳ chọn |

**Lưu ý UI chung:** chế độ danh sách thay thế cho mọi màn hình đồ thị (khả năng tiếp cận, mục 9.2), tải lân cận theo độ sâu chứ không vẽ toàn bộ đồ thị.

---

## 3. Trang cho app admin

Dựa theo mục 9.1.7, 11.2, 7.6 của tài liệu gốc — đây là phần mà tài liệu gốc mới gọi tên ("quản trị nội dung") mà chưa tách chi tiết.

| # | Trang | Route gợi ý | Nội dung chính | MVP? |
|---|---|---|---|---|
| 1 | Đăng nhập | `/login` | Auth đơn giản (một người dùng ở MVP, mục 15 câu hỏi mở #5) | Có |
| 2 | Dashboard | `/` | Số lượng theo `review_state`, cảnh báo kiểm tra nhất quán mới nhất, việc cần làm | Có |
| 3 | Danh sách + CRUD nhân vật | `/persons`, `/persons/[id]` | Tạo/sửa person, tên (nhiều dòng `kg.name`), ngày sinh/mất (nhiều dòng nếu nguồn mâu thuẫn), cờ `historicity` | Có |
| 4 | Danh sách + CRUD chính thể | `/polities`, `/polities/[id]` | Tạo/sửa polity, loại, thời gian, quan hệ với polity khác (`followed_by`, `split_from`...) | Có |
| 5 | Danh sách + CRUD nhiệm kỳ | `/tenures`, `/tenures/[id]` | Gắn person–polity–office, niên hiệu (`tenure_era`), kế nhiệm (`tenure_succession`) | Có |
| 6 | Quan hệ cha mẹ–con / hôn phối | `/parentage`, `/unions` | CRUD `parentage` (kèm `kind`: ruột/nuôi/kế/tranh cãi), `union_` (kèm thứ bậc) | Có |
| 7 | Quan hệ mềm (kg.relation) | `/relations-admin` | CRUD quan hệ thầy–trò, đồng minh, đối thủ, phục vụ... theo `relation_type` | Có |
| 8 | Hàng chờ duyệt | `/review-queue` | Lọc theo `review_state = proposed`, xem diff, approve/reject hàng loạt | Có — vì "chỉ `approved` mới đưa vào học tập" (mục 11.2) |
| 9 | Quản lý nguồn & trích dẫn | `/sources`, `/citations` | CRUD `kg.source`; gắn `kg.citation` vào bất kỳ dữ kiện; cảnh báo "trích dẫn mồ côi" | Có |
| 10 | Quản lý danh mục (registry) | `/registries/[table]` | CRUD chung cho `relation_type`, `office_type`, `name_kind`, `succession_mode`, `polity_type`... — một UI generic dùng lại cho mọi bảng danh mục | Có (dù chỉ 1 bảng generic) |
| 11 | Quản lý bộ sưu tập | `/collections` | CRUD `kg.collection`, gán node vào bộ sưu tập | Sau MVP (MVP chỉ 1 bộ sưu tập) |
| 12 | Báo cáo kiểm tra nhất quán | `/consistency-report` | Danh sách lỗi: chu trình tổ tiên, cha mẹ sinh sau con, nhiệm kỳ chồng lấn, dữ kiện thiếu nguồn (mục 7.6) | Có |
| 13 | Nhập hàng loạt (bulk import) | `/imports` | Chạy job worker (Wikidata), xem diff dry-run, bấm `--apply`, log kết quả, khử trùng lặp (mục 11.2) | Sau MVP (MVP nhập tay) |
| 14 | Quản lý câu hỏi sinh tự động | `/questions` | Xem/ẩn câu hỏi sinh từ đồ thị, gắn cờ "không sinh từ dữ kiện yếu" (mục 8.1) | Sau MVP |
| 15 | Người dùng & phân quyền | `/users` | Chỉ cần khi có người dùng thứ hai biên tập (mục 15 câu hỏi mở #5) | Bỏ qua ở MVP |

---

## 4. Nhóm API ở backend (map sang trang trên)

Một API, chia module theo quyền chứ không chia theo app:

| Module | Endpoint tiêu biểu | Dùng ở |
|---|---|---|
| `graph` (đọc công khai) | `GET /persons/:slug`, `GET /polities/:slug`, `GET /neighbors`, `GET /ancestors`, `GET /lca` | App user: trang 1, 3, 4, 5 |
| `relations` (chức năng cốt lõi) | `GET /relations?a=&b=&includeDisputed=` | App user trang 2 — đặc tả đầy đủ mục 7.7.6 |
| `search` | `GET /search?q=` | App user trang 7 |
| `timeline` | `GET /timeline?polity=` | App user trang 6 |
| `learning` | `GET /review/today`, `POST /review/:cardId/answer`, `GET /progress` | App user trang 10–13 |
| `content` (cần quyền admin) | `POST/PUT/DELETE /persons`, `/polities`, `/tenures`, `/parentage`, `/unions`, `/relations-admin` | App admin trang 3–7 |
| `review` (cần quyền admin) | `GET /review-queue`, `POST /review-queue/:id/approve|reject` | App admin trang 8 |
| `provenance` (cần quyền admin để sửa, đọc công khai) | `/sources`, `/citations` | App user trang 9 (đọc) + app admin trang 9 (sửa) |
| `registry` (cần quyền admin) | `GET/POST /registries/:table` | App admin trang 10–11 |
| `ops` (cần quyền admin) | `GET /consistency-report`, `POST /imports/run` | App admin trang 12–13 |

Auth: app user hầu hết endpoint đọc không cần đăng nhập; app admin luôn gửi token qua mọi endpoint ghi — một tầng middleware kiểm quyền ở backend, không lặp logic ở từng app.

---

## 5. Khớp với lộ trình 8 tuần (mục 14.2 tài liệu gốc)

| Tuần | Trang nên có |
|---|---|
| 1–2 | Chưa cần UI, chỉ schema |
| 3 | Chưa cần UI, API đọc + golden tests cho `relations` |
| 4 | Admin: trang 1, 2, 3, 4, 6, 8, 9, 12 (nhập tay + duyệt + kiểm tra nhất quán phải có trước khi có dữ liệu sạch để dạy) |
| 5 | User: trang 1, 3, 4, 5 (khám phá + cây phả hệ + trang nhân vật) |
| 6 | User: trang 2 (tìm mối liên hệ — đầy đủ), trang 6 (dòng thời gian cơ bản) |
| 7 | User: trang 10, 11 (học + ôn tập) |
| 8 | Hoàn thiện nội dung, sửa lỗi, không thêm trang mới |

Admin đi trước user trong lộ trình vì không có dữ liệu đã duyệt thì không có gì để hiển thị ở app user — đây là lý do admin nên là app độc lập xong sớm, không phải tính năng phụ thêm sau.

---

## 6. Câu hỏi còn mở (liên quan riêng tới UI/kiến trúc, bổ sung mục 15 tài liệu gốc)

1. App admin có cần deploy ngay từ đầu hay chạy local trong lúc MVP chỉ một người nhập liệu? (ảnh hưởng có cần domain/HTTPS riêng không)
2. Đã chốt app user dùng Next.js, app admin dùng React thường (Vite) — còn lại: có tách `packages/ui` (React thuần, dùng chung 2 app) ngay từ đầu hay đợi thấy trùng lặp thật rồi mới trích ra?
3. App admin có cần giao diện mobile-friendly không, hay chỉ cần chạy tốt trên desktop (nhập liệu thường làm trên máy lớn)?
