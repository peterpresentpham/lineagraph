import { History, Landmark, Network, Route, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const nav: NavItem[] = [
  { href: "/persons", label: "Nhân vật", icon: Users },
  { href: "/polities", label: "Chính thể", icon: Landmark },
  { href: "/graph", label: "Sơ đồ", icon: Network },
  { href: "/relations", label: "Tìm quan hệ", icon: Route },
  { href: "/timeline", label: "Dòng thời gian", icon: History },
];
