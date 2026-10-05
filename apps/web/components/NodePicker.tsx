"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { SearchResult } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4200";

type Props = {
  name: string;
  label: string;
  initial?: { slug: string; name: string };
  /** When given, the picker reports the choice instead of acting as a form field. */
  onSelect?: (result: SearchResult) => void;
};

// Type-ahead picker that stores the chosen slug in a hidden input, so it works inside a plain GET form.
export function NodePicker({ name, label, initial, onSelect }: Props) {
  const [chosen, setChosen] = useState(initial ?? null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setResults(await res.json());
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="relative flex-1">
      <label className="text-muted-foreground mb-1 block text-sm">{label}</label>
      {chosen ? (
        <div className="bg-card flex h-11 items-center justify-between rounded-xl border px-3.5">
          <span className="font-medium">{chosen.name}</span>
          <input type="hidden" name={name} value={chosen.slug} />
          <button
            type="button"
            aria-label="Bỏ chọn"
            onClick={() => setChosen(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Gõ tên để tìm..."
            className="border-input bg-background focus:border-ring focus:ring-ring/25 h-11 w-full rounded-xl border px-3.5 outline-none transition focus:ring-4"
          />
          {open && results.length > 0 && (
            <ul className="bg-popover absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border shadow-lg">
              {results.slice(0, 8).map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="hover:bg-muted flex w-full items-center justify-between px-3 py-2 text-left text-sm"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setChosen({ slug: r.slug, name: r.name });
                      onSelect?.(r);
                      setQ("");
                      setOpen(false);
                    }}
                  >
                    {r.name}
                    <span className="text-muted-foreground text-xs">
                      {r.kind === "person" ? "Nhân vật" : "Chính thể"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
