# Sử Phả

App học lịch sử Việt Nam qua phả hệ, nhân vật và triều đại. Tên tạm.

Codename kỹ thuật của repo/package là **lineagraph** (`@lineagraph/*`) — tên hàm, tên file,
tên thư mục và comment trong code đều viết bằng tiếng Anh, xem quy ước ở [CLAUDE.md](CLAUDE.md).
Tên "Sử Phả" là tên sản phẩm hiển thị cho người dùng, không phải tên thư mục/package.

Thiết kế đầy đủ (mô hình dữ liệu, thuật toán, kiến trúc, lộ trình) nằm ở [`docs/`](docs/README.md)
ngay trong repo này — đọc `docs/README.md` trước khi đổi cấu trúc ở đây.

## Cấu trúc

```
apps/
  api/      REST API (Express) — đọc đồ thị, học tập, quản trị (dùng chung cho web + admin)
  worker/   nhập dữ liệu, kiểm tra nhất quán, sinh câu hỏi, sao lưu
  web/      Next.js — app cho người dùng (khám phá, tìm mối liên hệ, học tập)
  admin/    Vite + React — app quản trị nội dung (nhập liệu, duyệt)
packages/
  core/     schema Drizzle (kg / history / learning) + services dùng chung
  ui/       design tokens + component dùng chung, không phụ thuộc Next hay Vite
```

Trạng thái: khung project, chưa có logic thật. Xem mục 5 (lộ trình 8 tuần) của tài liệu thiết kế để biết thứ tự làm.

## Chạy thử

```
pnpm install
cp .env.example .env   # điền DATABASE_URL khi có Postgres thật

pnpm dev:api      # http://localhost:4000 — xem apps/api/src/routes/*.ts
pnpm dev:worker   # chưa có queue thật, chỉ in danh sách job
pnpm dev:web      # http://localhost:3000 — Next.js, app cho người dùng
pnpm dev:admin    # http://localhost:4100 — Vite, app quản trị
```

`packages/core` (schema Drizzle) cần `DATABASE_URL` để chạy `db:generate`/`db:migrate`; các app
còn lại chưa đọc DB thật nên chạy được ngay không cần Postgres. Khi có Postgres:

```
pnpm --filter @lineagraph/core db:generate
pnpm --filter @lineagraph/core db:migrate
```

## Việc tiếp theo

Theo lộ trình ở `docs/design.md` mục 14.2: chốt mô hình dữ liệu bằng dữ liệu thật (nhập tay
20–30 người vào bảng tính), rồi mới chạy migration Drizzle thật và thay các route `501
not_implemented` trong `apps/api/src/routes/` bằng logic thật — bắt đầu từ golden tests cho
`relations` (mục 7.7.7b của `docs/design.md`) trước khi viết thuật toán.
