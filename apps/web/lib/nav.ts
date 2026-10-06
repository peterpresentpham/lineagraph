import { History, Landmark, Network, Route, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra path prefixes that belong to this section (a person page sits under "Nhân vật"). */
  also?: string[];
};

export const nav: NavItem[] = [
  { href: "/persons", label: "Nhân vật", icon: Users, also: ["/person/"] },
  { href: "/polities", label: "Chính thể", icon: Landmark, also: ["/polity/"] },
  { href: "/graph", label: "Sơ đồ", icon: Network },
  { href: "/relations", label: "Tìm quan hệ", icon: Route },
  { href: "/timeline", label: "Dòng thời gian", icon: History },
];

/** Whether the current path is inside this nav section, detail pages included. */
export const isActive = (pathname: string | null, item: NavItem) =>
  !!pathname && [item.href, ...(item.also ?? [])].some((p) => pathname.startsWith(p));
