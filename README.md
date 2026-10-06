# Sử Phả

Học lịch sử thế giới qua phả hệ, nhân vật, triều đại và sự kiện: ai là cha của ai, ai kế vị ai, hai người
có họ hàng thế nào, và điều đó được dẫn từ nguồn nào.

_Summary in English: Sử Phả ("History genealogy") is a Vietnamese-language knowledge graph of world history: people,
polities (dynasties, kingdoms), events and the relationships between them, with a source and a confidence level for each
fact. This is a pnpm monorepo: an Express + Postgres API, a public Next.js site, an admin SPA, and shared packages. The
content data is published under CC BY-SA 4.0. Everything the code prints or shows is in Vietnamese; code, file names and
comments are in English._

Codename kỹ thuật của repo/package là **lineagraph** (`@lineagraph/*`); tên hàm, tên file, tên thư mục và comment trong
code đều viết bằng tiếng Anh, quy ước ở [CLAUDE.md](CLAUDE.md). "Sử Phả" là tên sản phẩm hiển thị cho người dùng.
Thiết kế đầy đủ (mô hình dữ liệu, thuật toán, kiến trúc) nằm ở [`docs/`](docs/README.md): đọc `docs/README.md` trước khi đổi
cấu trúc.

## Cấu trúc

```
apps/
  api/      REST API (Express): đọc công khai, ghi cần đăng nhập admin
  web/      Next.js: trang công khai (nhân vật, chính thể, sự kiện, dòng thời gian, sơ đồ, tìm quan hệ)
  admin/    Vite + React: trang quản trị để thêm, sửa, xoá dữ liệu
  scripts/  script chạy tay (nhập Wikidata: chưa làm)
packages/
  core/     schema Drizzle (kg / history) + dịch vụ dùng chung + migration
  ui/       design tokens và component dùng chung, không phụ thuộc Next hay Vite
scripts/    công cụ vận hành: sao lưu, khôi phục, kiểm tra sau deploy, kiểm tra tương phản màu
docs/       thiết kế, triển khai, vận hành
```

## Chạy ở máy

Cần Node 22+ và pnpm (phiên bản ở `packageManager` trong `package.json`), và một Postgres.

```
pnpm install
cp .env.example .env     # điền DATABASE_URL, JWT_SECRET (≥ 32 ký tự), ADMIN_EMAIL, ADMIN_PASSWORD (≥ 12 ký tự)

pnpm db:migrate          # tạo schema và bảng
pnpm db:seed             # nạp danh mục (loại quan hệ, chức vụ, loại sự kiện...)
pnpm db:create-admin     # tạo tài khoản admin từ ADMIN_EMAIL / ADMIN_PASSWORD

pnpm dev:api      # http://localhost:4200
pnpm dev:web      # http://localhost:3200
pnpm dev:admin    # http://localhost:4100  (đăng nhập bằng tài khoản vừa tạo)
```

Không có tài khoản admin mặc định: bạn tự đặt mật khẩu khi chạy `db:create-admin`, và lệnh này từ chối mật khẩu ngắn.

Khi sửa schema trong `packages/core/src/schema/`: `pnpm db:generate` rồi `pnpm db:migrate`.

## Kiểm tra chất lượng

```
pnpm lint && pnpm format:check && pnpm typecheck
pnpm check:contrast       # độ tương phản màu chữ (WCAG) ở chế độ sáng và tối
TEST_DATABASE_URL=postgres://.../lineagraph_test pnpm test    # test dịch vụ và API cần một DB trống đã migrate + seed
pnpm build                # cần NEXT_PUBLIC_API_URL, SITE_URL, VITE_API_URL (hoặc ALLOW_LOCALHOST=1)
```

Không đặt `TEST_DATABASE_URL` thì các test cần DB được bỏ qua. **Đừng trỏ nó vào DB thật**: test tạo và xoá bản ghi.
CI (`.github/workflows/ci.yml`) chạy toàn bộ các bước trên, kèm kiểm tra lỗ hổng thư viện và build ba Docker image.

## Triển khai và vận hành

- Triển khai lên Railway, CI/CD, checklist trước khi mở công chúng: [`docs/deploy.md`](docs/deploy.md)
- Sao lưu, khôi phục, xử lý sự cố, đọc log: [`docs/operations.md`](docs/operations.md)
- Kiểm tra một bản đã deploy: `node scripts/smoke.mjs --api … --web … --admin …`

## Trạng thái

Đã chạy được: web công khai, trang quản trị, API và dữ liệu có nguồn cho từng thông tin. Chưa làm: hàng đợi duyệt dữ liệu, phần học
và ôn tập, nhập hàng loạt từ Wikidata, ảnh và bản đồ (xem `docs/README.md`).

## Giấy phép

Dữ liệu do Sử Phả biên soạn được chia sẻ theo [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.vi) (cách ghi
nguồn ở trang `/gioi-thieu` của site). Mã nguồn trong repo này riêng tư và chưa có giấy phép mở.
