# Vận hành

Tài liệu cho người trực hệ thống: sao lưu, khôi phục, xử lý sự cố, đọc log. Cách triển khai lần đầu ở
[`deploy.md`](deploy.md).

## 1. Dữ liệu nằm ở đâu

- **Nội dung** (nhân vật, chính thể, sự kiện, quan hệ, nguồn, danh mục) nằm ở hai schema `kg` và `history` của Postgres.
- **Tài khoản admin** nằm ở schema `auth`, **nhật ký thay đổi** ở bảng `kg.audit_log`.
- Không có dữ liệu nào khác cần sao lưu: web và admin không lưu gì, API không ghi tệp.

## 2. Sao lưu

Dùng **hai lớp**, vì chúng chống hai loại rủi ro khác nhau:

1. **Sao lưu của nhà cung cấp DB** (nên bật, chống mất cả cụm hoặc xoá nhầm gần đây):
   - Neon: bật *point-in-time restore* (khung thời gian giữ lịch sử theo gói), khôi phục bằng cách tạo *branch* từ một thời điểm.
   - Postgres của Railway: bật *Backups* ở tab Backups của service DB, đặt lịch hằng ngày.
2. **Bản chụp nội dung của riêng bạn** (chống lỗi tài khoản nhà cung cấp, và để chuyển sang nhà khác):

   ```
   DATABASE_URL=postgres://... scripts/db-export.sh        # tạo data/snapshot-YYYYMMDD-HHMM.sql.gz
   ```

   Chạy hằng tuần, và **trước mỗi lần đổi schema lớn hoặc nhập dữ liệu hàng loạt**. Cất tệp ở nơi khác với DB
   (ổ đĩa cá nhân, kho lưu trữ riêng). Thư mục `data/` bị `.gitignore` bỏ qua để không lỡ commit dữ liệu. Tệp chứa
   nội dung công khai nhưng không chứa tài khoản admin.

   Cần `pg_dump` (công cụ khách của PostgreSQL) cùng phiên bản chính với máy chủ hoặc mới hơn.

## 3. Khôi phục

**Diễn tập ít nhất một lần trước khi mở site**, rồi mỗi quý: một bản sao lưu chưa từng được thử khôi phục thì chưa
đáng tin.

Khôi phục bản chụp vào một DB **trống**:

```
createdb lineagraph_restore                          # hoặc tạo DB mới trên Railway/Neon
export DATABASE_URL=postgres://.../lineagraph_restore
pnpm db:migrate                                      # tạo bảng
scripts/db-import.sh data/snapshot-XXXX.sql.gz       # nạp nội dung (một giao dịch, lỗi thì không để lại gì)
pnpm db:create-admin                                 # tạo lại tài khoản admin (ADMIN_EMAIL, ADMIN_PASSWORD)
```

- **Không** chạy `pnpm db:seed` trước `db-import`: danh mục (loại quan hệ, chức vụ...) đã nằm trong bản chụp.
- `db-import.sh` từ chối chạy nếu DB đã có bản ghi, để không trộn hai nguồn dữ liệu.
- Sau khi khôi phục, trỏ `DATABASE_URL` của service `api` sang DB mới, deploy lại, rồi chạy
  `node scripts/smoke.mjs ...` (mục 6).

Khôi phục từ sao lưu của nhà cung cấp: làm theo hướng dẫn của họ (Neon: tạo branch từ thời điểm; Railway: restore backup),
sau đó đổi `DATABASE_URL` như trên.

## 4. Thay đổi schema (migration) an toàn

Migration chạy **trước** khi bản mới được bật (`preDeployCommand` của `api`). Nếu nó lỗi, bản cũ vẫn chạy. Nhưng khi
nó thành công mà bản mới lại có lỗi, bạn rollback *mã*, còn schema đã đổi. Vì vậy:

- Thêm cột, thêm bảng, thêm chỉ mục: an toàn, bản mã cũ vẫn chạy được với schema mới.
- Xoá hoặc đổi tên cột/bảng: làm **hai lần deploy**. Lần 1: mã mới không còn dùng cột đó. Lần 2: mới xoá cột.
- Thêm ràng buộc `NOT NULL` hoặc `UNIQUE` lên bảng có dữ liệu: kiểm tra dữ liệu hiện có thoả ràng buộc trước.
- Luôn `scripts/db-export.sh` trước khi áp migration có rủi ro.
- Drizzle không có migration "đi lùi". Muốn quay lại, khôi phục từ bản sao lưu.

## 5. Sự cố thường gặp

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| Web báo "Không tải được dữ liệu" | API chết hoặc không với tới DB | Mở `https://<api>/health`; 503 nghĩa là DB không trả lời. Xem log API. Nếu API chỉ chập chờn, web dùng lại câu trả lời gần nhất mà nó đã nhận được cho từng trang. |
| API không khởi động, log nói `Invalid production configuration` | Thiếu hoặc sai biến môi trường | Đọc từng dòng lỗi trong log, đặt biến, deploy lại. |
| Admin báo lỗi CORS | `ADMIN_ORIGIN` ở API không trùng khớp địa chỉ admin (có dấu `/` cuối, sai `https`) | Sửa `ADMIN_ORIGIN`, deploy lại API. |
| Mọi người dùng cùng bị "Quá nhiều yêu cầu" | `TRUST_PROXY` sai nên mọi khách chung một địa chỉ | Đặt `TRUST_PROXY=1` (API từ chối khởi động nếu thiếu ở production). |
| Một truy vấn chạy rất lâu, API trả 503 "mất quá nhiều thời gian" | `statement_timeout` (8 giây) cắt truy vấn | Xem log (tìm `statement timeout`) để biết đường dẫn nào. Với Neon qua cổng `-pooler`, đặt timeout ở role: `ALTER ROLE <tên> SET statement_timeout = '8s';` |
| Dữ liệu vừa sửa chưa hiện trên web | Web giữ cache dữ liệu 60 giây | Đợi một phút. |
| Dòng thời gian thiếu một thế kỷ vừa thêm | Chỉ mục thế kỷ cache 60 giây | Đợi một phút. |

## 6. Kiểm tra sau mỗi lần deploy

```
node scripts/smoke.mjs --api https://<api> --web https://<web> --admin https://<admin>
```

Script chỉ đọc (và thử một thao tác ghi mà API *phải từ chối*). Nó kiểm: API và DB sống, không còn địa chỉ `localhost`,
header bảo mật, CORS, mọi lệnh ghi cần đăng nhập, sitemap/robots đúng tên miền, trang bản ghi có dữ liệu có cấu trúc hợp lệ và
ảnh xem trước, admin build đúng địa chỉ API. Thoát với mã 1 nếu có lỗi.

## 7. Xem log

API ghi **mỗi dòng một đối tượng JSON** ra stdout (lỗi ra stderr), không kèm chuỗi truy vấn hay nội dung yêu cầu:

```json
{"time":"...","level":"info","message":"request","reqId":"…","method":"GET","path":"/persons","status":200,"ms":12}
```

- Mỗi phản hồi có header `x-request-id`; khi người dùng báo lỗi 500, họ thấy `requestId` trong thông báo. Tìm đúng mã
  đó trong log (Railway → service → Logs → lọc theo `reqId`) để xem lỗi và stack.
- Các mức đáng theo dõi: `"level":"error"` (lỗi 5xx, `unhandled error`, `statement timeout`), `"message":"failed login"`
  (đăng nhập sai, nhiều dòng liên tiếp từ một địa chỉ là dấu hiệu dò mật khẩu).
- Lệnh ghi của admin có thêm trường `admin` (mã tài khoản); chi tiết thay đổi nằm ở `kg.audit_log`.

## 8. Bị lộ khoá hoặc nghi bị xâm nhập

1. **Thu hồi mọi phiên admin ngay**: đổi mật khẩu bằng `pnpm db:create-admin` (nó tăng `token_version`, mọi token cũ mất hiệu lực), hoặc
   `UPDATE auth.admin SET token_version = token_version + 1;`
2. **Đổi `JWT_SECRET`** ở service `api` và deploy lại (mọi token, kể cả token giả, mất hiệu lực).
3. Nếu lộ `DATABASE_URL`: đổi mật khẩu DB ở nhà cung cấp, cập nhật biến, deploy lại.
4. Xem `kg.audit_log` (`select * from kg.audit_log order by at desc limit 100`) để biết ai đã sửa gì. Bản ghi bị xoá nhầm
   là xoá mềm, khôi phục được ở trang Tổng quan của admin hoặc `POST /<loại>/<id>/restore`.
5. Ghi lại diễn biến và nguyên nhân.

## 9. Khi lượng truy cập tăng

- Đặt **Cloudflare** (hoặc CDN tương tự) trước `web` và `api` khi có tên miền riêng: chặn bot, giảm tải, thêm chứng chỉ.
  Khi đó `TRUST_PROXY` phải đếm cả Cloudflare (thường `2`: Cloudflare rồi Railway).
- API giới hạn 600 yêu cầu/phút/địa chỉ và 60/phút cho các đường đắt (tìm kiếm, tìm quan hệ, sơ đồ, dòng thời gian);
  đổi trong `apps/api/src/middleware/limits.ts` nếu cần.
