"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { ThemeToggle, cn } from "@lineagraph/ui";
import { nav } from "@/lib/nav";

function SearchForm() {
  return (
    <form action="/search" className="w-full">
      <label className="relative block">
        <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <input
          name="q"
          type="search"
          placeholder="Tìm nhân vật, triều đại..."
          className="border-input bg-background focus:border-primary h-10 w-full rounded-sm border pl-9 pr-3 text-sm outline-none"
        />
      </label>
    </form>
  );
}

// Top bar next to SiteSidebar. On narrow screens the sidebar is hidden, so this also carries
// the brand and a horizontal nav strip (mirrors apps/admin's header + sidebar structure).
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="border-t-primary bg-card/95 sticky top-0 z-30 border-b border-t-[3px] backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 md:px-8">
        <Link
          href="/"
          className="text-foreground font-serif text-lg font-semibold no-underline md:hidden"
        >
          Sử Phả
        </Link>
        <div className="hidden w-full max-w-xs md:block">
          <SearchForm />
        </div>
        <div className="ml-auto flex items-center">
          <ThemeToggle />
        </div>
      </div>
      <div className="px-3 pb-2 md:hidden">
        <SearchForm />
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
        {nav.map(({ href, label }) => {
          const active = pathname?.startsWith(href) ?? false;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "text-muted-foreground shrink-0 rounded-sm px-3 py-1.5 text-sm font-medium no-underline",
                active && "bg-accent text-foreground",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
