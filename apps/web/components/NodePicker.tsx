"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { SearchResult } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Type-ahead picker that stores the chosen slug in a hidden input, so it works inside a plain GET form.
export function NodePicker({
  name,
  label,
  initial,
  onSelect,
}: {
  name: string;
  label: string;
  initial?: { slug: string; name: string };
  /** When given, the picker reports the choice instead of acting as a form field. */
  onSelect?: (result: SearchResult) => void;
}) {
  const [chosen, setChosen] = useState(initial ?? null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.trim().length < 1) { setResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setResults(await res.json());
      } catch { setResults([]); }
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="relative flex-1">
      <label className="mb-1 block text-sm text-muted-foreground">{label}</label>
      {chosen ? (
        <div className="flex h-11 items-center justify-between rounded-md border bg-card px-3">
          <span className="font-medium">{chosen.name}</span>
          <input type="hidden" name={name} value={chosen.slug} />
          <button type="button" aria-label="Bỏ chọn" onClick={() => setChosen(null)} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Gõ tên để tìm..."
            className="h-11 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary"
          />
          {open && results.length > 0 && (
            <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
              {results.slice(0, 8).map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setChosen({ slug: r.slug, name: r.name });
                      onSelect?.(r);
                      setQ("");
                      setOpen(false);
                    }}
                  >
                    {r.name}
                    <span className="text-xs text-muted-foreground">{r.kind === "person" ? "Nhân vật" : "Chính thể"}</span>
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
