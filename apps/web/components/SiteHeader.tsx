"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle, cn } from "@lineagraph/ui";
import { Logo } from "@/components/Logo";
import { SearchBox } from "@/components/SearchBox";
import { isActive, nav } from "@/lib/nav";

// Top bar: brand, the sections of the site, search. On narrow screens the sections move to a
// scrolling strip under the bar and the search gets a row of its own.
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="glass sticky top-0 z-30 border-b print:hidden">
      <div className="container-page h-header flex items-center gap-4 lg:gap-8">
        <Logo />
        <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-muted-foreground hover:text-foreground relative rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors hover:no-underline",
                  active &&
                    "text-foreground after:bg-brand-gradient after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto hidden w-48 md:block xl:w-72">
          <SearchBox />
        </div>
        <ThemeToggle className="ml-auto md:ml-0" />
      </div>
      <div className="px-gutter pb-2 md:hidden">
        <SearchBox />
      </div>
      <nav
        aria-label="Điều hướng chính"
        className="px-gutter flex gap-1 overflow-x-auto pb-2 lg:hidden"
      >
        {nav.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "text-muted-foreground shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium no-underline",
                active && "bg-accent text-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
