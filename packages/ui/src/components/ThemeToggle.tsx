"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";

type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "lineagraph.theme";
const order: Theme[] = ["system", "light", "dark"];
const labels: Record<Theme, string> = { system: "Theo hệ thống", light: "Sáng", dark: "Tối" };
const icons = { system: Monitor, light: Sun, dark: Moon };

// Inline this in <head> (before first paint) so the saved theme applies without a flash.
export const themeInitScript = `try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

type Props = { className?: string };

// Cycles system -> light -> dark. "system" follows the OS (prefers-color-scheme).
export function ThemeToggle({ className }: Props) {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {
      // Storage can be blocked (private mode); the toggle still works for this visit.
    }
  }, []);

  const next = () => {
    const value = order[(order.indexOf(theme) + 1) % order.length]!;
    setTheme(value);
    apply(value);
    try {
      if (value === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
  };

  const Icon = icons[theme];
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={next}
      title={`Giao diện: ${labels[theme]} (bấm để đổi)`}
      aria-label={`Giao diện: ${labels[theme]}`}
    >
      <Icon />
    </Button>
  );
}
