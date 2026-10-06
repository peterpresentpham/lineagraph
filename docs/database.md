# Sơ đồ quan hệ của cơ sở dữ liệu

> Địa điểm: bảng `history.place` (phân cấp qua `parent_id`, toạ độ tuỳ chọn); nhân vật trỏ tới nó bằng `birth_place_id` và `death_place_id`. Sự kiện là một `kg.node` loại `event` kèm bảng `history.event` và `history.event_participant` (xem mục 2.1).

Nguồn sự thật là các file schema Drizzle trong `packages/core/src/schema/` (`kg.ts`, `history.ts`, `learning.ts`, `auth.ts`). File này chỉ là bản vẽ để đọc nhanh; khi đổi schema, hãy cập nhật lại cho khớp.

Postgres chia làm bốn schema:

| Schema     | Vai trò                                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `kg`       | Lớp nền dùng chung: nút (nhân vật, chính thể), tên, ngày mờ, nguồn, trích dẫn, **quan hệ**, thuộc tính, danh mục |
| `history`  | Lớp miền lịch sử: hồ sơ nhân vật, hồ sơ chính thể, chức vụ (nhiệm kỳ)                                            |
| `learning` | Lớp học: thẻ ôn tập, nhật ký, tiến độ. Chỉ tham chiếu `kg.node`                                                  |
| `auth`     | Tài khoản admin                                                                                                  |

Ghi chú đọc sơ đồ: `||--o{` là một-nhiều; `}o--o|` là nhiều-một tuỳ chọn. Mermaid hiển thị được trên GitHub và trong nhiều trình xem Markdown.

## 1. Lõi: nút và quan hệ

Đây là phần quan trọng nhất. Mọi nhân vật và chính thể đều là một `kg.node`; mọi quan hệ giữa chúng (cha mẹ–con, vợ chồng, thầy trò, đồng minh, kế vị, sáng lập…) là một dòng `kg.relation`.

```mermaid
erDiagram
    NODE_KIND ||--o{ NODE : "kind"
    NODE ||--o{ NAME : "có tên"
    NODE ||--o{ ATTRIBUTE : "thông tin khác"
    ATTRIBUTE_TYPE ||--o{ ATTRIBUTE : "type"
    NODE ||--o{ EXTERNAL_ID : "id ngoài (Wikidata...)"
    NODE ||--o{ NODE_COLLECTION : ""
    COLLECTION ||--o{ NODE_COLLECTION : ""

    RELATION_TYPE ||--o{ RELATION : "type"
    NODE ||--o{ RELATION : "from_id"
    NODE ||--o{ RELATION : "to_id"
    FUZZY_DATE |o--o{ RELATION : "start_id / end_id"
    RELATION_TYPE |o--o| RELATION_TYPE : "inverse_code"

    NODE {
        uuid id PK
        text kind FK "person | polity"
        text slug UK
        text body "tiểu sử / lịch sử dài"
        text review_state
        uuid merged_into
        timestamptz deleted_at "xoá mềm"
    }
    NAME {
        uuid id PK
        uuid node_id FK
        text name
        text name_normalized "bỏ dấu để tìm kiếm"
        text kind FK "birth, temple, style..."
        bool is_primary
    }
    RELATION {
        uuid id PK
        text type FK
        uuid from_id FK
        uuid to_id FK
        text variant "ruột / nuôi / kế / hôn nhân..."
        text label "Hoàng hậu, Quân sư..."
        text note
        bool disputed "còn tranh cãi"
        text dispute_note "tranh cãi về điều gì"
        int confidence "1 đến 5, null là chưa đánh giá"
        int importance "1 đến 5, quyết định hiện sớm hay muộn trên sơ đồ"
        uuid start_id FK
        uuid end_id FK
        text state
    }
    RELATION_TYPE {
        text code PK
        text category "family, politics, personal, other"
        text inverse_code "chiều ngược"
        bool is_symmetric "hai chiều như nhau"
        bool is_primary "chiều chính được lưu"
        bool is_acyclic "cấm vòng lặp"
        text_array subject_kinds
        text_array object_kinds
    }
    ATTRIBUTE {
        uuid id PK
        uuid node_id FK
        text type FK
        text value
        int sort_order
    }
    ATTRIBUTE_TYPE {
        text code PK
    }
    EXTERNAL_ID {
        uuid node_id FK
        text system PK
        text value PK
    }
    COLLECTION {
        uuid id PK
        text slug UK
        uuid parent_id "chưa có FK"
        text kind
    }
```

Quy ước của `kg.relation`:

- Mỗi cặp loại quan hệ thuận/nghịch (ví dụ `parent_of` / `child_of`) chỉ lưu **một chiều chính** (`is_primary`). Chiều ngược được suy ra khi đọc.
- Loại đối xứng (`spouse_of`, `friend_of`, `ally_of`) lưu một lần, nút có id nhỏ hơn đứng trước.
- Loại có `is_acyclic` (cha mẹ–con) được kiểm tra vòng lặp bằng recursive CTE trước khi ghi.
- `CHECK (from_id <> to_id)`: không nối một nút với chính nó.
- `importance` (1 đến 5, `CHECK`): độ quan trọng riêng của từng quan hệ. Sơ đồ mở ra chỉ với các liên kết mức 5 (kế vị, sáng lập, chức vụ đứng đầu); bấm "Tải thêm" hạ ngưỡng từng bậc. Liên kết chức vụ lấy mức từ `history.office_type.importance` (Hoàng đế/Vua/Công/Chúa là 5, Nhiếp chính và Tể tướng là 3, còn lại 2).
- `kg.relation_type.default_importance`: điểm khởi đầu của quan hệ **mới** thuộc loại đó (kế vị, sáng lập 5; chinh phục, tách ra 4; cha mẹ-con, vợ chồng, anh em, chư hầu, đồng minh 3; thầy trò, bạn bè, đối thủ 2). Chỉ là giá trị mặc định lúc tạo: mỗi quan hệ vẫn lưu điểm riêng, đổi điểm mặc định không động tới quan hệ đã có.
- Unique index `relation_unique_key` (loại, hai đầu, biến thể) chặn trùng lặp; `kg.name` chỉ có một tên chính mỗi nút (kiểm tra ở `validation.ts`); `kg.citation` không lặp (nút, nguồn, vị trí trong nguồn).
- `kg.name.name_normalized` có chỉ mục GIN trigram (`pg_trgm`) cho tìm kiếm theo chuỗi con; chữ không phải Latin được chuyển tự (`transliteration`) khi chuẩn hoá.
- Ngày (`kg.fuzzy_date`): năm theo cách sử học (1 TCN là -1, không có năm 0), `earliest_jdn`/`latest_jdn` là số ngày Julius để sắp xếp, `edtf` có hậu tố `j` cho lịch Julius và `~` cho ngày xấp xỉ.
- Mọi thao tác ghi của admin được ghi vào `kg.audit_log` (ai, bảng nào, dòng nào, nội dung gửi lên).
- Nhãn tiếng Việt của loại quan hệ nằm trong `kg.label`, không nằm trong `relation_type`.

## 2. Lớp miền lịch sử

`history.person` và `history.polity` là **bảng mở rộng của `kg.node`**: dùng chung khoá chính (`id` vừa là PK vừa là FK sang `kg.node`).

```mermaid
erDiagram
    NODE ||--o| PERSON : "id (mở rộng)"
    NODE ||--o| POLITY : "id (mở rộng)"
    POLITY_TYPE ||--o{ POLITY : "polity_type"

    PERSON ||--o{ PERSON_DATE : "ngày sinh / mất"
    FUZZY_DATE ||--o{ PERSON_DATE : "date_id"

    PERSON ||--o{ TENURE : "person_id"
    POLITY |o--o{ TENURE : "polity_id"
    OFFICE_TYPE ||--o{ TENURE : "office_type"
    SUCCESSION_MODE |o--o{ TENURE : "succession_mode"
    FUZZY_DATE |o--o{ TENURE : "start_id / end_id"

    TENURE ||--o{ TENURE_ERA : "niên hiệu"
    FUZZY_DATE |o--o{ TENURE_ERA : "start_id / end_id"

    TENURE ||--o{ TENURE_SUCCESSION : "from_tenure_id"
    TENURE ||--o{ TENURE_SUCCESSION : "to_tenure_id"
    SUCCESSION_MODE ||--o{ TENURE_SUCCESSION : "mode"

    FUZZY_DATE |o--o{ POLITY : "started_id / ended_id"

    PERSON {
        uuid id PK,FK
        text sex "male | female | unknown"
        text historicity "historical | semi_legendary | legendary"
        text summary
    }
    POLITY {
        uuid id PK,FK
        text polity_type FK
        uuid started_id FK
        uuid ended_id FK
        text summary
    }
    PERSON_DATE {
        uuid id PK
        uuid person_id FK
        text kind "birth | death"
        uuid date_id FK
        bool is_preferred "mỗi (người, loại) chỉ một dòng ưu tiên"
    }
    TENURE {
        uuid id PK
        uuid person_id FK
        uuid polity_id FK
        text office_type FK
        text succession_mode FK
        uuid start_id FK
        uuid end_id FK
        int seq "thứ tự trong chính thể"
        bool disputed "thời gian hoặc việc giữ chức còn tranh cãi"
    }
    TENURE_ERA {
        uuid id PK
        uuid tenure_id FK
        text name "tên niên hiệu"
        uuid start_id FK
        uuid end_id FK
    }
    TENURE_SUCCESSION {
        uuid from_tenure_id PK,FK
        uuid to_tenure_id PK,FK
        text mode FK
        text state
    }
    OFFICE_TYPE {
        text code PK
        text category
        bool is_sovereign
        int importance "1 đến 5, độ quan trọng của liên kết người giữ chức - chính thể"
    }
```

Cả hai FK `start_id` / `end_id` của `tenure` trỏ về `kg.fuzzy_date` (ngày mờ lưu dạng EDTF kèm khoảng JDN).

`tenure` còn có `confidence` (1 đến 5, null là chưa đánh giá), `note` và `state` (`accepted` hoặc
`alternative`). Phiên bản `alternative` ghi lại cách hiểu của một sử gia khác cho cùng một ngôi vị;
sơ đồ, danh sách chính thể dùng `accepted` và kiểm tra chồng lấn bỏ qua `alternative`.

### 2.1. Sự kiện

`history.event` (1-1 với `kg.node.kind = 'event'`, nên có tên, slug, nguồn, nhật ký như nhân vật):
`event_type` (danh mục `history.event_type`), `start_id`, `end_id` (ngày mờ), `place_id`,
`parent_event_id` (chiến dịch chứa trận đánh), `summary`, `outcome`. Văn bản dài nằm ở `kg.node.body`.

`history.event_participant` (`event_id`, `node_id`, `role`, `side`, `note`, `sort_order`): người hoặc
chính thể tham gia với vai trò thuộc danh mục `history.participant_role`. `side` gom các bên của
một cuộc chiến hay hiệp ước (1, 2...). Khoá duy nhất `(event_id, node_id, role)`; ghi lại danh sách
dùng upsert chứ không xoá rồi chèn, vì hai việc đó chạy chung một câu SQL nên không có thứ tự cố định.
Sự kiện chưa là nút trong đồ thị quan hệ (đồ thị chỉ có nhân vật và chính thể); xem sự kiện của một
nút bằng `GET /events?node=<id>`.

## 3. Nguồn, trích dẫn, ngày mờ và nhật ký

`kg.citation` là **tham chiếu đa hình**: `(subject_table, subject_id)` có thể trỏ tới `person`, `polity`, `event`, `tenure` hoặc `relation`, nên không có khoá ngoại thật cho cột `subject_id`. Cột `stance` (`supports`, `disputes`, `mentions`) cho biết nguồn ủng hộ, phản bác hay chỉ nhắc đến điều được nêu, để một quan hệ còn tranh cãi trỏ được tới nguồn của từng phía.

```mermaid
erDiagram
    SOURCE ||--o{ CITATION : "source_id"
    CITATION }o..o| PERSON : "subject_table = person"
    CITATION }o..o| POLITY : "subject_table = polity"
    CITATION }o..o| TENURE : "subject_table = tenure"
    CITATION }o..o| RELATION : "subject_table = relation"
    LANGUAGE |o--o{ SOURCE : "language"
    CALENDAR |o--o{ FUZZY_DATE : "source_calendar"
    LANGUAGE ||--o{ LABEL : "language"

    SOURCE {
        uuid id PK
        text title
        text author
        text kind
        text url
        text license
        smallint reliability
    }
    CITATION {
        uuid id PK
        text subject_table
        uuid subject_id "không có FK (đa hình)"
        uuid source_id FK
        text locator
        text quote
        smallint confidence "1 đến 5"
    }
    FUZZY_DATE {
        uuid id PK
        text edtf
        int earliest_jdn
        int latest_jdn
        text precision
        text source_calendar FK
        text original_text
    }
    LABEL {
        text namespace PK
        text code PK
        text language PK,FK
        text text
    }
    AUDIT_LOG {
        uuid id PK
        text table_name
        uuid row_id
        text action
        text actor
        jsonb before
        jsonb after
    }
```

`kg.label` giữ nhãn hiển thị (tiếng Việt) cho mọi bảng danh mục, theo khoá `(namespace, code, language)`. `kg.audit_log` ghi lịch sử thay đổi, không có khoá ngoại.

## 4. Lớp học và tài khoản

```mermaid
erDiagram
    NODE ||--o{ CARD : "node_id"
    CARD ||--o{ REVIEW_LOG : "card_id"
    NODE ||--o{ PROGRESS : "node_id"

    CARD {
        uuid id PK
        uuid node_id FK
        uuid relation_id "chưa có FK"
        timestamptz due_at
        real stability
        real difficulty
        text state
    }
    REVIEW_LOG {
        uuid id PK
        uuid card_id FK
        int rating
        timestamptz reviewed_at
    }
    PROGRESS {
        uuid id PK
        uuid node_id FK
        real mastered_ratio
        jsonb stats
    }
    ADMIN {
        uuid id PK
        text email UK
        text password_hash
        timestamptz created_at
    }
```

`auth.admin` hoàn toàn độc lập, không liên kết với bảng nào khác.

## 5. Các bảng danh mục

Những bảng chỉ có cột `code` (và vài cột phụ) dùng làm khoá ngoại để giới hạn giá trị; thêm giá trị mới là thêm dòng dữ liệu, không sửa code. Nhãn tiếng Việt nằm trong `kg.label`.

| Bảng                         | Dùng bởi                              | Admin sửa được             |
| ---------------------------- | ------------------------------------- | -------------------------- |
| `kg.node_kind`               | `kg.node.kind`                        | Không                      |
| `kg.name_kind`               | `kg.name.kind`                        | Có                         |
| `kg.language`, `kg.calendar` | tên, nguồn, ngày                      | Không                      |
| `kg.relation_type`           | `kg.relation.type`                    | Có, ở trang "Loại quan hệ" |
| `kg.attribute_type`          | `kg.attribute.type`                   | Có                         |
| `history.polity_type`        | `history.polity`                      | Có                         |
| `history.office_type`        | `history.tenure`                      | Có                         |
| `history.succession_mode`    | `history.tenure`, `tenure_succession` | Có                         |
| `history.event_type`         | `history.event`                       | Có                         |
| `history.participant_role`   | `history.event_participant`           | Có                         |

## 6. Những chỗ chưa có khoá ngoại

Đã biết và chưa xử lý (đang chờ quyết định, xem phần cải tiến DB ở docs khác):

- `kg.collection.parent_id`
- `kg.node.merged_into`
- `kg.name.valid_from`, `kg.name.valid_to` (lẽ ra trỏ `kg.fuzzy_date`)
- `learning.card.relation_id` (lẽ ra trỏ `kg.relation`)
- `kg.citation.subject_id` (đa hình, cố ý không có FK)
