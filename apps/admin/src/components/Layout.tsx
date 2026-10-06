import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  ThemeToggle,
  cn,
} from "@lineagraph/ui";
import { useAuth } from "../lib/auth";
import { navGroups } from "../lib/nav";
import { CommandPalette } from "./CommandPalette";
import { QuickAdd } from "./QuickAdd";

const STORAGE_KEY = "lineagraph.sidebar-collapsed";

type SidebarNavProps = {
  collapsed?: boolean;
  /** Called after a link is followed (closes the mobile drawer). */
  onNavigate?: () => void;
};

// The grouped menu, shared by the desktop sidebar and the mobile drawer.
function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto" aria-label="Menu chính">
      {navGroups.map((group, i) => (
        <div key={group.label ?? i} className="flex flex-col gap-0.5">
          {group.label && !collapsed && (
            <div className="text-muted-foreground px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider">
              {group.label}
            </div>
          )}
          {group.items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  isActive && "bg-accent text-foreground",
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function Layout() {
  const { email, loading, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Storage can be blocked (private mode); the sidebar just stays expanded.
    }
  }, []);

  // Ctrl/Cmd+K opens the quick search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // A new page starts at the top, whichever list or record the admin was scrolled down in.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  if (loading) return null;
  if (!email) return <Navigate to="/login" replace />;

  const toggle = () =>
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "bg-card sticky top-0 hidden h-screen shrink-0 flex-col border-r p-3 transition-[width] duration-150 md:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-2 pb-5 pt-2">
          {!collapsed && (
            <div>
              <div className="font-serif text-lg font-semibold">Sử Phả</div>
              <div className="text-muted-foreground text-xs">Quản trị</div>
            </div>
          )}
          <button
            type="button"
            onClick={toggle}
            title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-sm p-1.5 transition-colors"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>
        <SidebarNav collapsed={collapsed} />
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-72 p-3 md:hidden">
          <SheetTitle className="px-2 pt-2 font-serif text-lg">Sử Phả</SheetTitle>
          <SheetDescription className="sr-only">Menu quản trị</SheetDescription>
          <div className="mt-3 flex flex-1 flex-col overflow-y-auto">
            <SidebarNav onNavigate={() => setDrawerOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-t-primary bg-card/95 sticky top-0 z-30 border-b border-t-[3px] backdrop-blur">
          <div className="flex h-14 items-center gap-2 px-3 md:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Mở menu"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu />
            </Button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="text-muted-foreground hover:bg-muted md:basis-md flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 text-left text-sm transition-colors md:max-w-md md:flex-none"
              aria-label="Tìm nhanh (Ctrl K)"
            >
              <Search className="size-4 shrink-0" />
              <span className="truncate">Tìm nhân vật, chính thể, sự kiện...</span>
              <kbd className="bg-muted ml-auto hidden rounded px-1.5 py-0.5 text-[11px] sm:block">
                ⌘K
              </kbd>
            </button>
            <div className="ml-auto flex items-center gap-1">
              <QuickAdd />
              <ThemeToggle />
              <span className="bg-border mx-2 hidden h-5 w-px sm:block" />
              <span className="text-muted-foreground hidden max-w-48 truncate text-sm lg:block">
                {email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <LogOut />
                <span className="hidden text-xs lg:inline">Đăng xuất</span>
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
