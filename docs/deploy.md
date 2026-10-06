# Triển khai lên Railway

Hệ thống gồm ba service chạy từ **cùng một repo** (monorepo pnpm) và một cơ sở dữ liệu Postgres:

| Service | Thư mục      | Làm gì                          | Cổng       |
| ------- | ------------ | ------------------------------- | ---------- |
| `api`   | `apps/api`   | REST API (Express)              | `PORT`     |
| `web`   | `apps/web`   | Trang công khai (Next.js)       | `PORT`     |
| `admin` | `apps/admin` | Trang quản trị (Vite, tĩnh)     | `PORT`     |

Mỗi service có một `Dockerfile` và một `railway.json` trong thư mục của nó (`apps/<tên>/`).
`railway.json` khai báo Dockerfile, kiểm tra sống, và **danh sách đường dẫn (watch paths) quyết định
khi nào service được deploy lại**; với `api` còn có lệnh chạy migration trước mỗi lần bật bản mới.

## Mỗi service deploy riêng

Railway chỉ deploy lại một service khi commit mới có file thay đổi khớp với `watchPatterns` của nó:

| Service | Deploy lại khi đổi                                                            |
| ------- | ----------------------------------------------------------------------------- |
| `api`   | `apps/api/**`, `packages/core/**`, và file dùng chung (bên dưới)               |
| `web`   | `apps/web/**`, `packages/ui/**`, và file dùng chung                           |
| `admin` | `apps/admin/**`, `packages/ui/**`, và file dùng chung                         |

File dùng chung: `package.json` gốc, `pnpm-workspace.yaml`, `tsconfig.base.json`.

- Sửa giao diện chung `packages/ui` thì `web` và `admin` cùng deploy, `api` thì không. Sửa
  `packages/core` thì chỉ `api` deploy. Sửa chỉ `docs/` hay README thì không service nào deploy.
- `pnpm-lock.yaml` **không** nằm trong danh sách, để một lần nâng thư viện của riêng một app không kéo
  cả ba service deploy lại. Thư viện của app nào đổi thì `package.json` của app đó đổi và nó vẫn được deploy.
  Nếu chỉ lockfile đổi (ví dụ cập nhật thư viện gián tiếp), hãy bấm **Redeploy** service cần dùng bản mới.
- Dockerfile chỉ chép `package.json` của các package mà service cần rồi mới cài (`pnpm install --filter
  <service>...`), nên lớp cài thư viện được dùng lại khi chỉ mã nguồn đổi và image nhỏ hơn.

## 1. Cơ sở dữ liệu

Có hai cách, chọn một:

- **Giữ Neon** (đang dùng): đặt `DATABASE_URL` của Neon cho service `api`. Chọn region Railway gần
  region của Neon, vì mỗi truy vấn trả một lượt mạng. Cần quyền `CREATE EXTENSION pg_trgm` (Neon cho phép).
- **Postgres của Railway**: thêm service Postgres vào cùng project, `DATABASE_URL` lấy bằng tham chiếu
  `${{Postgres.DATABASE_URL}}`. Cùng mạng nội bộ nên nhanh hơn Neon từ xa. Chuyển dữ liệu từ Neon bằng
  `pg_dump` rồi `pg_restore`.

## 2. Tạo project và ba service

1. Railway → **New Project** → **Deploy from GitHub repo** → chọn repo này. Làm lần lượt ba lần để có
   ba service, đặt tên `api`, `web`, `admin`.
2. Ở **Settings** của từng service:
   - **Root Directory**: để trống. Phải build từ gốc repo vì pnpm workspace dùng chung `packages/core`
     và `packages/ui`.
   - **Config-as-code → Railway Config File**: `/apps/api/railway.json`, `/apps/web/railway.json`,
     `/apps/admin/railway.json` tương ứng.
   - Nếu service không nhận file cấu hình (Railway có thể bỏ qua config-as-code ở service tạo mới),
     nhập tay cùng nội dung: **Build → Builder** = Dockerfile, **Dockerfile Path** = `apps/<tên>/Dockerfile`
     (hoặc biến `RAILWAY_DOCKERFILE_PATH`); **Source → Watch Paths** = các đường dẫn ở bảng trên;
     **Deploy → Pre-deploy Command** (chỉ `api`) = `pnpm --filter @lineagraph/core db:migrate`;
     **Healthcheck Path** = `/health` (api) hoặc `/` (web, admin). Kiểm tra lại Watch Paths bằng cách
     push một commit chỉ sửa `docs/`: không service nào được deploy.
3. **Networking → Generate Domain** cho cả ba (hoặc gắn tên miền riêng).

## 3. Biến môi trường

Đặt ở tab **Variables** của từng service. `${{...}}` là tham chiếu giữa các service của Railway.

**api**

| Biến           | Giá trị                                                                              |
| -------------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL` | chuỗi kết nối Postgres (mục 1)                                                        |
| `JWT_SECRET`   | chuỗi ngẫu nhiên từ 32 ký tự, ví dụ `openssl rand -hex 32` (không được là giá trị mẫu `change-me...`) |
| `PORT`         | `4200` (đặt cố định để service khác tham chiếu được)                                  |
| `TRUST_PROXY`  | `1` (Railway đứng trước API; cần cho giới hạn tần suất theo IP)                       |
| `WEB_ORIGIN`   | địa chỉ công khai của `web`, ví dụ `https://suPha.up.railway.app`, **không có dấu `/` cuối** |
| `ADMIN_ORIGIN` | địa chỉ công khai của `admin`, cũng không có dấu `/` cuối                             |
| `DB_STATEMENT_TIMEOUT_MS` | tuỳ chọn: thời gian tối đa một truy vấn (mặc định `8000`; `0` để tắt; xem `operations.md` nếu dùng Neon `-pooler`) |

API ở chế độ production **từ chối khởi động** (và in rõ lỗi) nếu thiếu `DATABASE_URL`, `TRUST_PROXY`,
`WEB_ORIGIN`, `ADMIN_ORIGIN`, nếu `JWT_SECRET` ngắn hoặc là giá trị mẫu, hoặc nếu các địa chỉ trỏ vào `localhost`.

**web**

| Biến                  | Giá trị                                                                              |
| --------------------- | ------------------------------------------------------------------------------------ |
| `API_URL`             | địa chỉ nội bộ: `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:4200` (server của web gọi API) |
| `NEXT_PUBLIC_API_URL` | địa chỉ công khai của `api` (trình duyệt gọi API, dùng cho sơ đồ). **Nhúng lúc build** |
| `SITE_URL`            | địa chỉ công khai của `web` (cho sitemap, thẻ OG). **Nhúng lúc build**                   |
| `FEEDBACK_URL`        | tuỳ chọn: nơi nhận báo lỗi (xem mục "Kênh báo lỗi" bên dưới). Chưa đặt thì trang Báo lỗi không có nút gửi |

`web` **từ chối build và khởi động** nếu `NEXT_PUBLIC_API_URL` hoặc `SITE_URL` thiếu hoặc trỏ vào `localhost`, và
nếu `API_URL` thiếu khi chạy. Để chạy thử bản production ở máy, đặt `ALLOW_LOCALHOST=1`.

**admin**

| Biến           | Giá trị                                                    |
| -------------- | ---------------------------------------------------------- |
| `VITE_API_URL` | địa chỉ công khai của `api`. **Nhúng lúc build**            |
| `VITE_WEB_URL` | địa chỉ công khai của `web` (cho nút "Xem trên web")        |

Build `admin` thất bại nếu `VITE_API_URL` thiếu hoặc trỏ vào `localhost`.

> `NEXT_PUBLIC_API_URL`, `SITE_URL` (web) và `VITE_API_URL`, `VITE_WEB_URL` (admin) được nhúng vào mã khi
> build. Railway chuyển biến thành build argument theo đúng tên, khớp với `ARG` trong Dockerfile. Đổi giá
> trị thì phải **Redeploy** service đó.

## 4. Thứ tự deploy lần đầu

1. Deploy `api` trước. Lệnh trước-khi-chạy `pnpm db:migrate` sẽ tạo schema và bảng. Mở
   `https://<api>/health`, phải thấy `{"ok":true}`.
2. Có địa chỉ công khai của `api` rồi mới điền biến cho `web` và `admin`, sau đó deploy hai service này.
3. Quay lại điền `WEB_ORIGIN`, `ADMIN_ORIGIN` cho `api` (CORS), để API nhận lời gọi từ admin.
4. Nạp dữ liệu và tạo tài khoản admin (một lần), từ máy bạn với Railway CLI. DB mới hoàn toàn:
   chạy `db:seed` để có danh mục. Nếu có bản chụp nội dung từ trước (`scripts/db-export.sh`), **bỏ `db:seed`** và
   nạp bằng `scripts/db-import.sh` (xem `operations.md`):

   ```
   npm i -g @railway/cli && railway login && railway link
   railway run --service api pnpm db:seed
   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='mật-khẩu-dài' \
     railway run --service api pnpm db:create-admin
   ```

   `railway run` chạy lệnh trên máy bạn nhưng với biến môi trường của service, nên `DATABASE_URL` phải
   là địa chỉ **công khai** của DB (Neon thì sẵn có; Postgres của Railway dùng `DATABASE_PUBLIC_URL`).
   Mật khẩu admin phải dài ít nhất 12 ký tự. Chạy lại `db:create-admin` để đổi mật khẩu (mọi phiên đang mở bị đăng xuất).
5. Nếu DB có dữ liệu cũ từ trước ngày sửa quy ước năm TCN, chạy thêm một lần
   `railway run --service api pnpm db:recompute-dates`.

## 5. Về sau

- Mỗi lần push lên nhánh đã nối, Railway tự deploy những service có file thay đổi (theo `watchPatterns`
  trong `railway.json`). Đổi `packages/core` thì `api` được deploy lại.
- Đổi schema: `pnpm db:generate`, commit file SQL mới trong `packages/core/drizzle/`; lần deploy `api` tiếp
  theo tự chạy migration trước khi đổi bản chạy. Migration chạy lỗi thì bản mới không được bật.
- API chạy bằng `tsx` thẳng từ mã nguồn (`pnpm exec tsx src/index.ts`), vì `@lineagraph/core` là mã
  TypeScript dùng chung; không chạy được bằng `node dist/index.js`.
- Thử build image ở máy (cần Docker): `docker build -f apps/api/Dockerfile .`, tương tự với `web` và `admin`.
  Build từ **thư mục gốc repo** vì Dockerfile chép cả `packages/`.

## 6. Tự động kiểm tra và deploy khi push / merge vào `main`

Luồng làm việc:

```
nhánh dev ──► Pull Request vào main ──► CI chạy (GitHub Actions) ──► merge ──► CI chạy lại trên main
                                                                              └─► Railway deploy
                                                                                  (chỉ service có file đổi,
                                                                                   và chỉ khi CI xanh)
```

**CI** là `.github/workflows/ci.yml`, chạy cho mọi Pull Request và mọi push vào `main`: lint, kiểm tra
định dạng, type-check, migrate + seed một Postgres tạm (chứng minh mọi migration chạy được trên DB rỗng),
test (gồm test tích hợp), rồi build cả ba app. Workflow không cần secret nào; nó dùng một Postgres tạm
trong runner. Mọi biến thật (DB, JWT) chỉ nằm ở Railway.

**CD** do Railway làm, không cần viết thêm workflow:

1. Ở từng service: **Settings → Source** → nối GitHub repo, **Branch** = `main`. Push hoặc merge vào
   `main` là kích hoạt deploy; nhánh khác (như `dev`) không deploy.
2. Bật **Wait for CI** (cũng ở Settings → Source): Railway chờ GitHub Actions xong, **chỉ deploy khi CI
   xanh**. CI đỏ thì không có gì lên production. Kiểm tra lại bằng cách thử merge một commit làm hỏng
   type-check (hoặc xem tab Deployments có dòng "Waiting for CI").
3. `watchPatterns` (mục "Mỗi service deploy riêng") quyết định service nào được deploy trong số đó.

**Chỉ tài khoản của bạn được đưa code lên production.** Railway deploy mọi commit vào `main` bất kể ai đẩy
lên, nên khoá ở phía GitHub: **Settings → Branches → Add rule** cho `main`:

- Require a pull request before merging (hoặc tối thiểu: Restrict who can push → chỉ tài khoản của bạn).
- Require status checks to pass → chọn `check` (tên job trong `ci.yml`).
- Block force pushes và deletions.

Bạn đang là chủ repo cá nhân nên có thể tự merge PR; luật trên vẫn chặn lỡ tay push thẳng code chưa qua CI.

**Khi có sự cố:** vào tab **Deployments** của service → **Rollback** về bản trước. Rollback chỉ đổi mã
đang chạy, **không** hoàn tác migration đã chạy lên DB; vì vậy viết migration tương thích ngược (thêm cột,
thêm bảng; xoá hoặc đổi tên cột thì làm hai bước qua hai lần deploy). Nếu migration trước-khi-chạy lỗi,
bản mới không được bật và bản cũ vẫn chạy.

## Kênh báo lỗi

Người đọc báo sai sót qua trang `/bao-loi`, nút ở đó trỏ tới `FEEDBACK_URL`. Repo này để **riêng tư** nên người ngoài
không mở được Issues của nó. Cách làm gọn nhất:

1. Tạo một repo **công khai chỉ để nhận báo lỗi** (ví dụ `su-pha-bao-loi`, không chứa mã).
2. Bật Issues và thêm mẫu issue `.github/ISSUE_TEMPLATE/bao-loi.yml` với các ô: địa chỉ trang, điều sai, điều đúng,
   nguồn dẫn.
3. Đặt `FEEDBACK_URL` của service `web` là `https://github.com/<bạn>/su-pha-bao-loi/issues/new/choose` rồi Redeploy.

Cách khác: một địa chỉ email (`mailto:...`) hoặc biểu mẫu bên ngoài. Giá trị phải bắt đầu bằng `https://` hoặc `mailto:`.

## Checklist trước khi mở cho công chúng

- [ ] Đã áp migration lên DB production và nạp dữ liệu (`operations.md`, mục 3), **đã diễn tập khôi phục một lần**.
- [ ] Tài khoản admin có mật khẩu dài (≥ 12 ký tự), **không** phải tài khoản test; `JWT_SECRET` ngẫu nhiên, không dùng lại ở nơi khác.
- [ ] `node scripts/smoke.mjs --api … --web … --admin …` báo `All checks passed`.
- [ ] Mở thử: trang chủ, một trang nhân vật, `/sitemap.xml`, `/robots.txt`, trang `/gioi-thieu`, `/nguon`.
- [ ] `FEEDBACK_URL` đã đặt và nút Báo lỗi mở đúng nơi.
- [ ] Đã bật sao lưu của nhà cung cấp DB và có bản chụp `db-export` đầu tiên cất ở nơi riêng.
- [ ] Đã đọc lại `/quyen-rieng-tu` và `/dieu-khoan` và thấy đúng với thực tế (nếu thêm công cụ phân tích hay cookie thì phải cập nhật hai trang này trước).
- [ ] Đã gửi `sitemap.xml` cho Google Search Console (và Bing Webmaster nếu muốn).
- [ ] Với tên miền riêng: đã trỏ DNS, đặt lại `WEB_ORIGIN`, `ADMIN_ORIGIN`, `SITE_URL`, `NEXT_PUBLIC_API_URL`, `VITE_API_URL`
      rồi Redeploy cả ba; cân nhắc Cloudflare phía trước (xem `operations.md`).

## Kiểm tra nhanh sau khi deploy

- `https://<api>/health` trả `{"ok":true}`.
- `https://<web>/` hiện trang chủ có số liệu (nếu báo lỗi, kiểm tra `API_URL`).
- Đăng nhập được ở `https://<admin>/`; nếu bị chặn bởi CORS, kiểm tra `ADMIN_ORIGIN` trùng khớp tuyệt đối
  (không có dấu `/` ở cuối).
