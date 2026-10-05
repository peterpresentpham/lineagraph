// One-off content fill: introduction (summary) and history (body) for the Vietnamese polities
// that were created without them: Nhà Hậu Lê, Chúa Trịnh, Chúa Nguyễn.
// Safe to re-run: a polity that already has a summary or a body is left untouched.
//
// Run with: pnpm db:describe-polities
//
// Sourcing note: facts were summarised from Vietnamese Wikipedia (Nhà Hậu Lê, Chúa Trịnh,
// Chúa Nguyễn) and are general-knowledge level, not quotations from the primary chronicles.

import { sql } from "../db";
import { getPolityForEdit, updatePolity } from "../index";

const texts: Record<string, { summary: string; body: string }> = {
  "nha-hau-le": {
    summary:
      "Triều đại do Lê Lợi lập năm 1428 sau khi đánh đuổi quân Minh, tồn tại tới năm 1789. Gồm hai giai đoạn: Lê Sơ thịnh trị (1428–1527) và Lê Trung Hưng (1533–1789), khi vua Lê chỉ còn là hình thức còn quyền thật nằm trong tay chúa Trịnh.",
    body:
      "Lê Lợi khởi nghĩa ở Lam Sơn năm 1418, đánh bại quân Minh và lên ngôi hoàng đế năm 1428, đặt quốc hiệu Đại Việt, đóng đô ở Đông Kinh (Thăng Long). Giai đoạn đầu, gọi là Lê Sơ, kéo dài khoảng 99 năm. Đỉnh cao là thời Lê Thánh Tông (1460–1497) với niên hiệu Hồng Đức: bộ máy hành chính được cải cách, giáo dục và khoa cử phát triển, ban hành bộ luật Hồng Đức và mở rộng lãnh thổ về phía nam.\n\n" +
      "Sang đầu thế kỷ 16, triều đình suy yếu vì các vua Uy Mục, Tương Dực và các cuộc tranh giành trong hoàng tộc, cùng quyền thần. Năm 1527 Mạc Đăng Dung cướp ngôi, lập nhà Mạc, chấm dứt thời Lê Sơ. Năm 1533, cựu thần Nguyễn Kim tôn Lê Trang Tông lên ngôi ở vùng Thanh Hóa, mở đầu thời Lê Trung Hưng, và hai bên Nam triều (Lê) và Bắc triều (Mạc) đánh nhau nhiều năm. Đến cuối thế kỷ 16 họ Trịnh thay họ Nguyễn nắm quyền Nam triều, đánh bại nhà Mạc và đưa vua Lê về Thăng Long.\n\n" +
      "Từ đó các vua Lê chỉ còn là hình thức, quyền hành thực tế thuộc phủ chúa Trịnh ở phía bắc, trong khi chúa Nguyễn cát cứ phía nam. Phong trào Tây Sơn nổi lên từ năm 1771 làm sụp đổ cả hai họ chúa. Vua Lê Chiêu Thống cầu viện nhà Thanh, và năm 1789 Nguyễn Huệ đại phá quân Thanh, nhà Hậu Lê chính thức chấm dứt.",
  },
  "chua-trinh": {
    summary:
      "Chính quyền do họ Trịnh dựng, nắm thực quyền ở Đàng Ngoài (miền Bắc) trong khi vua Lê chỉ còn là hình thức. Họ Trịnh có quyền lực từ năm 1545 và chính thức xưng chúa từ Trịnh Tùng năm 1599, tồn tại tới năm 1787.",
    body:
      'Sau khi Nguyễn Kim mất năm 1545, con rể là Trịnh Kiểm nắm quyền điều hành triều Lê Trung Hưng và tiếp tục đánh nhà Mạc. Đến năm 1592–1593 họ Trịnh chiếm lại Thăng Long, đưa vua Lê về kinh. Trịnh Tùng, con Trịnh Kiểm, được phong tước vương và chính thức xưng chúa từ năm 1599. Từ đó có chế độ "vua Lê, chúa Trịnh": vua giữ ngôi nhưng không có thực quyền, chúa dựng phủ riêng và truyền ngôi cho con cháu.\n\n' +
      "Từ năm 1627 đến 1672, chúa Trịnh và chúa Nguyễn ở phía nam đánh nhau bảy lần nhưng không phân thắng bại, rồi chia đôi đất nước ở sông Gianh. Sang thế kỷ 18, thời Trịnh Giang (1729–1740) chính sự rối loạn, thuế nặng khiến nông dân nổi dậy khắp nơi. Trịnh Doanh (1740–1767) lập lại trật tự, và Trịnh Sâm có thời kỳ cai trị mạnh nhưng về sau để lại họa kiêu binh và tranh chấp nối ngôi.\n\n" +
      "Từ năm 1771 phong trào Tây Sơn nổi lên. Năm 1786 Nguyễn Huệ đem quân ra Bắc, và chúa cuối cùng là Trịnh Khải bị đánh bại, chấm dứt quyền lực của họ Trịnh sau hơn hai thế kỷ. Số đời chúa được tính là 11 hoặc 12 tuỳ cách có tính Trịnh Kiểm và Trịnh Cối hay không.",
  },
  "chua-nguyen": {
    summary:
      "Chính quyền do họ Nguyễn dựng, cai quản Đàng Trong (miền Nam) từ năm 1558, tách biệt với chúa Trịnh ở phía bắc. Qua chín đời chúa, vùng đất này mở rộng đến đồng bằng sông Cửu Long cho đến khi bị Tây Sơn lật đổ năm 1777.",
    body:
      "Năm 1558, Nguyễn Hoàng, con của Nguyễn Kim và em vợ Trịnh Kiểm, xin vào trấn thủ vùng Thuận Hóa để tránh sự nghi kỵ của họ Trịnh. Ông và các đời sau xây dựng một vùng đất gần như tự trị ở phía nam sông Gianh, trên danh nghĩa vẫn thần phục vua Lê. Từ năm 1627 đến 1672, hai họ Trịnh và Nguyễn đánh nhau bảy lần rồi chia nhau hai bên bờ sông Gianh.\n\n" +
      "Trong khi giữ thế phòng thủ ở phía bắc, chúa Nguyễn liên tục mở rộng về phương nam: lấn dần đất Chiêm Thành, khai khẩn vùng Nam Bộ, can thiệp vào Chân Lạp, và tiếp nhận vùng Hà Tiên. Năm 1744, Nguyễn Phúc Khoát xưng vương, đặt kinh đô ở Phú Xuân và khẳng định địa vị ngang hàng với chúa Trịnh.\n\n" +
      "Về cuối, quyền thần Trương Phúc Loan lộng quyền, thuế nặng khiến lòng dân oán thán. Năm 1771 khởi nghĩa Tây Sơn nổ ra ở Quy Nhơn, và đến năm 1777 Tây Sơn tiêu diệt chính quyền chúa Nguyễn ở Gia Định. Nguyễn Phúc Ánh, người sống sót của họ Nguyễn, sau đó khôi phục lại và lập nên triều Nguyễn năm 1802, nên các nguồn có khi tính họ Nguyễn đến 1802.",
  },
};

async function main() {
  for (const [slug, text] of Object.entries(texts)) {
    const current = await getPolityForEdit(slug);
    if (current.summary || current.body) {
      console.log(`Bỏ qua ${slug}: đã có giới thiệu hoặc lịch sử.`);
      continue;
    }
    await updatePolity(current.id, { ...current, summary: text.summary, body: text.body });
    console.log(`Đã cập nhật ${slug}.`);
  }
  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
