import {
  BookOpen,
  Landmark,
  LayoutDashboard,
  Link2,
  MapPin,
  Settings2,
  ShieldCheck,
  Swords,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match the exact path only (the dashboard). */
  end?: boolean;
  /** Other path prefixes that belong to this section (a person's page sits under "Nhân vật"). */
  also?: string[];
};

export type NavGroup = { label: string | null; items: NavItem[] };

// Four places to add and edit content, one to check it, one for the rarely used settings.
export const navGroups: NavGroup[] = [
  {
    label: null,
    items: [{ to: "/", label: "Tổng quan", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Nội dung",
    items: [
      { to: "/persons", label: "Nhân vật", icon: Users },
      { to: "/polities", label: "Chính thể", icon: Landmark },
      { to: "/events", label: "Sự kiện", icon: Swords },
      { to: "/places", label: "Địa điểm", icon: MapPin },
      { to: "/links", label: "Quan hệ & chức vụ", icon: Link2 },
    ],
  },
  {
    label: "Tư liệu",
    items: [{ to: "/sources", label: "Nguồn tư liệu", icon: BookOpen }],
  },
  {
    label: "Hệ thống",
    items: [
      { to: "/quality", label: "Chất lượng dữ liệu", icon: ShieldCheck },
      { to: "/settings", label: "Cài đặt", icon: Settings2 },
    ],
  },
];

export const navItems = navGroups.flatMap((g) => g.items);

/** Things the "+ Thêm" menu and the command palette can create. */
export const createActions: { label: string; to: string }[] = [
  { label: "Thêm nhân vật", to: "/persons/new" },
  { label: "Thêm chính thể", to: "/polities/new" },
  { label: "Thêm sự kiện", to: "/events/new" },
  { label: "Thêm địa điểm", to: "/places?new=1" },
  { label: "Thêm quan hệ", to: "/links?tab=relations&new=1" },
  { label: "Thêm nguồn tư liệu", to: "/sources?new=1" },
];

/** The section of the app a path belongs to, for the breadcrumb and the active menu item. */
export const sectionOf = (pathname: string): NavItem | undefined =>
  navItems.find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)));
