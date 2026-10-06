// One-off content migration: remaining Lê Sơ kings (1497-1527), Lê Trung Hưng kings
// (1533-1789), the 12 chúa Trịnh and 9 chúa Nguyễn, plus Nguyễn Kim as the connecting figure.
// Safe to re-run: every insert is keyed by slug/code and skipped if it already exists.
//
// Run with: pnpm --filter @lineagraph/core exec tsx src/scripts/migrate-later-le.ts
//
// Sourcing note: facts were cross-checked against Vietnamese/English Wikipedia and a handful of
// secondary history sites (see the session report), not the primary chronicles directly.
// Citations below point at the canonical primary source a fact would trace back to, per this
// project's convention — they are not a claim that this script's author re-read that source.
// A few genuinely uncertain points are called out in `note` fields instead of being guessed at.

import { eq, sql as dsql } from "drizzle-orm";
import { db, sql } from "../db";
import { node } from "../schema/kg";
import {
  createPerson,
  createPolity,
  createTenure,
  createRelationship,
  createSource,
  createCitation,
  type PersonInput,
  type PolityInput,
} from "../index";

type DatePart = { year: number; month?: number; day?: number; approximate: boolean } | null;
const d = (year: number, month?: number, day?: number, approximate = false): DatePart => ({
  year,
  month,
  day,
  approximate,
});

// ---------------------------------------------------------------------------------------------
// 1. Sources
// ---------------------------------------------------------------------------------------------

async function ensureSource(title: string, author: string | null, kind: string) {
  const [existing] = await db.execute<{ id: string }>(
    dsql`select id from kg.source where title = ${title} limit 1`,
  );
  if (existing) return existing.id;
  const row = await createSource({
    title,
    author,
    kind,
    url: null,
    reliability: 4,
    note: null,
  });
  return row.id;
}

// ---------------------------------------------------------------------------------------------
// 2. Persons
// ---------------------------------------------------------------------------------------------

type PersonDef = {
  key: string;
  name: string;
  otherNames?: { name: string; kind: string }[];
  sex: "male" | "female" | "unknown";
  birth?: DatePart;
  death?: DatePart;
  summary: string;
  source: "dvsktt" | "cuong_muc" | "dai_nam";
};

const persons: PersonDef[] = [
  // --- Lê Sơ, phần còn thiếu (1497-1527) ---
  {
    key: "le_hien_tong",
    name: "Lê Hiến Tông",
    otherNames: [{ name: "Lê Tranh", kind: "birth" }],
    sex: "male",
    birth: d(1461, 9, 6),
    death: d(1504, 6, 24),
    summary:
      "Con trai Lê Thánh Tông, nối ngôi năm 1497. Giữ được nền thịnh trị Hồng Đức do cha để lại, chú trọng nông nghiệp, thủy lợi và giáo dục.",
    source: "dvsktt",
  },
  {
    key: "truong_lac",
    name: "Trường Lạc Hoàng hậu",
    otherNames: [{ name: "Nguyễn Thị Hằng", kind: "birth" }],
    sex: "female",
    summary: "Hoàng hậu của Lê Thánh Tông, mẹ Lê Hiến Tông.",
    source: "dvsktt",
  },
  {
    key: "trang_thuan",
    name: "Trang Thuận Hoàng hậu",
    otherNames: [{ name: "Nguyễn Thị Hoàn", kind: "birth" }],
    sex: "female",
    summary: "Hoàng hậu của Lê Hiến Tông, mẹ Lê Túc Tông.",
    source: "dvsktt",
  },
  {
    key: "le_tuc_tong",
    name: "Lê Túc Tông",
    otherNames: [{ name: "Lê Thuần", kind: "birth" }],
    sex: "male",
    birth: d(1488, 9, 6),
    death: d(1505, 1, 12, true),
    summary: "Con thứ ba Lê Hiến Tông, ở ngôi chưa đầy một năm rồi mất sớm, không có con nối dõi.",
    source: "dvsktt",
  },
  {
    key: "le_uy_muc",
    name: "Lê Uy Mục",
    otherNames: [{ name: "Lê Tuấn", kind: "birth" }],
    sex: "male",
    birth: d(1488, 5, 5),
    death: d(1510, 1, 20),
    summary:
      'Con Lê Hiến Tông, lên ngôi sau khi Túc Tông mất không con. Sử cũ chép ông tàn bạo, hoang dâm nên bị gọi "Vua Quỷ"; bị Lê Tương Dực nổi dậy lật đổ và giết năm 1510.',
    source: "dvsktt",
  },
  {
    key: "le_tuong_duc",
    name: "Lê Tương Dực",
    otherNames: [
      { name: "Lê Oanh", kind: "birth" },
      { name: "Lê Trừu", kind: "alias" },
    ],
    sex: "male",
    birth: d(1495, 7, 16),
    death: d(1516, 5, 8),
    summary:
      "Cháu nội Lê Thánh Tông, lật đổ Lê Uy Mục lên ngôi năm 1509. Bị tướng Trịnh Duy Sản giết năm 1516; không có con trai nối ngôi.",
    source: "dvsktt",
  },
  {
    key: "kham_duc",
    name: "Khâm Đức Hoàng hậu",
    otherNames: [{ name: "Nguyễn Thị Đạo", kind: "birth" }],
    sex: "female",
    summary: "Hoàng hậu của Lê Tương Dực.",
    source: "dvsktt",
  },
  {
    key: "le_chieu_tong",
    name: "Lê Chiêu Tông",
    otherNames: [{ name: "Lê Y", kind: "birth" }],
    sex: "male",
    birth: d(1506, 10, 4),
    death: d(1526, 12, 18),
    summary:
      "Lên ngôi sau khi Lê Tương Dực mất không người nối dõi trực hệ. Bị Mạc Đăng Dung thao túng rồi ép rời ngôi năm 1522, sau đó bị giết năm 1526.",
    source: "dvsktt",
  },
  {
    key: "le_cung_hoang",
    name: "Lê Cung Hoàng",
    otherNames: [{ name: "Lê Xuân", kind: "birth" }],
    sex: "male",
    birth: d(1507, 7, 26),
    death: d(1527, 6, 15),
    summary:
      "Em Lê Chiêu Tông, được Mạc Đăng Dung đưa lên ngôi thay anh. Là vua cuối cùng của Lê Sơ — bị Mạc Đăng Dung ép nhường ngôi năm 1527.",
    source: "dvsktt",
  },

  // --- Lê Trung Hưng (1533-1789) ---
  {
    key: "le_trang_tong",
    name: "Lê Trang Tông",
    sex: "male",
    birth: d(1515),
    death: d(1548, 3, 9),
    summary:
      "Con Lê Chiêu Tông, được Nguyễn Kim tìm ra và phò lập năm 1533, mở đầu thời Lê Trung Hưng chống lại nhà Mạc.",
    source: "dvsktt",
  },
  {
    key: "le_trung_tong",
    name: "Lê Trung Tông",
    sex: "male",
    birth: d(1535),
    death: d(1556, 1, 24),
    summary: "Con Lê Trang Tông, ở ngôi tám năm, mất không có con nối dõi.",
    source: "dvsktt",
  },
  {
    key: "le_anh_tong",
    name: "Lê Anh Tông",
    otherNames: [{ name: "Lê Duy Bang", kind: "birth" }],
    sex: "male",
    birth: d(1532),
    death: d(1573, 1, 22),
    summary:
      "Dòng đích đã tuyệt tự sau Lê Trung Tông; được Trịnh Kiểm chọn đưa lên ngôi từ một nhánh họ xa. Về sau bị Trịnh Tùng ép chạy rồi giết năm 1573.",
    source: "dvsktt",
  },
  {
    key: "le_the_tong",
    name: "Lê Thế Tông",
    sex: "male",
    birth: d(1567, 11),
    death: d(1599, 8, 24),
    summary: "Con Lê Anh Tông, được Trịnh Tùng lập lên sau khi phế truất cha.",
    source: "dvsktt",
  },
  {
    key: "le_kinh_tong",
    name: "Lê Kính Tông",
    sex: "male",
    birth: d(1588),
    death: d(1619, 6, 23),
    summary:
      "Con Lê Thế Tông. Mưu cùng hoàng tử lật đổ họ Trịnh bất thành, bị Trịnh Tùng ép thắt cổ chết năm 1619.",
    source: "dvsktt",
  },
  {
    key: "le_than_tong",
    name: "Lê Thần Tông",
    sex: "male",
    birth: d(1607, 11, 19),
    death: d(1662, 11, 2),
    summary:
      "Con Lê Kính Tông, làm vua hai lần: lần đầu 1619-1643 rồi nhường ngôi cho con là Lê Chân Tông, lần hai 1649-1662 sau khi Chân Tông mất không con.",
    source: "dvsktt",
  },
  {
    key: "le_chan_tong",
    name: "Lê Chân Tông",
    sex: "male",
    birth: d(1630),
    death: d(1649, 10, 2),
    summary: "Con Lê Thần Tông (lần làm vua thứ nhất), mất sớm không có con nối dõi.",
    source: "dvsktt",
  },
  {
    key: "le_huyen_tong",
    name: "Lê Huyền Tông",
    sex: "male",
    birth: d(1654),
    death: d(1671, 11, 16),
    summary: "Con Lê Thần Tông (lần làm vua thứ hai).",
    source: "cuong_muc",
  },
  {
    key: "le_gia_tong",
    name: "Lê Gia Tông",
    sex: "male",
    birth: d(1661),
    death: d(1675, 4, 27),
    summary: "Con Lê Thần Tông, em Lê Huyền Tông.",
    source: "cuong_muc",
  },
  {
    key: "le_hy_tong",
    name: "Lê Hy Tông",
    otherNames: [{ name: "Lê Duy Hợp", kind: "birth" }],
    sex: "male",
    birth: d(1663, 4, 22),
    death: d(1716, 6, 4),
    summary:
      "Con út Lê Thần Tông, em Lê Gia Tông. Làm vua 1675-1705 rồi nhường ngôi, làm Thái thượng hoàng đến khi mất.",
    source: "cuong_muc",
  },
  {
    key: "le_du_tong",
    name: "Lê Dụ Tông",
    otherNames: [{ name: "Lê Duy Đường", kind: "birth" }],
    sex: "male",
    birth: d(1679),
    death: d(1731, 2, 27),
    summary:
      "Con Lê Hy Tông. Làm vua 1705-1729 rồi nhường ngôi, làm Thái thượng hoàng đến khi mất.",
    source: "cuong_muc",
  },
  {
    key: "le_duy_phuong",
    name: "Lê Duy Phường",
    otherNames: [{ name: "Lê Đế Duy Phường", kind: "alias" }],
    sex: "male",
    birth: d(1709),
    death: d(1735),
    summary:
      "Con Lê Dụ Tông, được chúa Trịnh Cương đưa lên ngôi thay anh. Bị Trịnh Giang phế năm 1732, giáng làm Hôn Đức công.",
    source: "cuong_muc",
  },
  {
    key: "le_thuan_tong",
    name: "Lê Thuần Tông",
    otherNames: [{ name: "Lê Duy Tường", kind: "birth" }],
    sex: "male",
    birth: d(1699, 3, 16),
    death: d(1735, 6, 5),
    summary:
      "Con Lê Dụ Tông, anh Lê Duy Phường. Từng bị phế ngôi thái tử năm 1727, sau được lập làm vua thay em.",
    source: "cuong_muc",
  },
  {
    key: "le_y_tong",
    name: "Lê Ý Tông",
    sex: "male",
    birth: d(1719, 3, 29),
    death: d(1759, 8, 10),
    summary: "Con Lê Dụ Tông. Làm vua 1735-1740 rồi nhường ngôi cho cháu là Lê Hiển Tông.",
    source: "cuong_muc",
  },
  {
    key: "le_hien_tong_2",
    name: "Lê Hiển Tông",
    otherNames: [{ name: "Lê Duy Diêu", kind: "birth" }],
    sex: "male",
    birth: d(1717, 5, 20),
    death: d(1786, 8, 10),
    summary:
      "Con Lê Thuần Tông, vị vua trị vì lâu nhất thời Trung Hưng (47 năm, niên hiệu Cảnh Hưng). Con trai là thái tử Lê Duy Vĩ bị chúa Trịnh Sâm phế rồi giết, nên ngôi sau truyền cho cháu đích tôn.",
    source: "cuong_muc",
  },
  {
    key: "le_chieu_thong",
    name: "Lê Chiêu Thống",
    otherNames: [
      { name: "Lê Duy Khiêm", kind: "birth" },
      { name: "Lê Duy Kỳ", kind: "alias" },
    ],
    sex: "male",
    birth: d(1765),
    death: d(1793),
    summary:
      "Cháu nội Lê Hiển Tông, vua cuối cùng nhà Lê. Bị quân Tây Sơn đánh bại, chạy sang cầu viện nhà Thanh, thua trận Ngọc Hồi - Đống Đa năm 1789 rồi lưu vong và mất tại Yên Kinh.",
    source: "cuong_muc",
  },

  // --- Nguyễn Kim (nhân vật gốc nối chúa Trịnh và chúa Nguyễn) ---
  {
    key: "nguyen_kim",
    name: "Nguyễn Kim",
    sex: "male",
    birth: d(1468),
    death: d(1545),
    summary:
      "Võ tướng tìm ra và phò lập Lê Trang Tông năm 1533, mở đầu thời Lê Trung Hưng. Cha của Nguyễn Hoàng; con rể ông là Trịnh Kiểm. Mất năm 1545, bị đầu độc khi đang tiến đánh Ninh Bình.",
    source: "dvsktt",
  },

  // --- 12 đời chúa Trịnh ---
  {
    key: "trinh_kiem",
    name: "Trịnh Kiểm",
    otherNames: [{ name: "Minh Khang Thái Vương", kind: "posthumous" }],
    sex: "male",
    birth: d(1503),
    death: d(1570),
    summary:
      'Con rể Nguyễn Kim, kế tục binh quyền sau khi Nguyễn Kim mất năm 1545, trở thành chúa Trịnh đầu tiên, mở đầu thời kỳ "vua Lê chúa Trịnh".',
    source: "cuong_muc",
  },
  {
    key: "trinh_tung",
    name: "Trịnh Tùng",
    otherNames: [{ name: "Bình An Vương", kind: "posthumous" }],
    sex: "male",
    birth: d(1550, 12, 19),
    death: d(1623, 7, 17),
    summary: "Con Trịnh Kiểm, nắm quyền chúa Trịnh lâu nhất (hơn 50 năm), xưng vương năm 1599.",
    source: "cuong_muc",
  },
  {
    key: "trinh_trang",
    name: "Trịnh Tráng",
    sex: "male",
    birth: d(1577),
    death: d(1657),
    summary: "Con Trịnh Tùng.",
    source: "cuong_muc",
  },
  {
    key: "dang_thi_ngoc_bao",
    name: "Đặng Thị Ngọc Bảo",
    sex: "female",
    summary: "Vợ Trịnh Tùng, mẹ Trịnh Tráng.",
    source: "cuong_muc",
  },
  {
    key: "trinh_tac",
    name: "Trịnh Tạc",
    sex: "male",
    birth: d(1606, 4, 11),
    death: d(1682, 9, 24),
    summary: "Con Trịnh Tráng.",
    source: "cuong_muc",
  },
  {
    key: "trinh_can",
    name: "Trịnh Căn",
    otherNames: [{ name: "Định Nam Vương", kind: "posthumous" }],
    sex: "male",
    birth: d(1633, 7, 18),
    death: d(1709, 6, 17),
    summary: "Con Trịnh Tạc.",
    source: "cuong_muc",
  },
  {
    key: "vu_thi_ngoc_le",
    name: "Vũ Thị Ngọc Lễ",
    sex: "female",
    summary: "Vợ Trịnh Tạc, mẹ Trịnh Căn.",
    source: "cuong_muc",
  },
  {
    key: "trinh_cuong",
    name: "Trịnh Cương",
    sex: "male",
    birth: d(1686),
    death: d(1729),
    summary:
      "Chắt Trịnh Căn (cha và ông nội mất trước Trịnh Căn nên kế vị trực tiếp từ cụ) — quan hệ huyết thống hai đời trung gian chưa xác định rõ tên nên chỉ ghi quan hệ kế vị.",
    source: "cuong_muc",
  },
  {
    key: "trinh_giang",
    name: "Trịnh Giang",
    sex: "male",
    birth: d(1711, 10, 14),
    death: d(1762, 12, 30),
    summary: "Con Trịnh Cương, bị ép thoái vị năm 1740 rồi nhường ngôi chúa cho em.",
    source: "cuong_muc",
  },
  {
    key: "trinh_doanh",
    name: "Trịnh Doanh",
    otherNames: [{ name: "Minh Đô Vương", kind: "posthumous" }],
    sex: "male",
    birth: d(1720, 12, 4),
    death: d(1767, 2, 15, true),
    summary: "Con Trịnh Cương, em Trịnh Giang, được suy tôn thay anh năm 1740.",
    source: "cuong_muc",
  },
  {
    key: "trinh_sam",
    name: "Trịnh Sâm",
    otherNames: [{ name: "Tĩnh Đô Vương", kind: "posthumous" }],
    sex: "male",
    birth: d(1739, 2, 9),
    death: d(1782, 9, 13),
    summary: "Con Trịnh Doanh.",
    source: "cuong_muc",
  },
  {
    key: "trinh_can_2",
    name: "Trịnh Cán",
    otherNames: [{ name: "Điện Đô Vương", kind: "posthumous" }],
    sex: "male",
    birth: d(1777),
    death: d(1782, 12, 17),
    summary:
      "Con Trịnh Sâm, được mẹ là Đặng Thị Huệ đưa lên thay anh khi mới 4-5 tuổi; chỉ ở ngôi chúa khoảng một tháng rồi bị phế.",
    source: "cuong_muc",
  },
  {
    key: "trinh_khai",
    name: "Trịnh Khải",
    otherNames: [{ name: "Trịnh Tông", kind: "alias" }],
    sex: "male",
    birth: d(1763, 10, 10),
    death: d(1786, 7, 23),
    summary:
      "Con Trịnh Sâm, được kiêu binh nổi loạn phế Trịnh Cán rồi lập lên năm 1782. Tự sát khi bị quân Tây Sơn bắt năm 1786.",
    source: "cuong_muc",
  },
  {
    key: "trinh_bong",
    name: "Trịnh Bồng",
    sex: "male",
    birth: d(1740),
    death: d(1787, undefined, undefined, true),
    summary:
      "Chúa Trịnh cuối cùng, được suy tôn sau loạn kiêu binh năm 1786. Quan hệ huyết thống với Trịnh Khải chưa xác định rõ. Mất tích năm 1787 khi họ Trịnh sụp đổ.",
    source: "cuong_muc",
  },

  // --- 9 đời chúa Nguyễn ---
  {
    key: "nguyen_hoang",
    name: "Nguyễn Hoàng",
    otherNames: [
      { name: "Chúa Tiên", kind: "alias" },
      { name: "Thái Tổ", kind: "posthumous" },
    ],
    sex: "male",
    birth: d(1525, 8, 28),
    death: d(1613, 7, 20),
    summary:
      "Con Nguyễn Kim, em vợ Trịnh Kiểm. Vào trấn thủ Thuận Hóa năm 1558, sau kiêm Quảng Nam năm 1570 — người mở đầu cơ nghiệp chúa Nguyễn ở Đàng Trong.",
    source: "dai_nam",
  },
  {
    key: "nguyen_phuc_nguyen",
    name: "Nguyễn Phúc Nguyên",
    otherNames: [{ name: "Chúa Sãi", kind: "alias" }],
    sex: "male",
    birth: d(1563, 8, 16),
    death: d(1635, 12, 19),
    summary: "Con thứ sáu Nguyễn Hoàng.",
    source: "dai_nam",
  },
  {
    key: "nguyen_phuc_lan",
    name: "Nguyễn Phúc Lan",
    otherNames: [{ name: "Chúa Thượng", kind: "alias" }],
    sex: "male",
    birth: d(1601, 8, 13),
    death: d(1648, 3, 19),
    summary: "Con Nguyễn Phúc Nguyên.",
    source: "dai_nam",
  },
  {
    key: "doan_thi_ngoc",
    name: "Đoàn Thị Ngọc",
    sex: "female",
    summary: "Vợ Nguyễn Phúc Lan, mẹ Nguyễn Phúc Tần.",
    source: "dai_nam",
  },
  {
    key: "nguyen_phuc_tan",
    name: "Nguyễn Phúc Tần",
    otherNames: [{ name: "Chúa Hiền", kind: "alias" }],
    sex: "male",
    birth: d(1620, 7, 18),
    death: d(1687, 4, 30),
    summary: "Con Nguyễn Phúc Lan.",
    source: "dai_nam",
  },
  {
    key: "nguyen_phuc_thai",
    name: "Nguyễn Phúc Thái",
    otherNames: [
      { name: "Nguyễn Phúc Trăn", kind: "alias" },
      { name: "Chúa Nghĩa", kind: "alias" },
    ],
    sex: "male",
    birth: d(1650, 1, 22),
    death: d(1691, 2, 7),
    summary: "Con Nguyễn Phúc Tần.",
    source: "dai_nam",
  },
  {
    key: "nguyen_phuc_chu",
    name: "Nguyễn Phúc Chu",
    otherNames: [{ name: "Chúa Minh", kind: "alias" }],
    sex: "male",
    birth: d(1675, 6, 11),
    death: d(1725, 6, 2),
    summary: "Con trưởng Nguyễn Phúc Thái.",
    source: "dai_nam",
  },
  {
    key: "nguyen_phuc_tru",
    name: "Nguyễn Phúc Trú",
    otherNames: [
      { name: "Nguyễn Phúc Thụ", kind: "alias" },
      { name: "Chúa Ninh", kind: "alias" },
    ],
    sex: "male",
    birth: d(1697, 1, 14),
    death: d(1738, 6, 7),
    summary: "Con thứ hai Nguyễn Phúc Chu.",
    source: "dai_nam",
  },
  {
    key: "nguyen_phuc_khoat",
    name: "Nguyễn Phúc Khoát",
    otherNames: [{ name: "Võ Vương", kind: "posthumous" }],
    sex: "male",
    birth: d(1714, 9, 26),
    death: d(1765, 7, 7),
    summary:
      "Con Nguyễn Phúc Trú. Tự xưng Vương năm 1744 — trước đó các chúa Nguyễn chỉ xưng Chúa/Công chứ chưa xưng vương chính thức.",
    source: "dai_nam",
  },
  {
    key: "nguyen_phuc_thuan",
    name: "Nguyễn Phúc Thuần",
    otherNames: [{ name: "Định Vương", kind: "posthumous" }],
    sex: "male",
    birth: d(1754, 12, 31),
    death: d(1777, 10, 18),
    summary:
      "Con Nguyễn Phúc Khoát, chúa Nguyễn cuối cùng. Bị quân Tây Sơn giết năm 1777, Đàng Trong rơi vào tay Tây Sơn.",
    source: "dai_nam",
  },
];

// ---------------------------------------------------------------------------------------------
// 3. Polities
// ---------------------------------------------------------------------------------------------

const polities: { key: string; name: string; started: DatePart; ended: DatePart }[] = [
  { key: "chua_trinh", name: "Chúa Trịnh", started: d(1545), ended: d(1787) },
  { key: "chua_nguyen", name: "Chúa Nguyễn", started: d(1558), ended: d(1777) },
];

// ---------------------------------------------------------------------------------------------
// 4. Tenures (office-holding), keyed by person
// ---------------------------------------------------------------------------------------------

type TenureDef = {
  personKey: string;
  polityKey: string; // key above, or "slug:nha-hau-le" for the existing dynasty
  officeType: string;
  start?: DatePart;
  end?: DatePart;
  seq?: number;
  successionMode?: string;
  eras?: { name: string; start?: DatePart; end?: DatePart }[];
};

const LE = "slug:nha-hau-le";

const tenures: TenureDef[] = [
  {
    personKey: "le_hien_tong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1497, 3, 9),
    end: d(1504, 6, 24),
    seq: 6,
    successionMode: "hereditary",
    eras: [{ name: "Cảnh Thống", start: d(1497), end: d(1504) }],
  },
  {
    personKey: "le_tuc_tong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1504, 7, 17),
    end: d(1505, 1, 12),
    seq: 7,
    successionMode: "hereditary",
    eras: [{ name: "Thái Trinh", start: d(1504), end: d(1505) }],
  },
  {
    personKey: "le_uy_muc",
    polityKey: LE,
    officeType: "emperor",
    start: d(1505),
    end: d(1510),
    seq: 8,
    successionMode: "hereditary",
    eras: [{ name: "Đoan Khánh", start: d(1505), end: d(1510) }],
  },
  {
    personKey: "le_tuong_duc",
    polityKey: LE,
    officeType: "emperor",
    start: d(1509, 12, 4),
    end: d(1516, 5, 7),
    seq: 9,
    successionMode: "usurpation",
    eras: [{ name: "Hồng Thuận", start: d(1509), end: d(1516) }],
  },
  {
    personKey: "le_chieu_tong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1516),
    end: d(1522),
    seq: 10,
    eras: [{ name: "Quang Thiệu", start: d(1516), end: d(1522) }],
  },
  {
    personKey: "le_cung_hoang",
    polityKey: LE,
    officeType: "emperor",
    start: d(1522),
    end: d(1527),
    seq: 11,
    successionMode: "appointment",
    eras: [{ name: "Thống Nguyên", start: d(1522), end: d(1527) }],
  },
  {
    personKey: "le_trang_tong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1533),
    end: d(1548, 3, 9),
    seq: 12,
    eras: [{ name: "Nguyên Hòa", start: d(1533), end: d(1548) }],
  },
  {
    personKey: "le_trung_tong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1548),
    end: d(1556),
    seq: 13,
    successionMode: "hereditary",
    eras: [{ name: "Thuận Bình", start: d(1548), end: d(1556) }],
  },
  {
    personKey: "le_anh_tong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1556),
    end: d(1573),
    seq: 14,
    successionMode: "election",
    eras: [
      { name: "Chính Trị", start: d(1558), end: d(1571) },
      { name: "Hồng Phúc", start: d(1572), end: d(1573) },
    ],
  },
  {
    personKey: "le_the_tong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1573),
    end: d(1599, 8, 24),
    seq: 15,
    successionMode: "hereditary",
    eras: [
      { name: "Gia Thái", start: d(1573), end: d(1577) },
      { name: "Quang Hưng", start: d(1578), end: d(1599) },
    ],
  },
  {
    personKey: "le_kinh_tong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1599),
    end: d(1619),
    seq: 16,
    successionMode: "hereditary",
    eras: [
      { name: "Thận Đức", start: d(1600), end: d(1601) },
      { name: "Hoằng Định", start: d(1601), end: d(1619) },
    ],
  },
  {
    personKey: "le_than_tong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1619),
    end: d(1643),
    seq: 17,
    successionMode: "hereditary",
    eras: [
      { name: "Vĩnh Tộ", start: d(1619), end: d(1628) },
      { name: "Đức Long", start: d(1629), end: d(1634) },
      { name: "Dương Hòa", start: d(1635), end: d(1643) },
    ],
  },
  {
    personKey: "le_chan_tong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1643),
    end: d(1649, 10, 2),
    seq: 18,
    successionMode: "abdication",
    eras: [{ name: "Phúc Thái", start: d(1643), end: d(1649) }],
  },
  {
    personKey: "le_than_tong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1649),
    end: d(1662, 11, 2),
    seq: 19,
    eras: [
      { name: "Khánh Đức", start: d(1649), end: d(1653) },
      { name: "Thịnh Đức", start: d(1653), end: d(1658) },
      { name: "Vĩnh Thọ", start: d(1658), end: d(1662) },
      { name: "Vạn Khánh", start: d(1662), end: d(1662) },
    ],
  },
  {
    personKey: "le_huyen_tong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1662),
    end: d(1671),
    seq: 20,
    successionMode: "hereditary",
    eras: [{ name: "Cảnh Trị", start: d(1662), end: d(1671) }],
  },
  {
    personKey: "le_gia_tong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1672),
    end: d(1675),
    seq: 21,
    successionMode: "hereditary",
    eras: [
      { name: "Dương Đức", start: d(1672), end: d(1674) },
      { name: "Đức Nguyên", start: d(1674), end: d(1675) },
    ],
  },
  {
    personKey: "le_hy_tong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1675),
    end: d(1705),
    seq: 22,
    successionMode: "hereditary",
    eras: [
      { name: "Vĩnh Trị", start: d(1676), end: d(1680) },
      { name: "Chính Hòa", start: d(1680), end: d(1705) },
    ],
  },
  {
    personKey: "le_du_tong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1705),
    end: d(1729),
    seq: 23,
    successionMode: "abdication",
    eras: [
      { name: "Vĩnh Thịnh", start: d(1705), end: d(1720) },
      { name: "Bảo Thái", start: d(1720), end: d(1729) },
    ],
  },
  {
    personKey: "le_duy_phuong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1729),
    end: d(1732),
    seq: 24,
    successionMode: "appointment",
    eras: [{ name: "Vĩnh Khánh", start: d(1729), end: d(1732) }],
  },
  {
    personKey: "le_thuan_tong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1732),
    end: d(1735),
    seq: 25,
    successionMode: "appointment",
    eras: [{ name: "Long Đức", start: d(1732), end: d(1735) }],
  },
  {
    personKey: "le_y_tong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1735),
    end: d(1740),
    seq: 26,
    successionMode: "hereditary",
    eras: [{ name: "Vĩnh Hựu", start: d(1735), end: d(1740) }],
  },
  {
    personKey: "le_hien_tong_2",
    polityKey: LE,
    officeType: "emperor",
    start: d(1740),
    end: d(1786, 8, 10),
    seq: 27,
    successionMode: "abdication",
    eras: [{ name: "Cảnh Hưng", start: d(1740), end: d(1786) }],
  },
  {
    personKey: "le_chieu_thong",
    polityKey: LE,
    officeType: "emperor",
    start: d(1786),
    end: d(1789),
    seq: 28,
    successionMode: "hereditary",
    eras: [{ name: "Chiêu Thống", start: d(1787), end: d(1789) }],
  },

  // --- Nguyễn Kim: giữ binh quyền phò Lê, trước khi có phủ chúa Trịnh ---
  {
    personKey: "nguyen_kim",
    polityKey: LE,
    officeType: "regent",
    start: d(1533),
    end: d(1545),
  },

  // --- Chúa Trịnh ---
  {
    personKey: "trinh_kiem",
    polityKey: "chua_trinh",
    officeType: "lord",
    start: d(1545),
    end: d(1570),
    seq: 1,
  },
  {
    personKey: "trinh_tung",
    polityKey: "chua_trinh",
    officeType: "lord",
    start: d(1570),
    end: d(1623, 7, 17),
    seq: 2,
    successionMode: "hereditary",
  },
  {
    personKey: "trinh_trang",
    polityKey: "chua_trinh",
    officeType: "lord",
    start: d(1623),
    end: d(1657),
    seq: 3,
    successionMode: "hereditary",
  },
  {
    personKey: "trinh_tac",
    polityKey: "chua_trinh",
    officeType: "lord",
    start: d(1657),
    end: d(1682, 9, 24),
    seq: 4,
    successionMode: "hereditary",
  },
  {
    personKey: "trinh_can",
    polityKey: "chua_trinh",
    officeType: "lord",
    start: d(1682),
    end: d(1709, 6, 17),
    seq: 5,
    successionMode: "hereditary",
  },
  {
    personKey: "trinh_cuong",
    polityKey: "chua_trinh",
    officeType: "lord",
    start: d(1709),
    end: d(1729),
    seq: 6,
  },
  {
    personKey: "trinh_giang",
    polityKey: "chua_trinh",
    officeType: "lord",
    start: d(1729),
    end: d(1740),
    seq: 7,
    successionMode: "hereditary",
  },
  {
    personKey: "trinh_doanh",
    polityKey: "chua_trinh",
    officeType: "lord",
    start: d(1740),
    end: d(1767, 2, 15),
    seq: 8,
    successionMode: "election",
  },
  {
    personKey: "trinh_sam",
    polityKey: "chua_trinh",
    officeType: "lord",
    start: d(1767),
    end: d(1782, 9, 13),
    seq: 9,
    successionMode: "hereditary",
  },
  {
    personKey: "trinh_can_2",
    polityKey: "chua_trinh",
    officeType: "lord",
    start: d(1782, 9),
    end: d(1782, 11),
    seq: 10,
    successionMode: "hereditary",
  },
  {
    personKey: "trinh_khai",
    polityKey: "chua_trinh",
    officeType: "lord",
    start: d(1782, 11),
    end: d(1786, 7, 23),
    seq: 11,
    successionMode: "usurpation",
  },
  {
    personKey: "trinh_bong",
    polityKey: "chua_trinh",
    officeType: "lord",
    start: d(1786),
    end: d(1787),
    seq: 12,
    successionMode: "election",
  },

  // --- Chúa Nguyễn ---
  {
    personKey: "nguyen_hoang",
    polityKey: "chua_nguyen",
    officeType: "lord",
    start: d(1558),
    end: d(1613, 7, 20),
    seq: 1,
  },
  {
    personKey: "nguyen_phuc_nguyen",
    polityKey: "chua_nguyen",
    officeType: "lord",
    start: d(1613),
    end: d(1635, 12, 19),
    seq: 2,
    successionMode: "hereditary",
  },
  {
    personKey: "nguyen_phuc_lan",
    polityKey: "chua_nguyen",
    officeType: "lord",
    start: d(1635),
    end: d(1648, 3, 19),
    seq: 3,
    successionMode: "hereditary",
  },
  {
    personKey: "nguyen_phuc_tan",
    polityKey: "chua_nguyen",
    officeType: "lord",
    start: d(1648),
    end: d(1687, 4, 30),
    seq: 4,
    successionMode: "hereditary",
  },
  {
    personKey: "nguyen_phuc_thai",
    polityKey: "chua_nguyen",
    officeType: "lord",
    start: d(1687),
    end: d(1691, 2, 7),
    seq: 5,
    successionMode: "hereditary",
  },
  {
    personKey: "nguyen_phuc_chu",
    polityKey: "chua_nguyen",
    officeType: "lord",
    start: d(1691),
    end: d(1725, 6, 2),
    seq: 6,
    successionMode: "hereditary",
  },
  {
    personKey: "nguyen_phuc_tru",
    polityKey: "chua_nguyen",
    officeType: "lord",
    start: d(1725),
    end: d(1738, 6, 7),
    seq: 7,
    successionMode: "hereditary",
  },
  {
    personKey: "nguyen_phuc_khoat",
    polityKey: "chua_nguyen",
    officeType: "lord",
    start: d(1738),
    end: d(1765, 7, 7),
    seq: 8,
    successionMode: "hereditary",
  },
  {
    personKey: "nguyen_phuc_thuan",
    polityKey: "chua_nguyen",
    officeType: "lord",
    start: d(1765),
    end: d(1777, 10, 18),
    seq: 9,
    successionMode: "hereditary",
  },
];

// ---------------------------------------------------------------------------------------------
// 5. Relations
// ---------------------------------------------------------------------------------------------

type RelationDef = {
  from: string;
  type: string;
  to: string;
  variant?: string;
  note?: string;
};

const SLE = {
  thanhTong: "slug:le-thanh-tong",
};

const relations: RelationDef[] = [
  // Lê Sơ: gia đình
  { from: SLE.thanhTong, type: "parent_of", to: "le_hien_tong", variant: "biological" },
  { from: SLE.thanhTong, type: "spouse_of", to: "truong_lac" },
  { from: "truong_lac", type: "parent_of", to: "le_hien_tong", variant: "biological" },
  { from: "le_hien_tong", type: "spouse_of", to: "trang_thuan" },
  { from: "le_hien_tong", type: "parent_of", to: "le_tuc_tong", variant: "biological" },
  { from: "trang_thuan", type: "parent_of", to: "le_tuc_tong", variant: "biological" },
  { from: "le_hien_tong", type: "parent_of", to: "le_uy_muc", variant: "biological" },
  { from: "le_tuong_duc", type: "spouse_of", to: "kham_duc" },
  { from: "le_chieu_tong", type: "sibling_of", to: "le_cung_hoang" },
  { from: "le_chieu_tong", type: "parent_of", to: "le_trang_tong", variant: "biological" },

  // Lê Sơ: kế vị
  { from: "le_hien_tong", type: "successor_of", to: SLE.thanhTong },
  { from: "le_tuc_tong", type: "successor_of", to: "le_hien_tong" },
  { from: "le_uy_muc", type: "successor_of", to: "le_tuc_tong" },
  {
    from: "le_tuong_duc",
    type: "successor_of",
    to: "le_uy_muc",
    note: "Lật đổ bằng binh biến, không phải con Lê Uy Mục.",
  },
  {
    from: "le_chieu_tong",
    type: "successor_of",
    to: "le_tuong_duc",
    note: "Quan hệ huyết thống với Lê Tương Dực chưa xác định rõ ràng trong các nguồn đối chiếu được.",
  },
  { from: "le_cung_hoang", type: "successor_of", to: "le_chieu_tong" },

  // Lê Trung Hưng: gia đình
  { from: "le_trang_tong", type: "parent_of", to: "le_trung_tong", variant: "biological" },
  { from: "le_the_tong", type: "parent_of", to: "le_kinh_tong", variant: "biological" },
  {
    from: "le_anh_tong",
    type: "parent_of",
    to: "le_the_tong",
    variant: "biological",
  },
  { from: "le_kinh_tong", type: "parent_of", to: "le_than_tong", variant: "biological" },
  { from: "le_than_tong", type: "parent_of", to: "le_chan_tong", variant: "biological" },
  { from: "le_than_tong", type: "parent_of", to: "le_huyen_tong", variant: "biological" },
  { from: "le_than_tong", type: "parent_of", to: "le_gia_tong", variant: "biological" },
  { from: "le_than_tong", type: "parent_of", to: "le_hy_tong", variant: "biological" },
  { from: "le_gia_tong", type: "sibling_of", to: "le_huyen_tong" },
  { from: "le_gia_tong", type: "sibling_of", to: "le_hy_tong" },
  { from: "le_hy_tong", type: "parent_of", to: "le_du_tong", variant: "biological" },
  { from: "le_du_tong", type: "parent_of", to: "le_duy_phuong", variant: "biological" },
  { from: "le_du_tong", type: "parent_of", to: "le_thuan_tong", variant: "biological" },
  { from: "le_duy_phuong", type: "sibling_of", to: "le_thuan_tong" },
  { from: "le_du_tong", type: "parent_of", to: "le_y_tong", variant: "biological" },
  { from: "le_thuan_tong", type: "parent_of", to: "le_hien_tong_2", variant: "biological" },

  // Lê Trung Hưng: kế vị
  {
    from: "le_trang_tong",
    type: "successor_of",
    to: "le_cung_hoang",
    note: "Khởi đầu thời Lê Trung Hưng, sau giai đoạn nhà Mạc cướp ngôi (1527-1533, không mô tả trong dữ liệu này).",
  },
  { from: "le_trung_tong", type: "successor_of", to: "le_trang_tong" },
  {
    from: "le_anh_tong",
    type: "successor_of",
    to: "le_trung_tong",
    note: "Dòng đích đã tuyệt tự; Trịnh Kiểm chọn đưa lên từ một nhánh họ xa, không phải con ruột Lê Trung Tông.",
  },
  { from: "le_the_tong", type: "successor_of", to: "le_anh_tong" },
  { from: "le_kinh_tong", type: "successor_of", to: "le_the_tong" },
  { from: "le_than_tong", type: "successor_of", to: "le_kinh_tong" },
  { from: "le_chan_tong", type: "successor_of", to: "le_than_tong" },
  {
    from: "le_than_tong",
    type: "successor_of",
    to: "le_chan_tong",
    note: "Lê Thần Tông trở lại ngôi lần thứ hai sau khi con là Lê Chân Tông mất không có con nối dõi.",
  },
  { from: "le_huyen_tong", type: "successor_of", to: "le_than_tong" },
  { from: "le_gia_tong", type: "successor_of", to: "le_huyen_tong" },
  { from: "le_hy_tong", type: "successor_of", to: "le_gia_tong" },
  { from: "le_du_tong", type: "successor_of", to: "le_hy_tong" },
  { from: "le_duy_phuong", type: "successor_of", to: "le_du_tong" },
  {
    from: "le_thuan_tong",
    type: "successor_of",
    to: "le_duy_phuong",
    note: "Lê Thuần Tông từng bị phế ngôi thái tử năm 1727, sau được lập làm vua thay em là Lê Duy Phường bị chúa Trịnh Giang phế năm 1732.",
  },
  { from: "le_y_tong", type: "successor_of", to: "le_thuan_tong" },
  { from: "le_hien_tong_2", type: "successor_of", to: "le_y_tong" },
  {
    from: "le_chieu_thong",
    type: "successor_of",
    to: "le_hien_tong_2",
    note: "Lê Chiêu Thống là cháu nội Lê Hiển Tông; cha là thái tử Lê Duy Vĩ bị chúa Trịnh Sâm phế rồi giết nên không từng làm vua.",
  },

  // Nguyễn Kim <-> Trịnh Kiểm / Nguyễn Hoàng
  { from: "nguyen_kim", type: "parent_of", to: "nguyen_hoang", variant: "biological" },
  {
    from: "trinh_kiem",
    type: "successor_of",
    to: "nguyen_kim",
    note: "Trịnh Kiểm là con rể Nguyễn Kim, kế tục binh quyền sau khi Nguyễn Kim mất năm 1545 (quan hệ hôn nhân với con gái Nguyễn Kim không rõ tên nên không dựng thành quan hệ riêng).",
  },
  // Chúa Trịnh: gia đình + kế vị
  { from: "trinh_kiem", type: "founder_of", to: "chua_trinh" },
  { from: "trinh_kiem", type: "parent_of", to: "trinh_tung", variant: "biological" },
  { from: "trinh_tung", type: "successor_of", to: "trinh_kiem" },
  { from: "trinh_tung", type: "spouse_of", to: "dang_thi_ngoc_bao" },
  { from: "trinh_tung", type: "parent_of", to: "trinh_trang", variant: "biological" },
  { from: "dang_thi_ngoc_bao", type: "parent_of", to: "trinh_trang", variant: "biological" },
  { from: "trinh_trang", type: "successor_of", to: "trinh_tung" },
  { from: "trinh_trang", type: "parent_of", to: "trinh_tac", variant: "biological" },
  { from: "trinh_tac", type: "successor_of", to: "trinh_trang" },
  { from: "trinh_tac", type: "spouse_of", to: "vu_thi_ngoc_le" },
  { from: "trinh_tac", type: "parent_of", to: "trinh_can", variant: "biological" },
  { from: "vu_thi_ngoc_le", type: "parent_of", to: "trinh_can", variant: "biological" },
  { from: "trinh_can", type: "successor_of", to: "trinh_tac" },
  {
    from: "trinh_cuong",
    type: "successor_of",
    to: "trinh_can",
    note: "Trịnh Cương là chắt Trịnh Căn; cha và ông nội đều mất trước Trịnh Căn nên kế vị trực tiếp từ cụ. Hai đời trung gian chưa xác định rõ tên nên không dựng quan hệ cha/con trực tiếp.",
  },
  { from: "trinh_cuong", type: "parent_of", to: "trinh_giang", variant: "biological" },
  { from: "trinh_giang", type: "successor_of", to: "trinh_cuong" },
  { from: "trinh_cuong", type: "parent_of", to: "trinh_doanh", variant: "biological" },
  { from: "trinh_giang", type: "sibling_of", to: "trinh_doanh" },
  {
    from: "trinh_doanh",
    type: "successor_of",
    to: "trinh_giang",
    note: "Trịnh Doanh được suy tôn thay anh Trịnh Giang bị ép thoái vị năm 1740.",
  },
  { from: "trinh_doanh", type: "parent_of", to: "trinh_sam", variant: "biological" },
  { from: "trinh_sam", type: "successor_of", to: "trinh_doanh" },
  { from: "trinh_sam", type: "parent_of", to: "trinh_can_2", variant: "biological" },
  { from: "trinh_sam", type: "parent_of", to: "trinh_khai", variant: "biological" },
  { from: "trinh_can_2", type: "sibling_of", to: "trinh_khai" },
  {
    from: "trinh_can_2",
    type: "successor_of",
    to: "trinh_sam",
    note: "Được mẹ Đặng Thị Huệ đưa lên thay anh khi mới 4-5 tuổi.",
  },
  {
    from: "trinh_khai",
    type: "successor_of",
    to: "trinh_can_2",
    note: "Kiêu binh nổi loạn phế Trịnh Cán, lập Trịnh Khải (Trịnh Tông) lên thay năm 1782.",
  },
  {
    from: "trinh_bong",
    type: "successor_of",
    to: "trinh_khai",
    note: "Quan hệ huyết thống giữa Trịnh Bồng và Trịnh Khải chưa xác định rõ trong các nguồn đối chiếu được.",
  },

  // Chúa Nguyễn: gia đình + kế vị
  { from: "nguyen_hoang", type: "founder_of", to: "chua_nguyen" },
  { from: "nguyen_hoang", type: "parent_of", to: "nguyen_phuc_nguyen", variant: "biological" },
  { from: "nguyen_phuc_nguyen", type: "successor_of", to: "nguyen_hoang" },
  {
    from: "nguyen_phuc_nguyen",
    type: "parent_of",
    to: "nguyen_phuc_lan",
    variant: "biological",
  },
  { from: "nguyen_phuc_lan", type: "successor_of", to: "nguyen_phuc_nguyen" },
  { from: "nguyen_phuc_lan", type: "spouse_of", to: "doan_thi_ngoc" },
  { from: "nguyen_phuc_lan", type: "parent_of", to: "nguyen_phuc_tan", variant: "biological" },
  { from: "doan_thi_ngoc", type: "parent_of", to: "nguyen_phuc_tan", variant: "biological" },
  { from: "nguyen_phuc_tan", type: "successor_of", to: "nguyen_phuc_lan" },
  { from: "nguyen_phuc_tan", type: "parent_of", to: "nguyen_phuc_thai", variant: "biological" },
  { from: "nguyen_phuc_thai", type: "successor_of", to: "nguyen_phuc_tan" },
  {
    from: "nguyen_phuc_thai",
    type: "parent_of",
    to: "nguyen_phuc_chu",
    variant: "biological",
  },
  { from: "nguyen_phuc_chu", type: "successor_of", to: "nguyen_phuc_thai" },
  { from: "nguyen_phuc_chu", type: "parent_of", to: "nguyen_phuc_tru", variant: "biological" },
  { from: "nguyen_phuc_tru", type: "successor_of", to: "nguyen_phuc_chu" },
  {
    from: "nguyen_phuc_tru",
    type: "parent_of",
    to: "nguyen_phuc_khoat",
    variant: "biological",
  },
  { from: "nguyen_phuc_khoat", type: "successor_of", to: "nguyen_phuc_tru" },
  {
    from: "nguyen_phuc_khoat",
    type: "parent_of",
    to: "nguyen_phuc_thuan",
    variant: "biological",
  },
  { from: "nguyen_phuc_thuan", type: "successor_of", to: "nguyen_phuc_khoat" },
];

// ---------------------------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------------------------

async function resolveSlug(slug: string): Promise<string> {
  const [row] = await db.select({ id: node.id }).from(node).where(eq(node.slug, slug));
  if (!row) throw new Error(`Không tìm thấy node slug=${slug}`);
  return row.id;
}

async function main() {
  const sourceIds = {
    dvsktt: await ensureSource("Đại Việt sử ký toàn thư", "Ngô Sĩ Liên", "chính sử"),
    cuong_muc: await ensureSource(
      "Khâm định Việt sử thông giám cương mục",
      "Quốc sử quán triều Nguyễn",
      "chính sử",
    ),
    dai_nam: await ensureSource("Đại Nam thực lục", "Quốc sử quán triều Nguyễn", "chính sử"),
  };

  const ids = new Map<string, string>();
  ids.set("slug:le-thanh-tong", await resolveSlug("le-thanh-tong"));
  ids.set("slug:nha-hau-le", await resolveSlug("nha-hau-le"));

  console.log(`Tạo ${persons.length} nhân vật...`);
  for (const p of persons) {
    const input: PersonInput = {
      names: [
        { name: p.name, kind: "common", isPrimary: true, language: "vi" },
        ...(p.otherNames ?? []).map((n) => ({
          name: n.name,
          kind: n.kind,
          isPrimary: false,
          language: "vi",
        })),
      ],
      sex: p.sex,
      historicity: "historical",
      summary: p.summary,
      body: null,
      attributes: [],
      birth: p.birth ?? null,
      death: p.death ?? null,
    };
    const created = await createPerson(input);
    ids.set(p.key, created.id);
    await createCitation({
      subjectTable: "person",
      subjectId: created.id,
      sourceId: sourceIds[p.source],
      locator: null,
      quote: null,
      confidence: 3,
      stance: "supports",
    });
  }

  console.log(`Tạo ${polities.length} chính thể...`);
  for (const pol of polities) {
    const input: PolityInput = {
      names: [{ name: pol.name, kind: "common", isPrimary: true, language: "vi" }],
      polityType: "lordship",
      summary: null,
      body: null,
      attributes: [],
      started: pol.started ?? null,
      ended: pol.ended ?? null,
    };
    const created = await createPolity(input);
    ids.set(pol.key, created.id);
    ids.set(`slug:${created.slug}`, created.id);
  }

  console.log(`Tạo ${tenures.length} chức vụ...`);
  for (const t of tenures) {
    const personId = ids.get(t.personKey);
    const polityId = ids.get(t.polityKey);
    if (!personId) throw new Error(`Thiếu person id cho key=${t.personKey}`);
    if (!polityId) throw new Error(`Thiếu polity id cho key=${t.polityKey}`);
    await createTenure({
      personId,
      polityId,
      officeType: t.officeType,
      successionMode: t.successionMode ?? null,
      start: t.start ?? null,
      end: t.end ?? null,
      seq: t.seq ?? null,
      disputed: false,
      note: null,
      state: "accepted",
      eras: (t.eras ?? []).map((e) => ({
        name: e.name,
        start: e.start ?? null,
        end: e.end ?? null,
      })),
    });
  }

  console.log(`Tạo ${relations.length} quan hệ...`);
  for (const r of relations) {
    const fromId = r.from.startsWith("slug:") ? ids.get(r.from) : ids.get(r.from);
    const toId = r.to.startsWith("slug:") ? ids.get(r.to) : ids.get(r.to);
    if (!fromId) throw new Error(`Thiếu id cho relation.from=${r.from}`);
    if (!toId) throw new Error(`Thiếu id cho relation.to=${r.to}`);
    await createRelationship({
      type: r.type,
      fromId,
      toId,
      variant: r.variant ?? null,
      label: null,
      note: r.note ?? null,
      disputed: false,
      disputeNote: null,
      importance: 3,
      start: null,
      end: null,
    });
  }

  console.log("Hoàn tất migrate.");
  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
