import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet } from "react-router-dom";
import {
  BookOpen,
  GitFork,
  ShieldCheck,
  Landmark,
  LayoutDashboard,
  LogOut,
  MapPin,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  Users,
} from "lucide-react";
import { Button, ThemeToggle, cn } from "@lineagraph/ui";
import { useAuth } from "../lib/auth";

const nav = [
  { to: "/", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/persons", label: "Nhân vật", icon: Users },
  { to: "/polities", label: "Chính thể", icon: Landmark },
  { to: "/places", label: "Địa điểm", icon: MapPin },
  { to: "/relationships", label: "Quan hệ", icon: Network },
  { to: "/relation-types", label: "Loại quan hệ", icon: GitFork },
  { to: "/sources", label: "Nguồn tư liệu", icon: BookOpen },
  { to: "/consistency", label: "Kiểm tra dữ liệu", icon: ShieldCheck },
  { to: "/registries", label: "Danh mục", icon: Settings2 },
];

const STORAGE_KEY = "lineagraph.sidebar-collapsed";

export function Layout() {
  const { email, loading, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Storage can be blocked (private mode); the sidebar just stays expanded.
    }
  }, []);

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

  const navLinkClass = (isActive: boolean) =>
    cn(
      "text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm font-medium transition-colors",
      collapsed && "justify-center px-0",
      isActive && "bg-accent text-foreground",
    );

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
        <nav className="flex flex-1 flex-col gap-0.5">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-t-primary bg-card/95 sticky top-0 z-30 border-b border-t-[3px] backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-8">
            <span className="font-serif text-lg font-semibold md:hidden">Sử Phả</span>
            <span className="text-muted-foreground hidden text-sm md:block">Trang quản trị</span>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <span className="bg-border mx-2 hidden h-5 w-px sm:block" />
              <span className="text-muted-foreground hidden max-w-48 truncate text-sm sm:block">
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
                <span className="hidden text-xs sm:inline">Đăng xuất</span>
              </Button>
            </div>
          </div>
          {/* Narrow screens have no sidebar: the menu becomes a scrollable strip. */}
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
            {nav.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "text-muted-foreground shrink-0 rounded-sm px-3 py-1.5 text-sm font-medium",
                    isActive && "bg-accent text-foreground",
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
