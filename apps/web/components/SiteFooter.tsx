import Link from "next/link";

const links = [
  { href: "/gioi-thieu", label: "Giới thiệu" },
  { href: "/nguon", label: "Nguồn tư liệu" },
  { href: "/bao-loi", label: "Báo lỗi" },
  { href: "/quyen-rieng-tu", label: "Quyền riêng tư" },
  { href: "/dieu-khoan", label: "Điều khoản" },
];

export function SiteFooter() {
  return (
    <footer className="container-page text-muted-foreground border-t py-8 text-sm">
      <nav aria-label="Thông tin về trang" className="flex flex-wrap gap-x-6 gap-y-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-foreground underline">
            {l.label}
          </Link>
        ))}
      </nav>
      <p className="mt-4">Sử Phả · Lịch sử thế giới qua từng dòng phả hệ.</p>
      <p className="mt-1">
        Dữ liệu được chia sẻ theo giấy phép{" "}
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0/deed.vi"
          rel="license noreferrer"
          className="hover:text-foreground underline"
        >
          CC BY-SA 4.0
        </a>
        . Xem cách ghi nguồn ở trang{" "}
        <Link href="/gioi-thieu#giay-phep" className="hover:text-foreground underline">
          Giới thiệu
        </Link>
        .
      </p>
    </footer>
  );
}
