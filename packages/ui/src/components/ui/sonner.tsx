"use client";

import { Toaster as Sonner, toast, type ToasterProps } from "sonner";

// Toast host: render once near the app root. Colors follow the theme variables, so light and
// dark mode need no extra wiring. Call `toast.success(...)` / `toast.error(...)`.
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster, toast };
