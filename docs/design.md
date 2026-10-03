# Ý tưởng chi tiết: "Sử Phả" — app học lịch sử qua phả hệ, nhân vật và triều đại

> Tên chỉ là tạm. Ngày lập: 2026-10-03.
> Trạng thái: **ý tưởng đã chốt, chưa viết code.** Mọi dữ kiện lịch sử trong tài liệu này (tên triều đại, niên đại) chỉ mang tính minh hoạ cấu trúc. Khi nhập nội dung phải tự kiểm chứng với nguồn.
> Các mục "Cần kiểm tra" ghi rõ chỗ mình chưa xác minh.

---

> **Cập nhật mô hình quan hệ (thay thế các đoạn nói về `history.parentage` và `history.union_` bên dưới).**
> Sản phẩm xoay quanh *hồ sơ* của nhân vật và chính thể; quan hệ giữa chúng là tuỳ chọn và mở rộng được, không phải chỉ cha mẹ–con.
> - Mọi quan hệ nằm trong **một bảng `kg.relation`** (`type`, `from_id`, `to_id`, `variant`, `label`, `note`, `disputed`, thời gian mờ, `state`). Cha mẹ–con (`parent_of`, variant ruột/nuôi/kế) và vợ chồng (`spouse_of`, variant hôn nhân/thứ phi…) chỉ là hai loại trong danh mục. Hai bảng `history.parentage` và `history.union_` đã bị xoá (dữ liệu cũ đã được chuyển bằng migration 0003).
> - `kg.relation_type` có **cặp thuận/nghịch** (chỉ lưu chiều chính, chiều ngược suy ra khi đọc), loại **đối xứng** (lưu một lần, id nhỏ trước), cờ `is_acyclic` (kiểm tra vòng lặp bằng recursive CTE) và `subject_kinds/object_kinds` (nhân vật, chính thể). Thêm loại mới là thêm dữ liệu, không sửa code (trang admin "Loại quan hệ").
> - Hồ sơ: `kg.node.body` (văn bản dài) và `kg.attribute` / `kg.attribute_type` (thông tin tuỳ ý: quê quán, nơi an táng, kinh đô…, giá trị là văn bản).
> - Chức vụ vẫn ở `history.tenure`; khi tìm đường nối hai nút, chức vụ được coi là một cạnh chi phí 2.
> - **Tìm mối quan hệ** (`GET /relations?a=&b=`): (1) suy ra họ hàng huyết thống bằng tổ tiên chung gần nhất và số đời mỗi bên (`packages/core/src/relations/kinship.ts`): họ nội và họ ngoại (ông/bà nội/ngoại, bác, chú, cô, cậu, dì, anh chị em họ…); người xa hơn gọi "tổ N đời theo dòng cha/mẹ", dòng lẫn lộn thì chỉ "tổ N đời"; (2) liệt kê quan hệ trực tiếp; (3) các chuỗi quan hệ ngắn nhất (`pathfinder.ts`). Cả hai là hàm thuần, có test vàng (`pnpm test`).
> - **Sơ đồ quan hệ**: `GET /polities/:slug/graph` và `GET /persons/:slug/graph?depth=` trả nút và cạnh; web vẽ bằng @xyflow/react, bố cục dagre theo cạnh cha→con, các quan hệ khác vẽ chồng lên.
> - Các bảng/truy vấn `parentage`/`union_` ở những mục sau chỉ còn giá trị tham khảo lịch sử thiết kế.

## 1. Tóm tắt một đoạn

Một web app (và sau đó là app di động) giúp học lịch sử Việt Nam bằng cách **khám phá mạng lưới quan hệ** giữa nhân vật và triều đại: ai là con của ai, ai kế vị ai, ai là thầy/đối thủ/đồng minh của ai, hai nhân vật cách nhau bao nhiêu đời. Người dùng không đọc một danh sách mốc thời gian khô khan mà **đi dọc theo đồ thị**: bấm vào một vị vua, thấy cha mẹ, vợ con, người kế vị, triều đại, những sự kiện liên quan. Phần học tập (câu hỏi, lịch ôn, lộ trình) chạy trên chính đồ thị đó.

**Điểm khác biệt:** đa số tài liệu lịch sử trình bày theo dòng thời gian tuyến tính. App này trình bày theo **đồ thị có nguồn gốc rõ ràng**, mỗi dữ kiện đều có nguồn và độ chắc chắn, vì lịch sử không phải lúc nào cũng chắc chắn.

---

## 2. Mục tiêu, người dùng, phạm vi

### 2.1 Mục tiêu
1. **Học:** hiểu quan hệ nhân quả và kế vị giữa các nhân vật/triều đại, nhớ lâu bằng ôn tập ngắt quãng.
2. **Khám phá:** tra cứu nhanh "A là gì của B", xem phả hệ một dòng họ vua chúa.
3. **Kỹ thuật (cho người xây):** thực hành mô hình đồ thị trên Postgres, dữ liệu không chắc chắn, tính thời gian mờ, hiển thị đồ thị lớn, hệ thống học tập.

### 2.2 Người dùng
- **Chính:** bạn (người xây), tự học.
- **Phụ (sau MVP):** học sinh, sinh viên, người yêu lịch sử.

### 2.3 Trong phạm vi
- Nhân vật lịch sử Việt Nam, triều đại/chính thể, quan hệ giữa chúng, sự kiện chính gắn với nhân vật.
- Phả hệ hoàng tộc (vua, hoàng hậu, hoàng tử, công chúa, quan trọng thần).
- Học tập: câu hỏi, lộ trình, lịch ôn.

### 2.4 Ngoài phạm vi (giai đoạn đầu)
- Sinh vật/tiến hoá (để sau, xem mục 13).
- Lịch sử thế giới.
- Cộng tác nhiều người chỉnh sửa công khai.
- Mạng xã hội, bình luận.

---

## 3. Nguyên tắc thiết kế (quan trọng hơn danh sách tính năng)

1. **Mọi dữ kiện đều có nguồn và độ chắc chắn.** Không có "sự thật trơn". Một ngày sinh là một dữ kiện kèm nguồn, không phải một cột.
2. **Thời gian là khoảng mờ, không phải một ngày.** Lịch sử có "khoảng năm 1010", "trước 1225", "không rõ". Dùng biểu diễn thời gian cho phép sai số.
3. **Nội dung có kiểm duyệt.** Dữ kiện mới vào trạng thái "đề xuất" rồi mới "đã duyệt".
4. **Mô hình lai: nền chung nhỏ + bảng riêng theo loại.** Danh tính, tên, nguồn, trích dẫn dùng chung (`kg`); ràng buộc đặc thù (cha mẹ–con, hôn phối, nhiệm kỳ) nằm ở bảng riêng của miền (`history`). Không dồn mọi thứ vào một bảng "entity" kiểu khoá-giá trị. Mở rộng bằng **dữ liệu và bảng danh mục**, không bằng sửa schema (xem mục 5).
5. **Khi nguồn mâu thuẫn, hiển thị cả hai,** không tự chọn thay người đọc.
6. **Thiết kế để mở rộng, nhưng chỉ làm một miền trước.** Schema đã chừa chỗ (quốc gia, ngôn ngữ, lịch, miền mới); code dùng chung chỉ trích ra sau khi có miền thứ hai.

---

## 4. Mô hình khái niệm

### 4.1 Thực thể chính

| Thực thể | Ý nghĩa |
|---|---|
| **Person (nhân vật)** | Một con người lịch sử. Có nhiều tên (xem 4.3) |
| **Dynasty / Polity (triều đại, chính thể)** | Một triều đại hoặc chính quyền (có thể chồng lấn về thời gian, ví dụ thời phân tranh) |
| **Reign / Office (nhiệm kỳ, chức vụ)** | Một người giữ một chức vụ trong một khoảng thời gian (vua, chúa, tể tướng…) |
| **Union (hôn phối)** | Một cặp quan hệ vợ/chồng (có thể nhiều lần, nhiều vợ) |
| **Event (sự kiện)** | Trận đánh, cải cách, hiệp ước, thiên tai… |
| **Place (địa danh)** | Kinh đô, vùng đất, chiến trường (tên thay đổi theo thời kỳ) |
| **Source (nguồn)** | Sách sử, bài nghiên cứu, bia ký, trang dữ liệu mở |
| **Claim (dữ kiện)** | Một khẳng định cụ thể, gắn nguồn và độ tin cậy |

### 4.2 Các loại quan hệ (cạnh)

**Giữa nhân vật với nhân vật:**
- `parent_of` (có kiểu: `biological`, `adoptive`, `step`, `claimed`, `disputed`)
- `spouse_of` (qua `union`, có thứ bậc: hoàng hậu, phi, thiếp… và thời gian)
- `sibling_of` (suy ra từ cha mẹ, nhưng cho phép khai báo trực tiếp khi không rõ cha mẹ)
- `successor_of` (kế vị)
- `regent_for` (nhiếp chính)
- `teacher_of`, `ally_of`, `rival_of`, `served` (phục vụ) với thời gian

**Giữa nhân vật và triều đại:**
- `member_of`, `founded`, `ruled` (qua Reign), `overthrown_by`
- Triều đại với triều đại: `preceded_by`/`followed_by`, `split_from`, `parallel_to` (cùng tồn tại)

**Nhân vật và sự kiện:** `participated_in` (kèm vai trò), `caused`, `result_of`.

### 4.3 Tên người trong lịch sử Việt Nam (đặc thù)
Một nhân vật có thể có nhiều tên cùng lúc, nên **không dùng một cột `name`**:
- tên khai sinh/húy, tên tự, hiệu, tên thường gọi
- **miếu hiệu**, **thụy hiệu**, **niên hiệu** (của vua, tuỳ triều đại có hoặc không có)
- tên dân gian, tên chữ Hán, tên chữ Nôm

Thiết kế: bảng dùng chung `kg.name(node_id, name, name_normalized, kind, language, script, is_primary, valid_from, valid_to)`, với `kind` lấy từ danh mục `kg.name_kind` (thêm loại tên mới bằng `INSERT`, ví dụ patronymic, nasab khi mở rộng ra thế giới). Tìm kiếm phải khớp cả tên cũ, không dấu và có dấu (chi tiết ở mục 5.3).

---

## 5. Cấu trúc cơ sở dữ liệu (Postgres) và khả năng mở rộng

> Mục này là phần quan trọng nhất của tài liệu. Mô hình dữ liệu sai thì sửa rất đau, nên thiết kế ngay từ đầu để **mở rộng bằng dữ liệu, không bằng migration**: sau này thêm quốc gia, ngôn ngữ, loại lịch, loại quan hệ, thậm chí miền mới (sinh vật) mà không phải đập schema.
> Toàn bộ SQL dưới đây là **phác thảo thiết kế**, chưa chạy thử. Khi code thật sẽ viết bằng Drizzle và kiểm tra lại từng ràng buộc.

### 5.1 Nguyên tắc

1. **Ba lớp tách bạch**, mỗi lớp một schema Postgres:
   - **`kg` (lớp nền, dùng chung mọi miền):** định danh, tên, nguồn, trích dẫn, thời gian mờ, quan hệ mềm, bộ sưu tập, nhật ký thay đổi. Không biết gì về "vua" hay "loài".
   - **`history` (lớp miền lịch sử):** nhân vật, chính thể, nhiệm kỳ, hôn phối, cha mẹ–con, địa danh, sự kiện, quy tắc xưng hô.
   - **`learning` (lớp học tập):** thẻ ôn, tiến độ, câu hỏi. Chỉ tham chiếu `kg.node.id`, không đụng bảng của miền.
2. **Mô hình lai: "supertype chung + bảng riêng theo loại".** Mọi thứ có danh tính (người, chính thể, địa danh, sự kiện) là một dòng trong `kg.node`; chi tiết riêng của từng loại nằm ở bảng riêng dùng **cùng khoá chính**. Nhờ vậy:
   - tên, nguồn, trích dẫn, bộ sưu tập, ID ngoài, quan hệ mềm dùng chung, viết một lần;
   - ràng buộc đặc thù của miền (cha mẹ–con, hôn phối) vẫn là **khoá ngoại và CHECK thật** trong DB, không rơi vào "mọi thứ là JSON".
3. **Bảng danh mục (registry) thay cho `ENUM` của Postgres.** Loại quan hệ, loại tên, loại chức vụ, loại chính thể, lịch, ngôn ngữ… đều là bảng. Thêm giá trị = `INSERT`, không `ALTER TYPE`, không deploy.
4. **Thời gian trung lập về lịch** (xem 5.4), vì thế giới dùng nhiều lịch và có cả thời kỳ trước Công nguyên.
5. **Nhãn hiển thị tách khỏi mã** (bảng `kg.label`), để một mã quan hệ có nhãn tiếng Việt, tiếng Anh, tiếng Trung…
6. **Không xoá cứng; gộp trùng bằng chuyển hướng** (`merged_into`), vì ID cũ có thể đã nằm trong bài học, liên kết, thẻ ôn.
7. **Thay đổi schema luôn theo kiểu cộng thêm** (expand → migrate → contract). Tên cột/bảng đã dùng không đổi nghĩa.

### 5.2 Sơ đồ tổng thể

```
                          ┌───────────────────────── learning ─────────────────────────┐
                          │ card(node_id | relation ref) · review_log · progress        │
                          └───────────────────────────────┬─────────────────────────────┘
                                                          │ chỉ tham chiếu node.id
┌────────────────────────────────── kg (dùng chung) ──────┴──────────────────────────────┐
│ node ──< name            collection >──< node_collection                                  │
│  │  ──< external_id      source ──< citation (trỏ tới bất kỳ dòng nào)                    │
│  │  ──< relation(type)   fuzzy_date · calendar · language · relation_type · label         │
│  └── audit_log (bất biến)                                                                 │
└──────────▲───────────────▲────────────────▲───────────────▲──────────────────────────────┘
           │ cùng id        │                │                │
┌──────────┴──── history (miền lịch sử) ─────┴────────────────┴──────────────────────────┐
│ person · person_date · parentage · union_                                                 │
│ polity · tenure · tenure_era · office_type · succession_mode                              │
│ place · place_parent · event · event_participant                                          │
│ kinship_ruleset · kinship_rule                                                            │
└───────────────────────────────────────────────────────────────────────────────────────────┘
      (sau này) schema bio: taxon · phylo_edge ... dùng lại toàn bộ kg
```

### 5.3 Lớp nền `kg`

```sql
CREATE SCHEMA kg;

-- ===== Danh mục (registry): thêm giá trị bằng INSERT =====
CREATE TABLE kg.node_kind   (code text PRIMARY KEY);              -- person, polity, place, event, ...
CREATE TABLE kg.name_kind   (code text PRIMARY KEY);              -- birth, style, temple, posthumous, era, common, patronymic, ...
CREATE TABLE kg.language    (code text PRIMARY KEY, name text NOT NULL);   -- vi, en, zh-Hant, ja, ...
CREATE TABLE kg.calendar    (code text PRIMARY KEY, name text NOT NULL);   -- gregorian, julian, vn_lunisolar, chinese_lunisolar, hijri, ...

CREATE TABLE kg.relation_type (
  code          text PRIMARY KEY,                 -- teacher_of, regent_for, ally_of, vassal_of, ...
  category      text NOT NULL,                    -- kinship | political | social | causal
  inverse_code  text REFERENCES kg.relation_type(code) DEFERRABLE INITIALLY DEFERRED,
  is_symmetric  boolean NOT NULL DEFAULT false,
  subject_kinds text[] NOT NULL,                  -- node_kind được phép làm chủ thể
  object_kinds  text[] NOT NULL                   -- node_kind được phép làm đối tượng
);

-- Nhãn hiển thị cho mọi danh mục theo ngôn ngữ (một nơi duy nhất)
CREATE TABLE kg.label (
  namespace text NOT NULL,                        -- 'relation_type','name_kind','office_type',...
  code      text NOT NULL,
  language  text NOT NULL REFERENCES kg.language(code),
  text      text NOT NULL,
  PRIMARY KEY (namespace, code, language)
);

-- ===== Định danh =====
CREATE TABLE kg.node (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         text NOT NULL REFERENCES kg.node_kind(code),
  slug         text NOT NULL UNIQUE,
  review_state text NOT NULL DEFAULT 'draft'
               CHECK (review_state IN ('draft','proposed','approved','rejected')),
  merged_into  uuid REFERENCES kg.node(id),       -- chuyển hướng khi gộp bản ghi trùng
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  UNIQUE (id, kind)                               -- để bảng miền khoá ngoại theo (id, kind)
);

-- ===== Bộ sưu tập (phạm vi nội dung): 'vn', 'cn', 'world', 'vn-ly-tran', 'ancient-egypt' ... =====
CREATE TABLE kg.collection (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  parent_id   uuid REFERENCES kg.collection(id),
  kind        text NOT NULL,                      -- region | era | theme
  description text
);
CREATE TABLE kg.node_collection (
  node_id       uuid NOT NULL REFERENCES kg.node(id),
  collection_id uuid NOT NULL REFERENCES kg.collection(id),
  PRIMARY KEY (node_id, collection_id)            -- một nút có thể thuộc nhiều bộ sưu tập
);

-- ===== Tên (nhiều tên, nhiều ngôn ngữ, có hiệu lực theo thời gian) =====
CREATE TABLE kg.name (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id         uuid NOT NULL REFERENCES kg.node(id),
  name            text NOT NULL,
  name_normalized text NOT NULL,                  -- bỏ dấu, hạ chữ thường, để tìm kiếm
  kind            text NOT NULL REFERENCES kg.name_kind(code),
  language        text REFERENCES kg.language(code),
  script          text,                           -- latin | han | nom | kana | arabic | ...
  is_primary      boolean NOT NULL DEFAULT false,
  valid_from      uuid,                           -- fuzzy_date, ví dụ Thăng Long -> Hà Nội
  valid_to        uuid
);
CREATE INDEX ON kg.name USING gin (name_normalized gin_trgm_ops);

-- ===== Định danh ở hệ thống ngoài =====
CREATE TABLE kg.external_id (
  node_id uuid NOT NULL REFERENCES kg.node(id),
  system  text NOT NULL,                          -- wikidata | viaf | geonames | ncbi | ...
  value   text NOT NULL,
  PRIMARY KEY (system, value)
);

-- ===== Thời gian mờ, trung lập về lịch (xem 5.4) =====
CREATE TABLE kg.fuzzy_date (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edtf          text,                             -- dạng gốc theo EDTF: '1010~', '1225?', '1428/1433'
  earliest_jdn  integer,                          -- cận dưới, Julian Day Number
  latest_jdn    integer,                          -- cận trên
  span          int4range GENERATED ALWAYS AS (int4range(earliest_jdn, latest_jdn, '[]')) STORED,
  precision     text NOT NULL,                    -- day | month | year | decade | century | millennium
  source_calendar text REFERENCES kg.calendar(code),
  original_text text,                             -- đúng như nguồn ghi: "năm Thái Ninh thứ 3"
  note          text
);
CREATE INDEX ON kg.fuzzy_date USING gist (span);

-- ===== Nguồn và trích dẫn =====
CREATE TABLE kg.source (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  author      text,
  kind        text,                               -- chronicle | book | paper | inscription | open_data
  language    text REFERENCES kg.language(code),
  url         text,
  license     text,
  reliability smallint CHECK (reliability BETWEEN 1 AND 5),
  note        text
);

-- Trích dẫn đa hình: gắn nguồn cho BẤT KỲ dòng nào (cha mẹ–con, ngày sinh, nhiệm kỳ, quan hệ…)
CREATE TABLE kg.citation (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_table text NOT NULL,                    -- 'history.parentage', 'history.person_date', ...
  subject_id    uuid NOT NULL,
  source_id     uuid NOT NULL REFERENCES kg.source(id),
  locator       text,                             -- trang, chương, dòng
  quote         text,                             -- trích ngắn (tôn trọng bản quyền)
  confidence    smallint NOT NULL CHECK (confidence BETWEEN 0 AND 100)
);
CREATE INDEX ON kg.citation (subject_table, subject_id);

-- ===== Quan hệ "mềm" giữa hai nút bất kỳ (loại quan hệ nằm trong registry) =====
CREATE TABLE kg.relation (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type      text NOT NULL REFERENCES kg.relation_type(code),
  from_id   uuid NOT NULL REFERENCES kg.node(id),
  to_id     uuid NOT NULL REFERENCES kg.node(id),
  start_id  uuid REFERENCES kg.fuzzy_date(id),
  end_id    uuid REFERENCES kg.fuzzy_date(id),
  state     text NOT NULL DEFAULT 'proposed',
  CHECK (from_id <> to_id)
);
CREATE INDEX ON kg.relation (from_id, type);
CREATE INDEX ON kg.relation (to_id, type);

-- ===== Nhật ký thay đổi bất biến =====
CREATE TABLE kg.audit_log (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name text NOT NULL,
  row_id     uuid NOT NULL,
  action     text NOT NULL,                       -- insert | update | delete | merge | approve
  actor      text NOT NULL,
  before     jsonb,
  after      jsonb,
  at         timestamptz NOT NULL DEFAULT now()
);
```

**Vì sao `kg.relation` + `relation_type` thay cho các bảng quan hệ riêng lẻ:** quan hệ "mềm" (thầy–trò, đồng minh, đối thủ, chư hầu, nhiếp chính, nguyên nhân–kết quả) rất đa dạng và sẽ tăng khi thêm quốc gia. Một bảng + danh mục cho phép thêm loại mới bằng `INSERT`. Quan hệ **huyết thống và hôn phối thì không để ở đây**, mà có bảng riêng ở lớp `history` (5.5) vì cần ràng buộc chặt và truy vấn tổ tiên nhanh.

### 5.4 Thời gian: vì sao dùng Julian Day Number

- Thế giới dùng nhiều lịch (dương, Julian, âm lịch Việt/Trung, Hồi giáo, Nhật…), và có sự kiện trước Công nguyên hoặc xa hơn khoảng ngày mà kiểu `date` thông thường biểu diễn được.
- **Julian Day Number (JDN)** là số ngày liên tục, **không phụ thuộc lịch**, so sánh và đánh chỉ mục (GiST trên `int4range`) trực tiếp. Mọi lịch chuyển thành JDN qua bộ chuyển đổi ở tầng ứng dụng.
- Một ngày mờ là **khoảng** `[earliest_jdn, latest_jdn]`. "Năm 1010" là cả khoảng từ 1/1 tới 31/12; "khoảng 1010" mở rộng thêm (độ rộng tuỳ quy ước ghi ở `precision`).
- Luôn giữ `edtf` và `original_text` để hiển thị đúng như nguồn, và `source_calendar` để biết quy đổi từ đâu. Chuyển đổi sai lịch là lỗi dữ liệu phổ biến nên phải ghi lại.
- **Cần kiểm tra:** thư viện chuyển đổi lịch (đặc biệt âm lịch Việt Nam, và quy ước Julian/Gregorian trước 1582) và phạm vi của kiểu `integer` cho JDN với thời kỳ rất xa (dùng `bigint` nếu cần).
- Nếu muốn đơn giản hơn ở MVP: chỉ cần điền khoảng ở mức năm; cột `edtf`/`original_text` giữ nguyên thông tin gốc để nâng cấp sau.

### 5.5 Lớp miền `history`

```sql
CREATE SCHEMA history;

-- ===== Registry riêng của miền =====
CREATE TABLE history.polity_type     (code text PRIMARY KEY);   -- dynasty, kingdom, empire, republic, caliphate, state, colony, regime, ...
CREATE TABLE history.office_type (
  code         text PRIMARY KEY,                    -- emperor, king, lord, regent, chancellor, general, pharaoh, caliph, shogun, consul, president, ...
  category     text NOT NULL DEFAULT 'other',       -- sovereign | court | military | provincial | religious | other
  is_sovereign boolean NOT NULL DEFAULT false       -- true: chức vụ nguyên thủ (dùng dựng "chuỗi vua")
);
CREATE TABLE history.succession_mode (code text PRIMARY KEY);   -- hereditary, brother, adoptive, election, coup, conquest, appointment, ...
CREATE TABLE history.event_type      (code text PRIMARY KEY);   -- battle, treaty, reform, coronation, disaster, ...
CREATE TABLE history.event_role      (code text PRIMARY KEY);   -- commander, participant, victim, signatory, ...
CREATE TABLE history.place_type      (code text PRIMARY KEY);   -- capital, province, region, battlefield, ...

-- ===== Nhân vật =====
CREATE TABLE history.person (
  id   uuid PRIMARY KEY,
  kind text NOT NULL DEFAULT 'person' CHECK (kind = 'person'),
  sex  text NOT NULL DEFAULT 'unknown' CHECK (sex IN ('male','female','unknown')),
  historicity text NOT NULL DEFAULT 'historical'
              CHECK (historicity IN ('historical','semi_legendary','legendary')),
  summary text,
  FOREIGN KEY (id, kind) REFERENCES kg.node (id, kind)    -- đảm bảo nút này đúng loại 'person'
);

-- Ngày sinh/mất/sự kiện đời người: cho phép NHIỀU dòng khi nguồn mâu thuẫn
CREATE TABLE history.person_date (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id    uuid NOT NULL REFERENCES history.person(id),
  kind         text NOT NULL CHECK (kind IN ('birth','death','baptism','coronation','abdication','exile')),
  date_id      uuid NOT NULL REFERENCES kg.fuzzy_date(id),
  place_id     uuid,                                        -- history.place
  is_preferred boolean NOT NULL DEFAULT false               -- giá trị hiển thị mặc định
);
-- Mỗi (person, kind) có tối đa một dòng ưu tiên
CREATE UNIQUE INDEX ON history.person_date (person_id, kind) WHERE is_preferred;

-- ===== Hôn phối =====
CREATE TABLE history.union_ (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  a_id     uuid NOT NULL REFERENCES history.person(id),
  b_id     uuid NOT NULL REFERENCES history.person(id),
  kind     text NOT NULL DEFAULT 'marriage',        -- marriage | concubinage | betrothal | ...
  rank     text,                                    -- queen | consort | concubine | ...
  start_id uuid REFERENCES kg.fuzzy_date(id),
  end_id   uuid REFERENCES kg.fuzzy_date(id),
  end_reason text,                                  -- death | divorce | repudiation | ...
  state    text NOT NULL DEFAULT 'proposed',
  CHECK (a_id <> b_id)
);

-- ===== Cha mẹ – con (có ràng buộc chặt, nên là bảng riêng) =====
CREATE TABLE history.parentage (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES history.person(id),
  child_id  uuid NOT NULL REFERENCES history.person(id),
  kind      text NOT NULL CHECK (kind IN ('biological','adoptive','step','claimed','disputed')),
  union_id  uuid REFERENCES history.union_(id),
  state     text NOT NULL DEFAULT 'proposed',
  CHECK (parent_id <> child_id),
  UNIQUE (parent_id, child_id, kind)
);
CREATE INDEX ON history.parentage (child_id);
CREATE INDEX ON history.parentage (parent_id);

-- ===== Chính thể (triều đại, vương quốc, đế quốc, cộng hoà, ...) =====
CREATE TABLE history.polity (
  id          uuid PRIMARY KEY,
  kind        text NOT NULL DEFAULT 'polity' CHECK (kind = 'polity'),
  polity_type text NOT NULL REFERENCES history.polity_type(code),
  started_id  uuid REFERENCES kg.fuzzy_date(id),
  ended_id    uuid REFERENCES kg.fuzzy_date(id),
  summary     text,
  FOREIGN KEY (id, kind) REFERENCES kg.node (id, kind)
);
-- Quan hệ giữa các chính thể (nối tiếp, chia tách, song song, thôn tính, chư hầu...)
-- nằm trong kg.relation với relation_type có subject_kinds = object_kinds = {polity}.

-- ===== Nhiệm kỳ / chức vụ =====
CREATE TABLE history.tenure (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      uuid NOT NULL REFERENCES history.person(id),
  polity_id      uuid REFERENCES history.polity(id),
  office_type    text NOT NULL REFERENCES history.office_type(code),
  succession_mode text REFERENCES history.succession_mode(code),
  start_id       uuid REFERENCES kg.fuzzy_date(id),
  end_id         uuid REFERENCES kg.fuzzy_date(id),
  seq            integer                            -- thứ tự trong chính thể (nếu có)
);
-- Kế nhiệm giữa các nhiệm kỳ (kể cả khác chính thể) nằm ở history.tenure_succession (mục 5.11).
CREATE INDEX ON history.tenure (person_id);
CREATE INDEX ON history.tenure (polity_id, seq);

-- Niên hiệu thuộc về nhiệm kỳ (một vua có thể đổi nhiều niên hiệu)
CREATE TABLE history.tenure_era (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id uuid NOT NULL REFERENCES history.tenure(id),
  name      text NOT NULL,
  language  text REFERENCES kg.language(code),
  script    text,
  start_id  uuid REFERENCES kg.fuzzy_date(id),
  end_id    uuid REFERENCES kg.fuzzy_date(id)
);

-- ===== Địa danh (tên và phân cấp đổi theo thời gian) =====
CREATE TABLE history.place (
  id         uuid PRIMARY KEY,
  kind       text NOT NULL DEFAULT 'place' CHECK (kind = 'place'),
  place_type text NOT NULL REFERENCES history.place_type(code),
  location   geography(Point, 4326),                -- cần PostGIS (tuỳ chọn, có thể để NULL)
  FOREIGN KEY (id, kind) REFERENCES kg.node (id, kind)
);
CREATE TABLE history.place_parent (                  -- "thuộc về" thay đổi theo thời kỳ
  place_id  uuid NOT NULL REFERENCES history.place(id),
  parent_id uuid NOT NULL REFERENCES history.place(id),
  start_id  uuid REFERENCES kg.fuzzy_date(id),
  end_id    uuid REFERENCES kg.fuzzy_date(id),
  CHECK (place_id <> parent_id)
);
-- Tên cũ/mới của địa danh nằm ở kg.name với valid_from/valid_to.

-- ===== Sự kiện =====
CREATE TABLE history.event (
  id          uuid PRIMARY KEY,
  kind        text NOT NULL DEFAULT 'event' CHECK (kind = 'event'),
  event_type  text NOT NULL REFERENCES history.event_type(code),
  start_id    uuid REFERENCES kg.fuzzy_date(id),
  end_id      uuid REFERENCES kg.fuzzy_date(id),
  place_id    uuid REFERENCES history.place(id),
  summary     text,
  FOREIGN KEY (id, kind) REFERENCES kg.node (id, kind)
);
CREATE TABLE history.event_participant (
  event_id uuid NOT NULL REFERENCES history.event(id),
  node_id  uuid NOT NULL REFERENCES kg.node(id),    -- người, chính thể, ...
  role     text NOT NULL REFERENCES history.event_role(code),
  PRIMARY KEY (event_id, node_id, role)
);

-- ===== Quy tắc xưng hô: THEO NGÔN NGỮ/VĂN HOÁ (xem 5.7) =====
CREATE TABLE history.kinship_ruleset (
  code     text PRIMARY KEY,                        -- 'vi', 'en', 'zh', ...
  language text NOT NULL REFERENCES kg.language(code),
  note     text
);
CREATE TABLE history.kinship_rule (
  ruleset      text NOT NULL REFERENCES history.kinship_ruleset(code),
  up           integer NOT NULL,                    -- số bước từ A lên tổ tiên chung
  down         integer NOT NULL,                    -- số bước từ tổ tiên chung xuống B
  side         text NOT NULL DEFAULT 'any',         -- paternal | maternal | any (bên nội/ngoại)
  a_sex        text NOT NULL DEFAULT 'any',
  b_sex        text NOT NULL DEFAULT 'any',
  a_is_elder   text NOT NULL DEFAULT 'any',         -- true | false | any (vai vế/thứ bậc)
  label_a_to_b text NOT NULL,                       -- 'chú', 'cậu', 'uncle', ...
  label_b_to_a text NOT NULL,
  priority     integer NOT NULL DEFAULT 0,
  PRIMARY KEY (ruleset, up, down, side, a_sex, b_sex, a_is_elder)
);
```

**Ràng buộc đã nằm trong DB:**
- Khoá ngoại **`(id, kind)`** từ bảng miền sang `kg.node`: một nút kind `person` không thể bị gắn vào bảng `polity` (declarative, không cần trigger).
- Không tự làm cha của chính mình, không tự kết hôn với mình, mỗi `(person, kind)` chỉ có một ngày "ưu tiên".
- Mọi registry là khoá ngoại, nên giá trị lạ không chui vào được.

**Ràng buộc DB không biểu diễn được, phải làm ở tầng dịch vụ (và chạy kiểm tra định kỳ):**
- Không có **chu trình tổ tiên** (người không thể là tổ tiên của chính mình).
- `kg.relation`: `from`/`to` đúng `subject_kinds`/`object_kinds` của `relation_type` (dùng trigger hoặc kiểm tra ở service).
- `kg.citation` là liên kết đa hình nên **không có khoá ngoại**; có job kiểm tra "trích dẫn mồ côi" (trỏ tới dòng đã không tồn tại).
- Cha mẹ sinh trước con, nhiệm kỳ không chồng lấn độc quyền: chỉ **cảnh báo** khi chắc chắn mâu thuẫn, vì ngày mờ.

### 5.6 Xử lý nguồn mâu thuẫn mà không cần bảng "claim" tổng quát

Phiên bản đầu của tài liệu đề xuất một bảng `claim` kiểu EAV (khoá-giá trị). **Bỏ ý đó** vì nó đẩy mọi thứ vào JSON, mất khoá ngoại và rất khó truy vấn. Thay vào đó:
- **Cho phép nhiều dòng cho cùng một "khe" dữ kiện**, mỗi dòng có trích dẫn riêng: hai ngày sinh khác nhau → hai dòng `person_date`; một dòng `is_preferred`. Cha ruột hay cha nuôi theo hai nguồn → hai dòng `parentage` với `kind` khác nhau.
- `kg.citation` ghi nguồn và độ tin cậy cho từng dòng.
- UI hiển thị dòng ưu tiên, kèm "xem các nguồn khác" khi có mâu thuẫn.
- Cách này vẫn đủ cho mục 7.7 (chức năng chọn hai người): độ chắc chắn lấy từ `citation.confidence` của các dòng trên đường nối.

### 5.7 Mở rộng ra thế giới: cần làm gì

Đây là các kịch bản mở rộng và cách schema đáp ứng. Cột "Đổi schema?" là điểm mấu chốt.

| Muốn thêm | Cần làm | Đổi schema? |
|---|---|---|
| **Một quốc gia/thời kỳ mới** (Trung Quốc, Nhật, Ai Cập cổ đại…) | Thêm `collection` ('cn', 'jp'…), gán nút vào đó (một nút có thể thuộc nhiều bộ), nhập dữ liệu | **Không** |
| **Ngôn ngữ mới** | `INSERT` vào `kg.language`, thêm `kg.label`, thêm tên với `language`/`script` tương ứng | **Không** |
| **Hệ chữ mới** (Hán, Nôm, kana, Ả Rập…) | Cột `script` đã có, thêm giá trị | **Không** |
| **Lịch mới** (Hồi giáo, Nhật, Hebrew…) | `INSERT` vào `kg.calendar` + viết bộ chuyển đổi sang JDN ở tầng ứng dụng | **Không** (chỉ thêm code chuyển đổi) |
| **Loại chính thể** mới (caliphate, cộng hoà, thuộc địa) | `INSERT` vào `history.polity_type` | **Không** |
| **Chức vụ** mới (pharaoh, caliph, shogun, consul, tổng thống) | `INSERT` vào `history.office_type`; mô hình `tenure` dùng chung | **Không** |
| **Cách kế vị** mới (bầu cử, đảo chính, thôn tính) | `INSERT` vào `history.succession_mode` | **Không** |
| **Loại quan hệ** mới (chư hầu, thuộc địa của, ảnh hưởng…) | `INSERT` vào `kg.relation_type` (kèm nghịch đảo và loại nút cho phép) + `kg.label` | **Không** |
| **Tên người kiểu khác** (patronymic Nga, nasab Ả Rập, tên La Mã) | `INSERT` vào `kg.name_kind`; `kg.name` không giả định "họ + tên" | **Không** |
| **Xưng hô theo ngôn ngữ khác** (tiếng Anh `uncle/aunt` khác tiếng Việt) | Thêm `kinship_ruleset` mới ('en', 'zh') và quy tắc của nó; chức năng 7.7 chọn ruleset theo ngôn ngữ giao diện | **Không** (thêm dữ liệu) |
| **Hôn nhân/dòng dõi khác** (đa thê, tục lệ khác) | `union_.kind`, `parentage.kind` là giá trị mở rộng được | Có thể chỉ cần sửa `CHECK` thành registry |
| **Dữ liệu từ nguồn quốc tế** (Wikidata, GeoNames) | Lưu mã ngoài ở `kg.external_id`; nhập qua schema trung gian `staging_*` | **Không** (thêm schema staging) |
| **Địa lý** (bản đồ, lãnh thổ theo thời kỳ) | Dùng PostGIS cho `history.place.location`; thêm bảng `polity_territory` (chính thể – địa danh – giai đoạn) | **Thêm bảng**, không đổi bảng cũ |
| **Miền mới** (sinh vật/tiến hoá, nhân vật nghệ thuật…) | Tạo schema mới (ví dụ `bio`) với bảng riêng (`taxon`, `phylo_edge`…), thêm vào `kg.node_kind`, **dùng lại toàn bộ `kg`** (tên, nguồn, trích dẫn, bộ sưu tập, quan hệ mềm) và lớp `learning` | **Thêm schema**, không đụng `history` |

**Điểm quan trọng nhất:** vì mọi thứ "mở" nằm ở registry và bộ sưu tập, **chuyển từ Việt Nam sang thế giới chủ yếu là việc nhập dữ liệu**, không phải viết lại hệ thống. Phần code cần viết thêm chỉ nằm ở: bộ chuyển đổi lịch, bộ nhập dữ liệu, và bảng quy tắc xưng hô cho ngôn ngữ mới.

### 5.8 Quy mô: từ hàng trăm nút đến hàng trăm nghìn

MVP chỉ có khoảng 50–150 nhân vật, thế giới có thể lên tới hàng trăm nghìn hoặc hơn. Các điểm cần lường trước (chưa đo, đây là kế hoạch, không phải kết quả):

| Vấn đề | Giải pháp theo giai đoạn |
|---|---|
| Truy vấn tổ tiên/hậu duệ chậm khi cây sâu và rộng | Giai đoạn 1: recursive CTE. Khi đo thấy chậm: **bảng đóng (closure table)** `history.person_closure(ancestor_id, descendant_id, depth, via_kinds)`, API cập nhật trong cùng transaction với lúc ghi `parentage`, nên bảng không bao giờ lệch |
| Tìm kiếm tên | `pg_trgm` + `unaccent` + full-text (đã có chỉ mục ở `kg.name`), lọc theo `collection` và `kind` |
| Khoảng thời gian chồng lấn | Chỉ mục GiST trên `fuzzy_date.span` |
| Nhập hàng loạt | Schema `staging_*` + dry-run + `--apply` (như ETL ở repo teencare), rồi **khử trùng lặp** và gộp bằng `merged_into` |
| Hiển thị đồ thị lớn | API trả lân cận theo độ sâu, không trả toàn bộ; client tự cache |
| Phân quyền theo vùng | Gán vai trò theo `collection` (người chỉ được sửa bộ 'jp') |
| Có cần graph database? | **Chưa.** Chỉ cân nhắc khi đo thấy truy vấn nhiều bước đa dạng là nút thắt và closure table không đủ |

**Mốc quyết định:** thêm closure table khi truy vấn tổ tiên vượt ngưỡng chậm mà bạn chấp nhận được, đo bằng dữ liệu thật. Không làm sớm.

### 5.9 Quản lý thay đổi schema theo thời gian

- Dùng migration của Drizzle (`drizzle-kit`) như repo teencare, mỗi thay đổi một file đánh số.
- **Expand → migrate → contract:** thêm cột/bảng mới trước, chuyển dữ liệu, rồi mới bỏ cái cũ ở lần phát hành sau.
- **Không dùng Postgres `ENUM`** cho thứ có thể tăng (registry thay thế). Chỉ dùng `CHECK` cho tập hợp thật sự cố định (ví dụ `review_state`).
- Mọi bảng dữ kiện mới phải: có `state` hoặc `review_state` nếu cần duyệt, có trích dẫn qua `kg.citation`, ghi `kg.audit_log`.
- **Mã ổn định:** `uuid` không đổi; `slug` có thể đổi nhưng giữ bảng chuyển hướng để liên kết cũ không chết (cần bổ sung bảng `kg.slug_history` khi làm thật).
- Dữ liệu đã `approved` và đang dùng trong thẻ ôn không được xoá cứng; chỉ gộp (`merged_into`) hoặc đánh dấu `deleted_at`.

### 5.10 Đánh đổi và điều cần lưu ý

- **Mô hình lai phức tạp hơn bảng đơn.** Đổi lại là ràng buộc chặt ở chỗ cần và linh hoạt ở chỗ không cần. Nếu chỉ làm một quốc gia nhỏ, có thể đơn giản hoá, nhưng khi đã chọn mở rộng ra thế giới thì nền này đáng đầu tư.
- **`kg.citation` đa hình không có khoá ngoại** nên cần job kiểm tra. Đây là đánh đổi có chủ ý để khỏi phải làm một bảng nguồn cho mỗi loại dữ kiện.
- **JDN thêm một lớp chuyển đổi.** Đổi lại so sánh/sắp xếp/lọc thời gian chính xác và đơn giản ở mọi lịch.
- **Chưa kiểm chứng:** hiệu năng thực tế, cú pháp chính xác của các câu `CREATE` (ví dụ cột sinh `int4range`, khoá ngoại tham chiếu `(id, kind)`, chỉ mục `gin_trgm_ops` cần extension `pg_trgm`, kiểu `geography` cần PostGIS). Cần chạy thử trên Postgres thật trước khi tin.
- **Nội dung và quy tắc xưng hô theo từng nền văn hoá** vẫn cần nguồn tham chiếu riêng cho từng ruleset; mở rộng schema không giải quyết được phần nghiên cứu này.

### 5.11 Mở rộng: triều trước – triều sau, và nhân vật không phải vua

Hai yêu cầu này đều **được đáp ứng bởi thiết kế hiện tại**, nhưng khi đối chiếu mình phát hiện **3 chỗ cần chỉnh** (đã sửa ở 5.5 cho khớp, liệt kê ở cuối mục này).

#### A. Quan hệ xuyên triều đại (vua triều trước ↔ vua triều sau)

Có ba tầng thông tin khác nhau, lưu ở ba nơi:

| Tầng | Câu hỏi | Lưu ở đâu |
|---|---|---|
| **Giữa hai chính thể** | Triều A trước triều B? A bị B lật đổ? Hai triều song song? | `kg.relation` giữa hai nút `polity` (loại: `followed_by`, `split_from`, `merged_into`, `parallel_to`, `overthrown_by`, `conquered_by`, `vassal_of`) |
| **Giữa hai nhiệm kỳ** | Người này kế nhiệm người kia, theo cách nào? | Bảng nối `history.tenure_succession(from, to, mode)` — **xuyên chính thể được** |
| **Giữa hai con người** | A có lật đổ B? Có họ hàng/hôn nhân với nhau không? | `kg.relation` (`overthrew`…) và `parentage`/`union_` như bình thường |

Vì đây là ba tầng độc lập, app có thể trả lời đúng cả những tình huống nhạy cảm: hai vua khác triều **không có quan hệ huyết thống** nhưng B vẫn "kế nhiệm" A theo cách "lật đổ"; hoặc có quan hệ hôn nhân dẫn tới chuyển giao quyền lực. Cách chuyển giao nằm ở `succession_mode` (truyền ngôi, nhường ngôi, lật đổ, thôn tính…), và **mọi nhận định đều phải có nguồn** (`kg.citation`).

**Chỉnh 1: thay cột `predecessor_tenure_id` bằng bảng nối.** Một cột chỉ cho phép đúng một người tiền nhiệm, không đủ khi:
- chính thể **chia tách** (hai người cùng được coi là kế nhiệm của một người);
- hai triều **song song** cùng tuyên bố kế thừa;
- một chức vụ được **chia cho nhiều người**.

```sql
CREATE TABLE history.tenure_succession (
  from_tenure_id uuid NOT NULL REFERENCES history.tenure(id),   -- người tiền nhiệm
  to_tenure_id   uuid NOT NULL REFERENCES history.tenure(id),   -- người kế nhiệm
  mode           text NOT NULL REFERENCES history.succession_mode(code),
  state          text NOT NULL DEFAULT 'proposed',
  PRIMARY KEY (from_tenure_id, to_tenure_id),
  CHECK (from_tenure_id <> to_tenure_id)
);
```
Nguồn của việc kế nhiệm ghi bằng `kg.citation`. Không có cột "chính thống/không chính thống" ở đây, vì đó là **diễn giải của sử gia**; nếu cần thì lưu dưới dạng trích dẫn có nguồn, không hard-code.

**Chỉnh 2: phân biệt "chuỗi vua" với các chức vụ khác.** Thêm vào `history.office_type` hai cột `category` và `is_sovereign` (xem 5.5). Nhờ vậy:
- "Vua cuối của triều A" = nhiệm kỳ `is_sovereign` có `end` muộn nhất trong chính thể A.
- "Vua đầu của triều B" = nhiệm kỳ `is_sovereign` có `start` sớm nhất (hoặc `seq` nhỏ nhất) trong chính thể B.
- Không lẫn vua với tể tướng hay đại tướng khi dựng "chuỗi kế vị".

**Truy vấn mẫu (minh hoạ):**
```sql
-- Chuỗi kế nhiệm từ một nhiệm kỳ (xuyên triều đại), giới hạn độ sâu
WITH RECURSIVE chain(tenure_id, depth) AS (
  SELECT $1::uuid, 0
  UNION
  SELECT s.to_tenure_id, chain.depth + 1
  FROM history.tenure_succession s JOIN chain ON s.from_tenure_id = chain.tenure_id
  WHERE chain.depth < 200
)
SELECT * FROM chain;

-- Ai đang giữ ngôi tại thời điểm T (T là JDN) trong chính thể P?
SELECT t.person_id
FROM history.tenure t
JOIN history.office_type o ON o.code = t.office_type AND o.is_sovereign
JOIN kg.fuzzy_date s ON s.id = t.start_id
LEFT JOIN kg.fuzzy_date e ON e.id = t.end_id
WHERE t.polity_id = $1
  AND s.latest_jdn <= $2 AND (e.id IS NULL OR e.earliest_jdn >= $2);
```
(Ngày mờ nên "tại thời điểm T" có thể cho nhiều kết quả hoặc không chắc chắn; xem mục 6.)

**Cách chức năng "chọn hai người" xử lý (mở rộng mục 7.7):**
Khi A và B là vua thuộc hai triều khác nhau, kết quả gồm các quan hệ độc lập, ví dụ:
1. `Kế nhiệm` (nếu có dòng trong `tenure_succession`) + cách chuyển giao;
2. `Vua cuối triều trước – vua đầu triều sau` (nếu A là sovereign cuối của X, B là sovereign đầu của Y và X `followed_by` Y);
3. `Lật đổ` hoặc quan hệ chính trị khác (nếu có dòng `kg.relation` giữa hai người);
4. Họ hàng/hôn nhân (nếu có, suy ra như bình thường).
Nếu không có dòng nào, hiển thị đúng: "chưa có dữ liệu về quan hệ trực tiếp", kèm thông tin nền "thuộc hai triều đại liền kề".

#### B. Nhân vật không phải vua

`history.person` vốn là **một người bất kỳ**; "vua" chỉ là người có `tenure` ở chức vụ `is_sovereign`. Nên các nhân vật khác dùng được ngay. Thiết kế bổ sung:

**Chức vụ khác nhau, cùng một cơ chế.** Tể tướng, thái sư, đại tướng, tiết độ sứ, trạng nguyên, tăng thống… đều là `tenure` với `office_type` tương ứng, `category` (`sovereign` | `court` | `military` | `provincial` | `religious` | …). Kế nhiệm trong cùng một chức ("người tiền nhiệm làm thái sư") dùng chung bảng `tenure_succession`.

**Nghề nghiệp/vai trò không phải chức vụ chính thức** (nhà thơ, học giả, nhà sư, thủ lĩnh khởi nghĩa, thầy thuốc, thương nhân, nghệ nhân…):
```sql
CREATE TABLE history.occupation (
  code        text PRIMARY KEY,                       -- scholar, poet, monk, rebel_leader, physician, ...
  parent_code text REFERENCES history.occupation(code) -- phân cấp: scholar > poet
);
CREATE TABLE history.person_occupation (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES history.person(id),
  occupation text NOT NULL REFERENCES history.occupation(code),
  start_id  uuid REFERENCES kg.fuzzy_date(id),
  end_id    uuid REFERENCES kg.fuzzy_date(id)         -- một người có thể nhiều nghề, đổi theo thời gian
);
```

**Hai loại nút mới** (thêm vào `kg.node_kind`):
- **`group`:** dòng họ, gia tộc, quân đội, giáo phái, bộ tộc, phe phái triều đình, hội nhóm. Nhân vật là thành viên qua `kg.relation` (`member_of`).
- **`work`:** tác phẩm (sách, thơ, bia ký, chiếu chỉ, tranh) nối với tác giả qua `authored`.
```sql
INSERT INTO kg.node_kind (code) VALUES ('group'), ('work');

CREATE TABLE history.group_type (code text PRIMARY KEY);   -- clan, house, army, sect, tribe, guild, court_faction
CREATE TABLE history.group_ (
  id         uuid PRIMARY KEY,
  kind       text NOT NULL DEFAULT 'group' CHECK (kind = 'group'),
  group_type text NOT NULL REFERENCES history.group_type(code),
  summary    text,
  FOREIGN KEY (id, kind) REFERENCES kg.node (id, kind)
);
CREATE TABLE history.work_type (code text PRIMARY KEY);    -- book, poem, inscription, edict, painting
CREATE TABLE history.work (
  id         uuid PRIMARY KEY,
  kind       text NOT NULL DEFAULT 'work' CHECK (kind = 'work'),
  work_type  text NOT NULL REFERENCES history.work_type(code),
  written_id uuid REFERENCES kg.fuzzy_date(id),
  summary    text,
  FOREIGN KEY (id, kind) REFERENCES kg.node (id, kind)
);
```

**Chỉnh 3: thêm `historicity` cho nhân vật.** Nhiều nhân vật đầu lịch sử là bán huyền thoại hoặc huyền thoại; không được dạy như nhân vật có thật như nhau. Thêm vào `history.person`:
```sql
historicity text NOT NULL DEFAULT 'historical'
  CHECK (historicity IN ('historical','semi_legendary','legendary'))
```
Trang hiển thị và bộ sinh câu hỏi phải tôn trọng cột này (ví dụ không ra câu hỏi "năm sinh chính xác" cho nhân vật huyền thoại).

**Loại quan hệ mới cần seed vào `kg.relation_type`** (đều là `INSERT`, không đổi schema):

| Mã | Chủ thể → Đối tượng | Nghịch đảo | Ghi chú |
|---|---|---|---|
| `followed_by` | polity → polity | `preceded_by` | triều trước/sau |
| `split_from`, `merged_into` | polity → polity | `split_into`, `absorbed` | chia tách, sáp nhập |
| `parallel_to` | polity ↔ polity | (đối xứng) | hai triều cùng tồn tại |
| `overthrown_by` | polity/person → polity/person | `overthrew` | lật đổ, cần nguồn |
| `conquered_by`, `vassal_of` | polity → polity | `conquered`, `suzerain_of` | thôn tính, chư hầu |
| `founded` | person → polity/group | `founded_by` | người lập triều/lập dòng |
| `served` | person → polity | `employed` | **phục vụ chính thể, có giai đoạn** |
| `royal_house_of` | person → polity/group | `has_royal_member` | thuộc hoàng tộc |
| `served_under` | person → person | `commanded_by`/`led` | cấp dưới – cấp trên |
| `commanded` | person → person/group/event | `under_command_of` | chỉ huy quân/trận |
| `student_of` | person → person | `teacher_of` | thầy–trò |
| `patron_of` | person → person | `protege_of` | bảo trợ |
| `member_of` | person/group → group | `has_member` | thành viên |
| `authored` | person → work | `authored_by` | tác giả |
| `caused` | event → event | `result_of` | nhân quả |

Mỗi loại khai `subject_kinds`/`object_kinds`, nên DB (qua kiểm tra ở service) từ chối quan hệ vô nghĩa như "tác phẩm làm thầy của người".

**Người phục vụ nhiều triều:** quan hệ `served` có giai đoạn nên một người có thể có nhiều dòng (phục vụ triều A rồi triều B). Từ đó truy vấn được "những ai phục vụ cả hai triều" mà không cần cấu trúc đặc biệt.

**Gia phả của người thường:** `parentage` và `union_` chỉ cần `person`, nên **dùng được cho bất kỳ ai** (quan, dân, vợ lẽ, con nuôi…), không riêng hoàng tộc. Một dòng họ là một `group` (loại `clan`/`house`), các thành viên nối bằng `member_of`.

**Chức năng "chọn hai người" cho người không phải vua** (thứ tự ưu tiên, gộp kết quả):
1. Họ hàng/hôn nhân (như 7.7).
2. Quan hệ trực tiếp: thầy–trò, cấp trên–cấp dưới, chỉ huy, bảo trợ, đồng minh, đối thủ.
3. **Cùng chuỗi chức vụ:** người kế nhiệm cùng chức (ví dụ tiền nhiệm/kế nhiệm thái sư).
4. **Cùng tham gia một sự kiện** (qua `event_participant`, kèm vai trò).
5. **Cùng phục vụ một chính thể / cùng một nhóm** (quan hệ yếu, ghi rõ là yếu).
6. Đường nối gián tiếp (BFS) nếu không có gì ở trên.

#### C. Tác động tới học tập và giao diện
- Trang **chính thể** có hai khu: *chuỗi vua* (từ `is_sovereign`) và *triều thần/tướng lĩnh/nhân vật nổi bật*.
- **Dòng thời gian** phân biệt chuỗi vua với các chức vụ khác, và vẽ được hai triều song song thay vì ép thành một đường thẳng.
- Dạng câu hỏi mới sinh được từ đồ thị: "Ai là vua cuối của triều X?", "Ai lập triều tiếp theo?", "Những ai phục vụ cả hai triều?", "Ai là thầy của Y?", "Tác phẩm Z do ai viết?".
- Câu hỏi và nhận định chính trị nhạy cảm (lật đổ, chính thống) chỉ sinh khi dữ kiện đã duyệt, có nguồn, độ tin cậy đủ cao.

#### D. Tóm tắt thay đổi so với bản trước
1. Bỏ cột `tenure.predecessor_tenure_id` → bảng nối `history.tenure_succession` (cho chia tách, song song, xuyên triều đại).
2. `history.office_type` thêm `category` và `is_sovereign`.
3. `history.person` thêm `historicity`.
4. Thêm `history.occupation`, `person_occupation`, `group_type`, `group_`, `work_type`, `work`; thêm `group`, `work` vào `kg.node_kind`.
5. Seed thêm các `relation_type` ở bảng trên.
6. Mục 7.7 (chức năng chọn hai người) mở rộng thứ tự xử lý cho quan hệ xuyên triều đại và nhân vật không phải vua (xem 7.7.2).

**Lưu ý:** mô hình đã sẵn sàng cho cả hai, nhưng **công việc lớn nằm ở nội dung**: mỗi quan hệ chính trị (lật đổ, kế nhiệm khác triều, phục vụ) cần nguồn tin cậy và có thể gây tranh luận. Các câu SQL trên cũng chưa được chạy thử.

---

## 6. Thời gian mờ

- **Định dạng:** dùng EDTF (Extended Date/Time Format của Library of Congress), mở rộng ISO 8601 để biểu thị ngày không chắc chắn (`?`), xấp xỉ (`~`), cả hai (`%`) và khoảng. Ví dụ `1010~` nghĩa là "khoảng năm 1010", đã xác nhận qua tài liệu EDTF.
- **Lưu nhiều dạng:** chuỗi EDTF gốc và `original_text` (để hiển thị đúng ý nguồn), cùng khoảng `earliest_jdn`/`latest_jdn` suy ra (để sắp xếp, lọc, so sánh). JDN (Julian Day Number) trung lập về lịch, chi tiết ở mục 5.4.
- **So sánh khi mờ:** "A sinh trước B" có ba kết quả: chắc chắn đúng, chắc chắn sai, **không xác định** (khoảng chồng lấn). UI phải thể hiện được trường hợp thứ ba.
- **Lịch:** nguồn sử ghi theo âm lịch, niên hiệu. Lưu "năm theo niên hiệu" (ví dụ năm thứ N của niên hiệu X) cùng năm dương quy đổi, và ghi rõ nguồn quy đổi. **Cần kiểm tra:** bảng quy đổi niên hiệu ↔ năm dương đáng tin cậy.
- **Không dùng `timestamptz`** cho ngày lịch sử vì không có múi giờ và nhiều ngày nằm ngoài khoảng phổ biến. Dùng `kg.fuzzy_date` (mục 5.3, 5.4).

---

## 7. Truy vấn và thuật toán lõi

### 7.1 Tổ tiên / hậu duệ
Recursive CTE trên `parentage`:
```sql
WITH RECURSIVE anc(id, depth) AS (
  SELECT parent_id, 1 FROM history.parentage
  WHERE child_id = $1 AND kind IN ('biological','adoptive')
  UNION
  SELECT p.parent_id, anc.depth + 1
  FROM history.parentage p JOIN anc ON p.child_id = anc.id
  WHERE anc.depth < 30
)
SELECT DISTINCT id, MIN(depth) FROM anc GROUP BY id;
```
(`UNION` loại trùng; giới hạn độ sâu chống vòng lặp nếu dữ liệu sai.)

### 7.2 Tổ tiên chung gần nhất (LCA)
Với hai người A, B: tính tập tổ tiên của từng người kèm độ sâu, giao hai tập, chọn nút có tổng độ sâu nhỏ nhất. Vì đồ thị là DAG (không phải cây), có thể có **nhiều LCA** và phải trả về tất cả.

### 7.3 Đường quan hệ ngắn nhất giữa hai nhân vật bất kỳ
Dựng đồ thị vô hướng từ mọi loại cạnh (cha-con, hôn phối, kế vị, thầy-trò…), chạy BFS. Kết quả là chuỗi giải thích được: "A —(con của)→ B —(kế vị bởi)→ C". Với đồ thị cá nhân vài nghìn nút, BFS trong bộ nhớ ở tầng service là đủ, không cần graph database.

### 7.4 Máy tính xưng hô (tính năng đặc trưng)
- Đầu vào: hai người cùng dòng họ.
- Bước 1: tìm LCA và độ lệch thế hệ (A cách LCA bao nhiêu đời, B cách bao nhiêu đời).
- Bước 2: xác định bên nội/ngoại (đi qua cha hay mẹ), vai vế (anh/em so với cha mẹ), giới tính, tuổi tương đối.
- Bước 3: tra **bảng quy tắc xưng hô cấu hình được** (dữ liệu, không hard-code), trả về cách gọi và giải thích đường đi.
- Quy tắc xưng hô khác nhau theo vùng và thời kỳ, nên đặt ở bảng cấu hình; với nhân vật lịch sử cần thêm quy tắc riêng cho hoàng tộc (hoàng thái hậu, hoàng huynh…). **Cần kiểm tra:** nguồn tham chiếu cho bảng xưng hô.

### 7.5 Dòng thời gian và "cùng thời"
Truy vấn khoảng chồng lấn trên `earliest/latest` (có thể dùng kiểu `daterange` + chỉ mục GiST). Trả lời "ai sống cùng thời với X", "triều đại nào song song với Y".

### 7.6 Kiểm tra tính nhất quán (API chạy khi ghi và khi admin mở báo cáo, không có job định kỳ)
- Không chu trình tổ tiên.
- Cha/mẹ phải sinh trước con (so sánh có xét độ mờ, chỉ cảnh báo khi chắc chắn mâu thuẫn).
- Một người không giữ hai nhiệm kỳ độc quyền chồng nhau.
- Nhiệm kỳ nằm trong khoảng tồn tại của triều đại (cảnh báo, không chặn).
- Báo cáo "dữ kiện thiếu nguồn".

### 7.7 Chức năng cốt lõi: chọn hai người → trả về mối quan hệ

Đây là tính năng trung tâm của app. Đặc tả riêng để không bị lẫn với các thuật toán lẻ ở trên.

**Ví dụ mong muốn:** chọn vua cha và vua con → app trả lời "A là **cha** của B; B là **con** của A; B **kế vị** A", kèm nguồn và độ chắc chắn.

#### 7.7.1 Đầu vào và đầu ra

- **Đầu vào:** `a`, `b` (hai nhân vật), tuỳ chọn `includeDisputed` (có tính quan hệ đang tranh cãi không), `maxDepth`.
- **Đầu ra:** *danh sách* các quan hệ, không phải một quan hệ duy nhất, vì hai người có thể có nhiều quan hệ cùng lúc (cha-con **và** người kế vị; anh em họ **và** anh rể…).

```json
{
  "a": "slug-a", "b": "slug-b",
  "relations": [
    {
      "kind": "parent_child",
      "a_to_b": "cha",            "b_to_a": "con",
      "headline": "A là cha của B",
      "certainty": 0.95,          "disputed": false,
      "path": [{ "from": "A", "edge": "parentage:biological", "to": "B" }],
      "sources": ["source-id-1"]
    },
    {
      "kind": "succession",
      "a_to_b": "tiền nhiệm",     "b_to_a": "người kế vị",
      "headline": "B kế vị A (cùng triều đại)",
      "certainty": 0.9
    }
  ],
  "primary": 0,
  "note": null
}
```
`primary` là quan hệ gần nhất/cụ thể nhất để hiển thị chính, các quan hệ còn lại hiển thị phía dưới.

#### 7.7.2 Quy trình xác định quan hệ (theo thứ tự, gộp kết quả)

1. **Cùng một người** → báo lỗi nhập.
2. **Cạnh trực tiếp** giữa A và B (tra bảng, rẻ nhất):
   - `parentage` (ruột, nuôi, kế, được cho là, tranh cãi) → cha/mẹ – con.
   - `union_` → vợ/chồng, kèm thứ bậc (hoàng hậu, phi…).
   - `person_link` → kế vị, nhiếp chính, thầy–trò, đồng minh, đối thủ, phục vụ.
   - **Kế vị:** lấy từ `history.tenure_succession` (kể cả **khác triều đại**, kèm cách chuyển giao: truyền ngôi, nhường ngôi, lật đổ…). Nếu không có dòng khai báo, có thể suy ra "kế vị" khi hai nhiệm kỳ cùng chính thể, cùng chức `is_sovereign` và `seq` liền kề, đánh dấu là **suy luận**.
   - **Xuyên triều đại:** nếu A là sovereign cuối của chính thể X, B là sovereign đầu của chính thể Y và X `followed_by` Y → "vua cuối triều trước – vua đầu triều sau". Quan hệ chính trị như `overthrew` chỉ hiện khi có dữ kiện có nguồn.
   - **Nhân vật không phải vua:** thầy–trò, cấp trên–cấp dưới, chỉ huy, bảo trợ, cùng chuỗi chức vụ, cùng sự kiện, cùng phục vụ một chính thể (xem 5.11).
3. **Họ hàng huyết thống (suy luận):** dùng LCA (mục 7.2).
   Gọi `i` là số bước đi lên từ A tới tổ tiên chung, `j` là số bước đi xuống tới B.

   | (i, j) | Quan hệ của A với B |
   |---|---|
   | (0, 1) | A là cha/mẹ của B |
   | (0, 2) | A là ông/bà của B |
   | (0, n≥3) | A là tổ tiên đời thứ n (cụ, kỵ…) của B |
   | (1, 0) / (2, 0) / (n, 0) | ngược lại: A là con / cháu / chắt… của B |
   | (1, 1) | anh chị em (ruột, cùng cha khác mẹ, cùng mẹ khác cha) |
   | (1, 2) | A là bác/chú/cô (hoặc cậu/dì) của B; B là cháu |
   | (2, 1) | A là cháu của B (B là bác/chú/cô/cậu/dì của A) |
   | (2, 2) | anh chị em họ (đời đầu) |
   | (i, j) khác | họ hàng xa: "anh em họ đời k, lệch m thế hệ" (k = min(i,j) − 1, m = |i−j|) |

   Bảng này chỉ phân loại cấu trúc. **Tên gọi cuối cùng** (bác hay chú, cậu hay dì, anh hay em) lấy từ bảng quy tắc xưng hô cấu hình được (mục 7.4), phụ thuộc: bên nội/ngoại, giới tính của người ở giữa, và thứ bậc anh/em của hai người trong cùng đời.
4. **Họ hàng qua hôn nhân:** đi qua một `union_` (ví dụ bố vợ, anh rể, con dâu). Chỉ tính một cạnh hôn phối trên đường đi để tránh trả về quan hệ vô nghĩa.
5. **Không có quan hệ trực tiếp hay họ hàng:** chạy BFS (mục 7.3) trên mọi loại cạnh để tìm **đường nối gián tiếp** và hiển thị rõ là "gián tiếp", kèm số bước. Nếu không có đường, nói đúng sự thật:
   "Chưa có dữ liệu về quan hệ giữa hai người", cộng thêm thông tin yếu như "cùng triều đại", "sống cùng thời".
   **Lưu ý ngôn ngữ:** "không tìm thấy" nghĩa là *dữ liệu chưa có*, không phải "hai người không liên quan".

#### 7.7.3 Hướng của quan hệ (quan trọng)

Quan hệ **có hướng**, nhãn hai phía khác nhau: A→B là "cha", B→A là "con". Kết quả luôn trả cả hai hướng, và headline đặt theo thứ tự người dùng đã chọn (A trước, B sau). Có nút **đổi chỗ (swap)** để xem từ phía kia.

Nhãn có thể thêm **ngữ cảnh chức vụ** khi cả hai là vua trong cùng triều đại: "vua cha – vua con", "huynh – đệ (kế vị theo anh em)".

#### 7.7.4 Độ chắc chắn và tranh cãi

- Độ chắc chắn của một quan hệ suy ra = **giá trị nhỏ nhất** trong các cạnh trên đường đi (một mắt xích yếu làm yếu cả chuỗi), không nhân lên vô nghĩa.
- Cạnh `claimed`/`disputed` chỉ được tính khi `includeDisputed` bật, và kết quả gắn nhãn "còn tranh cãi theo nguồn X".
- Nếu hai nguồn mâu thuẫn (một nguồn nói con ruột, nguồn khác nói con nuôi), hiển thị **cả hai** với nguồn tương ứng, không tự chọn.
- Dữ kiện ngày mờ không phá quan hệ, nhưng ảnh hưởng nhãn thứ bậc (anh hay em): nếu không biết ai sinh trước thì dùng nhãn trung tính "anh/chị/em".

#### 7.7.5 Các trường hợp khó phải xử lý

| Trường hợp | Cách xử lý |
|---|---|
| Hai vua **khác triều đại** | Trả về các quan hệ độc lập: kế nhiệm (kèm cách chuyển giao), vua cuối/đầu hai triều liền kề, lật đổ (nếu có nguồn), họ hàng/hôn nhân (nếu có); không suy ra "lật đổ" hay "chính thống" khi không có dữ kiện |
| Hai **triều song song** hoặc chính thể chia tách | Không ép thành đường thẳng; hiển thị `parallel_to`/`split_from`, mỗi nhánh có chuỗi kế nhiệm riêng |
| Hai người **không phải vua** | Dùng thứ tự ưu tiên ở 5.11: họ hàng → quan hệ trực tiếp → cùng chuỗi chức vụ → cùng sự kiện → cùng chính thể (yếu) → đường nối gián tiếp |
| Nhân vật **bán huyền thoại/huyền thoại** | Hiển thị cờ `historicity`; không sinh câu hỏi dữ kiện chính xác |
| Hai người có **nhiều quan hệ cùng lúc** (hôn nhân cận huyết trong hoàng tộc, vừa cha-con vừa kế vị) | Trả về mọi quan hệ tìm được, xếp theo mức độ gần/cụ thể |
| Nhiều tổ tiên chung (nhiều LCA) | Trả về quan hệ ứng với từng LCA, gộp trùng |
| Anh em **cùng cha khác mẹ** hoặc ngược lại | Phân biệt trong nhãn ("anh em cùng cha khác mẹ") |
| Con nuôi, con riêng, con thừa tự | Hiển thị loại quan hệ, nhãn khác nhau theo `kind` |
| **Tái hôn:** người vừa là bác vừa là anh rể | Liệt kê cả hai |
| Thiếu giới tính hoặc thứ bậc | Dùng nhãn trung tính, kèm ghi chú vì sao |
| Cha mẹ chưa rõ nhưng có khai báo "anh em" trực tiếp | Dùng quan hệ `sibling_of` khai báo trực tiếp, đánh dấu là không suy luận được |
| Dữ liệu sai gây **chu trình** | Dừng ở `maxDepth`, báo lỗi dữ liệu thay vì lặp vô hạn |
| Tên khác nhau của cùng một người | Chọn người theo ID/slug; ô tìm kiếm khớp mọi tên (miếu hiệu, thụy hiệu, tên húy…) |

#### 7.7.6 API và hiệu năng

- `GET /api/relations?a={slug}&b={slug}&includeDisputed=0` → JSON như ví dụ trên.
- Tập tổ tiên của hai người trong hoàng tộc nhỏ (vài chục đến vài trăm nút), nên tính tại chỗ bằng CTE hoặc trong bộ nhớ là đủ nhanh. Mục tiêu đặt ra: dưới vài trăm ms với dữ liệu MVP (đây là mục tiêu thiết kế, chưa đo).
- Có thể cache kết quả theo cặp `(a, b, includeDisputed)` và vô hiệu hoá khi dữ liệu của hai người hoặc tổ tiên của họ thay đổi. Chỉ làm khi đo thấy chậm.

#### 7.7.7 Giao diện

1. Hai ô chọn người có **tìm kiếm không dấu** và khớp mọi tên; nút **đổi chỗ**.
2. Kết quả:
   - **Câu kết luận lớn**: "Lý Thái Tông là *cha* của Lý Thánh Tông" (chỉ là ví dụ định dạng; nội dung thật phải lấy từ dữ liệu đã duyệt).
   - Hai nhãn hai hướng.
   - **Đồ thị mini** làm nổi bật đường nối, bấm vào từng mắt xích để xem nguồn.
   - Huy hiệu độ chắc chắn và "còn tranh cãi" nếu có.
   - Mục "Các quan hệ khác giữa hai người" nếu có nhiều.
   - Nếu không có: thông báo "chưa có dữ liệu" kèm gợi ý "cùng triều đại / sống cùng thời".
3. Nút **"Học quan hệ này"**: thêm quan hệ vào bộ thẻ ôn tập.

#### 7.7.7b Kiểm thử (golden tests)

Viết bộ test với dữ liệu mẫu nhỏ, mỗi ca có kết quả mong đợi:
- cha–con ruột, mẹ–con, ông–cháu, cụ–chắt;
- anh em ruột, cùng cha khác mẹ;
- bác/chú/cô – cháu, anh em họ;
- vợ–chồng nhiều vợ, bố vợ – rể;
- con nuôi, quan hệ tranh cãi (bật/tắt `includeDisputed`);
- hai người có hai quan hệ cùng lúc;
- hai vua khác triều (có/không có dòng kế nhiệm, có/không có `overthrew`), hai triều song song;
- người không phải vua: thầy–trò, cấp trên–cấp dưới, cùng chuỗi chức vụ, cùng sự kiện, người phục vụ hai triều;
- nhân vật huyền thoại không sinh câu hỏi dữ kiện chính xác;
- không có quan hệ → thông báo đúng;
- dữ liệu có chu trình → báo lỗi, không treo.
Đây là phần có giá trị lớn nhất để tránh dạy sai, nên viết **trước** khi viết thuật toán.

---

## 8. Học tập

### 8.1 Loại câu hỏi (sinh tự động từ đồ thị)
1. "X là cha/con/kế vị của ai?"
2. "Nối hai nhân vật" (chọn mối quan hệ đúng).
3. "Sắp xếp theo thứ tự thời gian" (3–5 nhân vật/sự kiện).
4. "Triều đại nào đứng sau triều đại X?"
5. "Ai không thuộc nhóm này?" (nhận biết nhân vật khác triều đại).
6. "Giải thích đường quan hệ" (điền chỗ trống trong chuỗi).
- Câu hỏi sinh từ **mẫu + đồ thị** ngay trong API khi phục vụ phiên ôn tập (không có job sinh trước), kèm đáp án nhiễu hợp lý (nhân vật cùng triều đại hoặc cùng thời).
- Mỗi câu trỏ về **dữ kiện nguồn** của đáp án, khi trả lời sai người học bấm vào xem nguồn.
- **Không sinh câu hỏi từ dữ kiện độ tin cậy thấp hoặc đang tranh cãi**, hoặc phải đánh dấu rõ.

### 8.2 Ôn tập ngắt quãng
Dùng thuật toán lập lịch có sẵn (SM-2 hoặc FSRS) cho từng "thẻ kiến thức" (một dữ kiện hoặc một mối quan hệ). **Cần kiểm tra:** thư viện FSRS bằng TypeScript còn được bảo trì và giấy phép.

### 8.3 Lộ trình (curriculum)
Dùng cùng ý tưởng cây mở khoá của academy trong repo teencare: nhóm "Thời Lý", "Thời Trần"… là các container, mỗi nhân vật chính là một unit; unlock tuần tự hoặc tự do tuỳ chế độ. Thuật toán `computeUnlockMap` có thể tham khảo thiết kế đó (hàm thuần, không đụng DB).

### 8.4 Tiến độ
Theo từng thẻ và từng nhánh: "đã nắm 60% hoàng tộc Trần". Bản đồ nhiệt trên đồ thị thể hiện chỗ mạnh/yếu.

---

## 9. Giao diện và trải nghiệm

### 9.1 Màn hình chính
1. **Khám phá đồ thị:** chọn một nhân vật/triều đại làm tâm, hiển thị lân cận (độ sâu 1–2), bấm để mở rộng. Không vẽ toàn bộ đồ thị.
2. **Cây phả hệ hoàng tộc:** cây theo đời, lọc theo triều đại, thu gọn nhánh, đánh dấu vua/hoàng hậu.
3. **Dòng thời gian:** các triều đại là thanh ngang, nhân vật là điểm/đoạn; vùng mờ thể hiện độ không chắc chắn.
4. **Trang nhân vật:** tên và các tên khác, tóm tắt, quan hệ, nhiệm kỳ, sự kiện, **bảng nguồn** và độ tin cậy của từng dữ kiện.
5. **"Tìm mối liên hệ" (chức năng cốt lõi):** chọn hai nhân vật, trả về quan hệ (cha–con, anh em, kế vị, họ hàng…), nhãn hai hướng, đường nối, nguồn và độ chắc chắn. Đặc tả đầy đủ ở mục 7.7.
6. **Học và ôn tập:** thẻ hàng ngày, lộ trình.
7. **Quản trị nội dung:** nhập/sửa/duyệt dữ kiện (chỉ bạn dùng ở giai đoạn đầu).

### 9.2 Kỹ thuật hiển thị
- Lớp hiển thị tách thành thư viện riêng (xem mục 10) để sau dùng lại cho miền khác.
- Bố trí cây: thuật toán dạng cây phân tầng cho phả hệ; bố trí lực (force-directed) cho "tìm mối liên hệ". Cần kiểm tra thư viện cụ thể (ví dụ dagre/ELK/d3) về hiệu năng, giấy phép và khả năng xử lý đồ thị có nhiều cha mẹ (không phải cây thuần).
- Tải theo nhu cầu: API trả lân cận theo độ sâu, phân trang; client tự cache.
- Khả năng tiếp cận: thao tác được bằng bàn phím, có chế độ danh sách (không chỉ đồ thị), tương phản đủ.

---

## 10. Kiến trúc

### 10.1 Monorepo (theo cấu trúc quen thuộc của repo teencare)
```
apps/
  web/            Next.js: khám phá, học, quản trị
  api/            REST (Hono/Express): đọc đồ thị, học tập, quản trị
  scripts/        script chạy tay, hiện chỉ có nhập Wikidata (`pnpm import:wikidata [--apply]`) — không cron, không hàng đợi
  mobile/         (giai đoạn sau) ôn tập offline
packages/
  core/           schema Drizzle, services, kiểu dùng chung
  graph-view/     thư viện hiển thị (không biết miền)
  learning/       lập lịch ôn, tiến độ, mở khoá (không biết miền)
  provenance/     nguồn + trích dẫn + độ tin cậy (kg.source, kg.citation)
  domain-history/ quy tắc miền: tên, xưng hô, kiểm tra nhất quán
docs/             tài liệu thiết kế, từ điển dữ liệu
```
Lý do tách `learning`, `graph-view`, `provenance` thành package chung nhưng **chỉ trích ra sau khi dùng thật** (xem mục 13): tránh tổng quát hoá sớm.

### 10.2 Công nghệ đề xuất
| Phần | Lựa chọn | Lý do |
|---|---|---|
| Ngôn ngữ | TypeScript | Đã quen, dùng chung kiểu giữa web/api |
| DB | PostgreSQL (schema `history`) | Đồ thị cỡ cá nhân đủ bằng CTE, hỗ trợ `daterange`, GiST, full-text |
| ORM | Drizzle | Đã quen, migration qua drizzle-kit |
| API | Hono hoặc Express + zod | Validation, lỗi thống nhất kiểu `ServiceError` |
| Web | Next.js, Tailwind, shadcn/ui | Đã quen |
| Tìm kiếm | Postgres full-text + `unaccent` + `pg_trgm` | Tìm tên không dấu, tên gần đúng |
| Việc nền | Không có. Nghiệp vụ chạy trong API; chỉ nhập Wikidata là script chạy tay (`apps/scripts`) | Quy mô nhỏ, không cần hàng đợi/cron; thêm khi có số liệu chứng minh cần |
| Lưu ảnh | Cloudinary hoặc object storage | Ảnh tư liệu |
| Deploy | Một VPS hoặc Railway, Docker | Đơn giản |

Chưa cần: graph database, microservices, Kubernetes. Mình khuyến nghị thêm khi có số liệu chứng minh cần.

### 10.3 Tìm kiếm tên tiếng Việt
- Cột chuẩn hoá bỏ dấu cho từng tên, chỉ mục `pg_trgm` (gần đúng) và full-text.
- Xử lý biến thể (Trần Thái Tông / Trần Cảnh), alias và tên Hán-Việt.

---

## 11. Nguồn dữ liệu và quy trình nội dung

### 11.1 Nguồn
- **Dữ liệu mở có cấu trúc:** Wikidata có thuộc tính quan hệ gia đình. Đã xác minh `P22` là "cha" (male parent). Các thuộc tính khác như mẹ, vợ/chồng, con, anh/chị/em, họ/gia tộc, chức vụ (`P39`), thời gian bắt đầu/kết thúc (`P580`/`P582`), "kế vị/được kế vị bởi" (`P155`/`P156`) mình **chưa xác minh từng mã**, cần kiểm tra trên trang thuộc tính trước khi dùng. Cần kiểm tra thêm: mức độ đầy đủ và độ chính xác dữ liệu nhân vật Việt Nam trong Wikidata, và giấy phép (thường là CC0, cần xác nhận).
- **Sách sử và nghiên cứu:** biên soạn tay, ghi rõ nguồn từng dữ kiện. Dùng nội dung nào cũng phải tôn trọng bản quyền (chỉ ghi dữ kiện và trích dẫn, không sao chép văn bản dài).
- **Tư liệu gốc (bia ký, chính sử):** thường là nguồn đáng tin nhất nhưng khó tiếp cận. Có thể bổ sung dần.

### 11.2 Quy trình nhập
1. **Nhập tay có cấu trúc** cho lõi (khoảng vài trăm nhân vật chính) qua trang quản trị, vì chất lượng quan trọng hơn số lượng.
2. **Nhập hàng loạt từ Wikidata** (script `import-wikidata`, chạy tay): dry-run mặc định, hiển thị diff, `--apply` mới ghi (giống quy ước ETL của repo teencare). Dữ liệu nhập vào trạng thái `proposed`, chưa hiển thị cho đến khi duyệt.
3. **Khử trùng lặp:** cùng một người có thể có nhiều bản ghi (tên khác nhau). Cần bước ghép (match) có điểm tin cậy và duyệt tay.
4. **Duyệt:** `draft → proposed → approved/rejected`. Chỉ `approved` mới đưa vào học tập.
5. **Kiểm tra nhất quán** (mục 7.6): API chạy mỗi lần admin ghi và khi mở báo cáo; sau khi chạy script nhập, mở báo cáo để kiểm tra.

### 11.3 Chất lượng
- Mỗi nhân vật/triều đại có ít nhất một nguồn trước khi duyệt.
- Có trang "dữ kiện đang tranh cãi" tổng hợp các chỗ nguồn mâu thuẫn.
- Ghi rõ phần nào là suy luận (ví dụ quan hệ suy ra), khác với phần ghi trực tiếp trong nguồn.

---

## 12. Rủi ro và cách giảm

| Rủi ro | Cách giảm |
|---|---|
| Dữ liệu sai làm app dạy sai | Nguồn bắt buộc, trạng thái duyệt, hiển thị độ tin cậy, không sinh câu hỏi từ dữ kiện yếu |
| Phình to phạm vi (cả lịch sử Việt Nam) | MVP chỉ một thời kỳ nhỏ (xem 14) |
| Mô hình dữ liệu sai từ đầu | Thử với dữ liệu thật của một dòng họ trước khi chốt; viết test cho các trường hợp khó (nhiều vợ, con nuôi, kế vị tranh chấp) |
| Hiển thị chậm khi đồ thị lớn | Lấy lân cận theo độ sâu, không vẽ toàn bộ; đo hiệu năng sớm |
| Tranh cãi diễn giải lịch sử | Trình bày nhiều nguồn, không áp đặt; tránh lời bình chủ quan trong dữ kiện |
| Bản quyền nội dung | Chỉ lưu dữ kiện và trích dẫn ngắn, ghi nguồn, kiểm tra giấy phép dữ liệu mở |
| Tổng quát hoá sớm | Làm miền lịch sử xong mới trích package chung |
| Sai thời gian do quy đổi lịch | Lưu cả dạng gốc theo nguồn và dạng quy đổi, kèm ghi chú |

---

## 13. Hướng mở rộng (sau khi MVP dùng được)

0. **Mở rộng ra thế giới:** chủ yếu là nhập dữ liệu và thêm danh mục (bộ sưu tập, ngôn ngữ, lịch, loại chức vụ/chính thể/quan hệ, ruleset xưng hô). Bảng chi tiết "muốn thêm gì thì làm gì" ở mục 5.7, kế hoạch quy mô ở mục 5.8.
1. **Miền sinh vật/tiến hoá:** thêm schema `bio` và `domain-bio` (dùng lại toàn bộ lớp `kg`) (phân loại học và phát sinh chủng loại) dùng lại `learning`, `graph-view`, `provenance`. Chỉ trích ra package chung khi bắt đầu miền thứ hai, và khi đó mới biết phần nào thật sự chung.
2. **App di động** để ôn tập offline.
3. **Bản đồ:** địa danh và biến động lãnh thổ theo thời gian (PostGIS + MapLibre).
4. **Sự kiện và nhân quả:** chuỗi nguyên nhân – kết quả giữa các sự kiện.
5. **OCR tư liệu cũ:** trích nhân vật/quan hệ từ ảnh sách, vào hàng đợi duyệt (không tự ghi).
6. **Chế độ cộng tác có kiểm duyệt** nếu muốn chia sẻ cho người khác.
7. **Chế độ riêng:** nhập phả hệ gia đình bạn trên cùng bộ máy (khác miền, cùng lõi).

---

## 14. MVP và lộ trình

### 14.1 Phạm vi MVP (khoảng 6–8 tuần, làm xong mới thêm)
- **Một thời kỳ nhỏ:** chọn một triều đại có hoàng tộc rõ ràng, khoảng **50–150 nhân vật**.
- Lớp `kg` + `history` ở mục 5 (có thể bỏ qua `event`, `place_parent`, `kinship_ruleset` nhiều ngôn ngữ ở MVP, chỉ cần ruleset `vi`; nhưng **giữ nguyên cấu trúc registry/collection/citation** để sau mở rộng không phải sửa).
- Trang quản trị nhập tay + duyệt.
- Khám phá đồ thị (lân cận), cây phả hệ, trang nhân vật có nguồn.
- **"Chọn hai người → mối quan hệ"** (mục 7.7): trước hết cha–con, mẹ–con, vợ–chồng, anh em, ông–cháu, kế vị, bác/chú–cháu, anh em họ; sau đó mới thêm họ hàng qua hôn nhân và đường nối gián tiếp.
- **20–40 câu hỏi** sinh từ đồ thị + ôn tập ngắt quãng cơ bản.

### 14.2 Lộ trình

| Tuần | Kết quả |
|---|---|
| 1 | Chọn thời kỳ, thu thập nguồn, **chốt mô hình dữ liệu** bằng cách nhập tay 20–30 người vào bảng tính; liệt kê các trường hợp khó |
| 2 | Schema Drizzle + migration, `kg.node`, `kg.name`, `kg.fuzzy_date`, `kg.source`, `kg.citation`, `history.person`, `history.parentage`, `history.union_`, các bảng registry |
| 3 | API đọc: nhân vật, lân cận, tổ tiên/hậu duệ, LCA; **viết golden tests cho bộ xác định quan hệ trước** (mục 7.7.7b) rồi mới viết thuật toán |
| 4 | Trang quản trị nhập/duyệt; kiểm tra nhất quán (chu trình, cha mẹ sinh trước con) |
| 5 | Web: khám phá đồ thị + cây phả hệ + trang nhân vật |
| 6 | Chức năng "chọn hai người → mối quan hệ" đầy đủ (7.7: cạnh trực tiếp, họ hàng qua LCA, đường nối gián tiếp, độ chắc chắn) + dòng thời gian cơ bản |
| 7 | Sinh câu hỏi + ôn tập ngắt quãng + tiến độ |
| 8 | Nhập thêm dữ liệu, sửa lỗi, tài liệu, triển khai |

### 14.3 Tiêu chí hoàn thành MVP
- Mọi nhân vật đã duyệt có ít nhất một nguồn.
- Truy vấn tổ tiên/hậu duệ chạy dưới vài trăm ms với dữ liệu MVP.
- Không có chu trình tổ tiên; kiểm tra nhất quán không còn lỗi chặn.
- Bạn dùng app ôn tập ít nhất vài ngày liên tiếp và thấy có ích.
- Có test cho: nhiều vợ, con nuôi, kế vị tranh chấp, ngày mờ.

---

## 15. Câu hỏi còn mở (cần quyết định trước khi code)

1. **Chọn thời kỳ nào cho MVP?** (nên là thời kỳ bạn quan tâm và có nguồn tốt)
2. **Nguồn chính:** dùng Wikidata làm khung rồi biên soạn tay, hay biên soạn tay hoàn toàn từ sách bạn có?
3. **Có cần tiếng Anh không,** hay chỉ tiếng Việt? (ảnh hưởng thiết kế i18n)
4. **Ngôn ngữ phía API/script:** TypeScript (quen thuộc) hay thử Go/Rust cho phần xử lý đồ thị?
5. **Ai là người dùng thứ hai?** (nếu chỉ mình bạn, có thể bỏ qua phân quyền phức tạp)
6. **Hosting:** Railway/Neon (quen thuộc) hay VPS tự dựng (học hạ tầng)?

---

## 16. Mức độ chắc chắn của tài liệu này

- **Đã xác minh:** EDTF hỗ trợ dấu `?`, `~`, `%` cho ngày không chắc chắn/xấp xỉ; Wikidata `P22` là "cha" (male parent).
- **Chưa xác minh:** các mã thuộc tính Wikidata khác, chất lượng dữ liệu Việt Nam trong Wikidata, giấy phép cụ thể, thư viện FSRS/bố trí đồ thị, bảng quy đổi niên hiệu, nguồn quy tắc xưng hô, thư viện chuyển đổi lịch sang JDN, và việc **chạy thật** các câu SQL ở mục 5 (cột sinh `int4range`, khoá ngoại `(id, kind)`, `pg_trgm`, PostGIS).
- **Là đề xuất thiết kế của mình, không phải sự thật đã kiểm chứng:** toàn bộ schema SQL, thuật toán, lộ trình và các con số ước tính (số nhân vật, số tuần).
