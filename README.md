# Sử Phả

App học lịch sử thế giới qua phả hệ, nhân vật và triều đại. Tên tạm.

Codename kỹ thuật của repo/package là **lineagraph** (`@lineagraph/*`) — tên hàm, tên file,
tên thư mục và comment trong code đều viết bằng tiếng Anh, xem quy ước ở [CLAUDE.md](CLAUDE.md).
Tên "Sử Phả" là tên sản phẩm hiển thị cho người dùng, không phải tên thư mục/package.

Thiết kế đầy đủ (mô hình dữ liệu, thuật toán, kiến trúc, lộ trình) nằm ở [`docs/`](docs/README.md)
ngay trong repo này — đọc `docs/README.md` trước khi đổi cấu trúc ở đây.

## Cấu trúc

```
apps/
  api/      REST API (Express) — user chỉ đọc, admin thêm/sửa/xoá (dùng chung cho web + admin)
  scripts/  script chạy tay, hiện chỉ có nhập Wikidata
  web/      Next.js — app cho người dùng, chỉ xem (khám phá, tìm mối liên hệ, học tập)
  admin/    Vite + React — app cho admin thêm, sửa, xoá dữ liệu và duyệt
packages/
  core/     schema Drizzle (kg / history / learning) + services dùng chung
  ui/       design tokens + component dùng chung, không phụ thuộc Next hay Vite
```

Trạng thái: đã chạy được luồng cơ bản.

- **Web còn có**: trang **Sơ đồ** (`/graph`): chọn một nhân vật/chính thể làm trung tâm, hiện tối đa 40 người liên quan, bấm "+N"/"Tải thêm" để mở rộng, bấm ◎ để đổi trung tâm (vẽ bằng @xyflow/react; admin có cùng sơ đồ ở tab "Sơ đồ", bấm đường nối để sửa, kéo giữa hai ô để thêm quan hệ) và trang **Tìm quan hệ** giữa hai đối tượng (vd. Lê Thái Tổ ↔ Lê Thánh Tông → "ông nội / cháu nội", cả họ nội lẫn họ ngoại, kèm các chuỗi quan hệ).
- **Admin** (đăng nhập bắt buộc): thêm/sửa/xoá nhân vật, chính thể (hồ sơ đầy đủ: tên, tiểu sử, thông tin tuỳ ý, chức vụ kèm niên hiệu), quan hệ bất kỳ giữa nhân vật/chính thể (cha/mẹ–con, vợ/chồng, thầy trò, đồng minh, kế vị… và loại quan hệ mới tự thêm), nguồn tư liệu, danh mục.
- **Web** (công khai, không đăng nhập): trang chủ, tìm kiếm không dấu, danh sách và trang chi tiết nhân vật/chính thể, cây phả hệ (tổ tiên, hậu duệ), dòng thời gian.
- **Chưa làm:** tìm mối liên hệ giữa hai người (mục 7.7), học và ôn tập, duyệt dữ liệu, báo cáo nhất quán, nhập Wikidata. Dữ liệu admin nhập được coi là đã duyệt và hiện ngay trên web.

## Chạy thử

```
pnpm install
cp .env.example .env   # điền DATABASE_URL, JWT_SECRET (chuỗi ngẫu nhiên dài), ADMIN_EMAIL, ADMIN_PASSWORD

pnpm db:migrate        # tạo schema và bảng
pnpm db:seed           # nạp các bảng danh mục (loại tên, chức vụ...)
pnpm db:create-admin   # tạo tài khoản admin từ ADMIN_EMAIL / ADMIN_PASSWORD (chạy lại để đổi mật khẩu)

pnpm dev:api      # http://localhost:4200 — đọc công khai; ghi cần token admin
pnpm dev:web      # http://localhost:3200 — Next.js, app cho người dùng (gọi API qua API_URL)
pnpm dev:admin    # http://localhost:4100 — Vite, app quản trị (đăng nhập bằng tài khoản ở trên)
pnpm import:wikidata [--apply]   # chạy tay, mặc định dry-run
```

Tài khoản admin dùng để test (chỉ môi trường dev, **đổi khi lên production**):

|          |                         |
| -------- | ----------------------- |
| Email    | `admin@lineagraph.test` |
| Mật khẩu | `line@123`              |

Khi sửa schema trong `packages/core/src/schema/`:

```
pnpm db:generate   # sinh SQL migration vào packages/core/drizzle/
pnpm db:migrate    # chạy migration lên DATABASE_URL (đọc từ .env ở root)
```

## Việc tiếp theo

Nhập dữ liệu thật qua trang admin, rồi làm tiếp theo lộ trình ở `docs/design.md` mục 14.2:
tìm mối liên hệ giữa hai người (bắt đầu từ golden tests cho `relations`, mục 7.7.7b), học và
ôn tập, duyệt dữ liệu, báo cáo nhất quán. Các route còn trả `501 not_implemented` nằm trong
`apps/api/src/routes/` (`relations`, `learning`, `review`, `consistency-report`).
