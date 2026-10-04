"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@lineagraph/ui";
import { nav } from "@/lib/nav";

const STORAGE_KEY = "lineagraph.sidebar-collapsed";

// Desktop-only left rail (collapsible, state remembered per-browser). On narrow screens this
// is hidden and SiteHeader's mobile strip takes over navigation instead.
export function SiteSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Storage can be blocked (private mode); the sidebar just stays expanded.
    }
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

  const linkClass = (active: boolean) =>
    cn(
      "text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm font-medium no-underline transition-colors",
      collapsed && "justify-center px-0",
      active && "bg-accent text-foreground",
    );

  return (
    <aside
      className={cn(
        "bg-card sticky top-0 hidden h-screen shrink-0 flex-col border-r p-3 transition-[width] duration-150 md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-1 pb-5 pt-2">
        {!collapsed && (
          <Link href="/" className="text-foreground font-serif text-lg font-semibold no-underline">
            Sử Phả
          </Link>
        )}
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-sm p-1.5 transition-colors"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href) ?? false;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={linkClass(active)}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
