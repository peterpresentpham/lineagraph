"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle, cn } from "@lineagraph/ui";
import { Logo } from "@/components/Logo";
import { SearchBox } from "@/components/SearchBox";
import { isActive, nav } from "@/lib/nav";

// Top bar next to SiteSidebar. On narrow screens the sidebar is hidden, so this also carries
// the brand and a horizontal nav strip (mirrors apps/admin's header + sidebar structure).
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="glass sticky top-0 z-30 border-b print:hidden">
      <div className="h-header container-page flex items-center gap-3">
        <Logo className="md:hidden" />
        <div className="hidden w-full max-w-md md:block">
          <SearchBox />
        </div>
        <div className="ml-auto flex items-center">
          <ThemeToggle />
        </div>
      </div>
      <div className="px-gutter pb-2 md:hidden">
        <SearchBox />
      </div>
      <nav
        aria-label="Điều hướng chính"
        className="px-gutter flex gap-1 overflow-x-auto pb-2 md:hidden"
      >
        {nav.map((item) => {
          const { href, label } = item;
          const active = isActive(pathname, item);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
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
