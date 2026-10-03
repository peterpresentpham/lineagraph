import Link from "next/link";
import { Search } from "lucide-react";
import { ThemeToggle } from "@lineagraph/ui";

const nav = [
  { href: "/persons", label: "Nhân vật" },
  { href: "/polities", label: "Chính thể" },
  { href: "/graph", label: "Sơ đồ" },
  { href: "/relations", label: "Tìm quan hệ" },
  { href: "/timeline", label: "Dòng thời gian" },
];

export function SiteHeader() {
  return (
    <header className="border-t-primary bg-card/95 sticky top-0 z-40 border-b border-t-[3px] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-6 px-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="text-foreground font-serif text-xl font-semibold tracking-wide no-underline"
        >
          Sử Phả
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-sm px-3 py-1.5 text-sm font-medium no-underline transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action="/search" className="ml-auto flex w-full max-w-xs items-center">
          <label className="relative w-full">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <input
              name="q"
              type="search"
              placeholder="Tìm nhân vật, triều đại..."
              className="border-input bg-background focus:border-primary h-10 w-full rounded-sm border pl-9 pr-4 text-sm outline-none"
            />
          </label>
        </form>
        <ThemeToggle />
      </div>
    </header>
  );
}
