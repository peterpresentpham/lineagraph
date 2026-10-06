import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@lineagraph/ui";
import { createActions } from "../lib/nav";

// The "+ Thêm" button in the top bar: add anything from anywhere.
export function QuickAdd() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") setOpen(false);
      } else if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button size="sm" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        <Plus /> Thêm <ChevronDown className="opacity-70" />
      </Button>
      {open && (
        <div
          role="menu"
          className="bg-popover absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border p-1 shadow-lg"
        >
          {createActions.map((a) => (
            <button
              key={a.to}
              type="button"
              role="menuitem"
              className="hover:bg-muted focus-visible:bg-muted block w-full rounded-lg px-3 py-2 text-left text-sm outline-none"
              onClick={() => {
                setOpen(false);
                navigate(a.to);
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
