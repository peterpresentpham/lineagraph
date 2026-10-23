import Link from "next/link";
import { Logo } from "@/components/Logo";
import { nav } from "@/lib/nav";

const about = [
  { href: "/gioi-thieu", label: "Giới thiệu" },
  { href: "/nguon", label: "Nguồn tư liệu" },
  { href: "/bao-loi", label: "Báo lỗi" },
];
const legal = [
  { href: "/quyen-rieng-tu", label: "Quyền riêng tư" },
  { href: "/dieu-khoan", label: "Điều khoản" },
];

type ColumnProps = { title: string; links: { href: string; label: string }[] };

function Column({ title, links }: ColumnProps) {
  return (
    <div>
      <h2 className="text-night-200 font-sans text-xs font-semibold uppercase tracking-[0.16em]">
        {title}
      </h2>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-night-50 hover:text-gold-300 text-sm no-underline hover:underline"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-ink mt-24 print:mt-8 print:bg-transparent print:text-black">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo onDark />
            <p className="text-night-200 mt-4 text-sm leading-relaxed">
              Học lịch sử thế giới qua từng dòng phả hệ: ai là cha của ai, ai kế vị ai, và hai người
              có họ hàng thế nào.
            </p>
          </div>
          <Column
            title="Khám phá"
            links={[
              ...nav.map(({ href, label }) => ({ href, label })),
              { href: "/hom-nay", label: "Hôm nay" },
            ]}
          />
          <Column title="Về Sử Phả" links={about} />
          <Column title="Pháp lý" links={legal} />
        </div>
        <div className="rule-gold mt-12" />
        <p className="text-night-200 mt-6 text-sm">
          Dữ liệu được chia sẻ theo giấy phép{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/deed.vi"
            rel="license noreferrer"
            className="text-night-50 hover:text-gold-300 underline"
          >
            CC BY-SA 4.0
          </a>
          . Xem cách ghi nguồn ở trang{" "}
          <Link
            href="/gioi-thieu#giay-phep"
            className="text-night-50 hover:text-gold-300 underline"
          >
            Giới thiệu
          </Link>
          .
        </p>
      </div>
    </footer>
  );
}
