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
    <header className="sticky top-0 z-40 border-t-[3px] border-t-primary border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-6 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="font-serif text-xl font-semibold tracking-wide text-foreground no-underline">
          Sử Phả
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-sm px-3 py-1.5 text-sm font-medium text-muted-foreground no-underline transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action="/search" className="ml-auto flex w-full max-w-xs items-center">
          <label className="relative w-full">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              type="search"
              placeholder="Tìm nhân vật, triều đại..."
              className="h-10 w-full rounded-sm border border-input bg-background pr-4 pl-9 text-sm outline-none focus:border-primary"
            />
          </label>
        </form>
        <ThemeToggle />
      </div>
    </header>
  );
}
