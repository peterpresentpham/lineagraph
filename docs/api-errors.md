# Hợp đồng lỗi của API

Mọi lỗi API trả về đều là JSON cùng một dạng, kể cả đường dẫn không tồn tại (không bao giờ là trang HTML).

```json
{
  "error": "Tháng: giá trị tối đa là 12",
  "code": "VALIDATION_FAILED",
  "requestId": "5b8a0cdc-c968-4928-a75e-70622036ae30",
  "issues": [{ "path": "birth.month", "message": "Tháng: giá trị tối đa là 12" }]
}
```

| Trường              | Dành cho  | Ý nghĩa                                                                                                      |
| ------------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `error`             | Người dùng | Một câu tiếng Việt, hiện nguyên văn được. Có tên trường khi lỗi nằm ở một trường ("Năm: giá trị tối đa là 9999"). |
| `code`              | Chương trình | Mã ổn định, không dịch, không đổi câu chữ. Dùng để rẽ nhánh xử lý, không dùng `error`.                      |
| `requestId`         | Cả hai    | Trùng header `x-request-id` và dòng log của máy chủ. Người dùng báo mã này thì tìm đúng dòng lỗi trong log. |
| `issues`            | Form      | Chỉ khi `VALIDATION_FAILED`: mỗi trường một mục (`path`, `message`).                                         |
| `retryAfterSeconds` | Máy khách | Chỉ khi `RATE_LIMITED`: nên đợi bao lâu.                                                                     |
| `hint`, `detail`    | Dev       | Chỉ **ngoài production**: gợi ý cách sửa (ví dụ chạy `pnpm db:migrate`) và thông báo gốc của lỗi 500.        |

## Các mã lỗi

| Status | `code`                   | Khi nào                                                          |
| ------ | ------------------------ | ---------------------------------------------------------------- |
| 400    | `VALIDATION_FAILED`      | Dữ liệu gửi lên sai: xem `issues`                                |
| 400    | `INVALID_JSON`           | Thân yêu cầu không phải JSON                                     |
| 400    | `INVALID_VALUE`          | Mã định danh, số hoặc ngày không hợp lệ ở tầng cơ sở dữ liệu     |
| 400    | `BAD_REQUEST`            | Tham số truy vấn sai (ví dụ `limit=abc`)                         |
| 401    | `LOGIN_REQUIRED`         | Chưa gửi token                                                   |
| 401    | `SESSION_EXPIRED`        | Token hết hạn: đăng nhập lại                                     |
| 401    | `SESSION_INVALID`        | Token sai, đã bị thu hồi (đăng xuất nơi khác) hoặc tài khoản mất |
| 401    | `INVALID_CREDENTIALS`    | Sai email hoặc mật khẩu (không cho biết email có tồn tại không)  |
| 404    | `NOT_FOUND`              | Không có bản ghi                                                 |
| 404    | `ROUTE_NOT_FOUND`        | Không có đường dẫn này                                           |
| 409    | `STILL_REFERENCED`       | Còn dữ liệu khác trỏ tới mục này nên không xoá được              |
| 409    | `ALREADY_EXISTS`         | Trùng dữ liệu đã có                                              |
| 413    | `PAYLOAD_TOO_LARGE`      | Thân yêu cầu quá 256 KB                                          |
| 429    | `RATE_LIMITED`           | Quá nhiều yêu cầu (có `retryAfterSeconds`)                       |
| 503    | `TIMEOUT`                | Truy vấn chạy quá thời gian cho phép                             |
| 503    | `DATABASE_UNAVAILABLE`   | Mất kết nối cơ sở dữ liệu hoặc hết kết nối                       |
| 500    | `INTERNAL_ERROR`         | Lỗi không lường trước: log có đủ stack kèm `requestId`          |

## Khi thêm mã mới

- Trong dịch vụ, ném `new ServiceError(status, "Câu tiếng Việt")`; mã được suy ra từ status. Cần mã riêng thì gọi `sendError(res, status, message, { code })` trong `apps/api/src/http.ts`.
- Thông báo kiểm tra dữ liệu mặc định của Zod đã được dịch tập trung ở `packages/core/src/validation-messages.ts` (kèm bảng tên trường). Thêm trường mới vào bảng `FIELD_LABELS` để câu lỗi nêu đúng tên. Thông báo viết riêng cạnh schema (`.min(1, "Chọn nhân vật")`) vẫn được ưu tiên.
- Không đưa thông tin nội bộ (câu SQL, stack, đường dẫn) vào `error`. Chỉ `detail` ngoài production được phép chứa thông báo gốc.
