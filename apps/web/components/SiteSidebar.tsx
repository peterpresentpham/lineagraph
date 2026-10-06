"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@lineagraph/ui";
import { Logo } from "@/components/Logo";
import { isActive, nav } from "@/lib/nav";

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
      "text-muted-foreground hover:bg-muted hover:text-foreground relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium no-underline transition-colors hover:no-underline",
      collapsed && "justify-center px-0",
      active && "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground",
    );

  return (
    <aside
      className={cn(
        "bg-card/70 sticky top-0 hidden h-screen shrink-0 flex-col border-r p-3 transition-[width] duration-200 md:flex",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar",
      )}
    >
      <div className={cn("flex items-center gap-2 px-1 pb-6 pt-2", collapsed && "flex-col gap-3")}>
        <Logo showName={!collapsed} className="flex-1" />
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-1.5 transition-colors"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {nav.map((item) => {
          const { href, label, icon: Icon } = item;
          const active = isActive(pathname, item);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              aria-current={active ? "page" : undefined}
              className={linkClass(active)}
            >
              {active && (
                <span
                  className="bg-primary absolute -left-3 bottom-2 top-2 w-1 rounded-r-full"
                  aria-hidden
                />
              )}
              <Icon className={cn("size-[18px] shrink-0", active && "text-primary")} />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
