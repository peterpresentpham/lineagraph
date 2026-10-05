"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { ThemeToggle, cn } from "@lineagraph/ui";
import { Logo } from "@/components/Logo";
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
          className="border-input bg-muted/60 placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:ring-ring/25 h-10 w-full rounded-xl border pl-9 pr-3 text-sm outline-none transition focus:ring-4"
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
    <header className="glass sticky top-0 z-30 border-b">
      <div className="h-header container-page flex items-center gap-3">
        <Logo className="md:hidden" />
        <div className="hidden w-full max-w-md md:block">
          <SearchForm />
        </div>
        <div className="ml-auto flex items-center">
          <ThemeToggle />
        </div>
      </div>
      <div className="px-gutter pb-2 md:hidden">
        <SearchForm />
      </div>
      <nav className="px-gutter flex gap-1 overflow-x-auto pb-2 md:hidden">
        {nav.map(({ href, label }) => {
          const active = pathname?.startsWith(href) ?? false;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "text-muted-foreground shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium no-underline",
                active && "bg-accent text-accent-foreground",
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
