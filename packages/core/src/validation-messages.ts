import { z } from "zod";

// Vietnamese replacements for Zod's built-in messages, each naming the field it is about, so a
// failed request reads "Ngày sinh – Tháng: giá trị tối đa là 12" instead of "Number must be less
// than or equal to 12". Messages written next to a schema (`.min(1, "Chọn nhân vật")`) still win.

/** What a request field is called to a person. Keys are the field names used by the schemas. */
const FIELD_LABELS: Record<string, string> = {
  names: "Tên",
  name: "Tên",
  kind: "Loại tên",
  isPrimary: "Tên chính",
  sex: "Giới tính",
  historicity: "Mức độ có thật",
  birth: "Ngày sinh",
  death: "Ngày mất",
  start: "Ngày bắt đầu",
  end: "Ngày kết thúc",
  started: "Ngày thành lập",
  ended: "Ngày kết thúc",
  year: "Năm",
  month: "Tháng",
  day: "Ngày",
  calendar: "Lịch",
  summary: "Tóm tắt",
  body: "Nội dung",
  attributes: "Thuộc tính",
  personId: "Nhân vật",
  polityId: "Chính thể",
  nodeId: "Đối tượng",
  fromId: "Đối tượng nguồn",
  toId: "Đối tượng đích",
  subjectId: "Đối tượng được dẫn nguồn",
  sourceId: "Nguồn",
  placeId: "Địa điểm",
  birthPlaceId: "Nơi sinh",
  deathPlaceId: "Nơi mất",
  parentId: "Địa điểm cha",
  type: "Loại",
  polityType: "Loại chính thể",
  eventType: "Loại sự kiện",
  officeType: "Chức vụ",
  role: "Vai trò",
  side: "Phe",
  title: "Tiêu đề",
  author: "Tác giả",
  url: "Đường dẫn",
  license: "Giấy phép",
  reliability: "Độ tin cậy",
  confidence: "Độ chắc chắn",
  importance: "Mức quan trọng",
  latitude: "Vĩ độ",
  longitude: "Kinh độ",
  email: "Email",
  password: "Mật khẩu",
  note: "Ghi chú",
  quote: "Trích dẫn",
  locator: "Vị trí trong nguồn",
  seq: "Thứ tự",
  known: "Danh sách đối tượng đã có",
};

/** The label of the field an issue points at: the last named segment of its path. */
export function fieldLabel(path: (string | number)[]): string | null {
  for (let i = path.length - 1; i >= 0; i--) {
    const segment = path[i];
    if (typeof segment === "string") return FIELD_LABELS[segment] ?? segment;
  }
  return null;
}

const TYPE_NAMES: Record<string, string> = {
  string: "chuỗi văn bản",
  number: "số",
  integer: "số nguyên",
  boolean: "đúng/sai",
  array: "danh sách",
  object: "đối tượng",
  date: "ngày",
};

function describe(issue: z.ZodIssueOptionalMessage, ctx: z.ErrorMapCtx): string {
  switch (issue.code) {
    case "invalid_type":
      return issue.received === "undefined" || issue.received === "null"
        ? "bắt buộc phải nhập"
        : `sai kiểu dữ liệu, cần ${TYPE_NAMES[issue.expected] ?? issue.expected}`;
    case "invalid_enum_value":
      return `không hợp lệ, chỉ nhận: ${issue.options.join(", ")}`;
    case "invalid_literal":
      return "giá trị không hợp lệ";
    case "invalid_string":
      if (issue.validation === "uuid") return "mã định danh không hợp lệ";
      if (issue.validation === "email") return "email không hợp lệ";
      if (issue.validation === "url") return "địa chỉ liên kết không hợp lệ";
      return "định dạng không hợp lệ";
    case "too_small": {
      const min = Number(issue.minimum);
      if (issue.type === "string")
        return min <= 1 ? "không được để trống" : `cần ít nhất ${min} ký tự`;
      if (issue.type === "array")
        return min <= 1 ? "cần ít nhất một mục" : `cần ít nhất ${min} mục`;
      return `giá trị tối thiểu là ${min}`;
    }
    case "too_big": {
      const max = Number(issue.maximum);
      if (issue.type === "string") return `tối đa ${max} ký tự`;
      if (issue.type === "array") return `tối đa ${max} mục`;
      return `giá trị tối đa là ${max}`;
    }
    case "not_multiple_of":
      return "giá trị không hợp lệ";
    case "unrecognized_keys":
      return `có trường không được hỗ trợ: ${issue.keys.join(", ")}`;
    case "invalid_union":
    case "invalid_union_discriminator":
      return "giá trị không hợp lệ";
    default:
      return ctx.defaultError.toLowerCase();
  }
}

/** Installed once, for every schema in the process (the API and the tests share this instance). */
export const vietnameseErrorMap: z.ZodErrorMap = (issue, ctx) => {
  const label = fieldLabel(issue.path);
  const text = describe(issue, ctx);
  return { message: label ? `${label}: ${text}` : capitalize(text) };
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

z.setErrorMap(vietnameseErrorMap);
