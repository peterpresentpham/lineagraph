"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { PUBLIC_API_URL } from "@/lib/site";
import type { SearchResult } from "@/lib/types";
import { searchKindLabels } from "@/lib/labels";

const MAX_OPTIONS = 6;

// The search field of the site header: an ARIA combobox that suggests matches as you type. Enter
// with no option highlighted still submits the plain form, which lists every result.
export function SearchBox() {
  const id = useId();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    request.current?.abort();
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${PUBLIC_API_URL}/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        setResults((await res.json()) as SearchResult[]);
        setActive(-1);
      } catch {
        // Suggestions are a convenience; pressing Enter still searches.
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const shown = results.slice(0, MAX_OPTIONS);
  const expanded = open && shown.length > 0;
  const go = (r: SearchResult) => {
    setOpen(false);
    setQ("");
    router.push(`/${r.kind}/${r.slug}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (shown.length ? (i + 1) % shown.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (shown.length ? (i <= 0 ? shown.length - 1 : i - 1) : -1));
    } else if (e.key === "Enter" && expanded && active >= 0 && shown[active]) {
      e.preventDefault();
      go(shown[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <form action="/search" className="relative w-full">
      <label className="relative block">
        <span className="sr-only">Tìm nhân vật, chính thể hoặc sự kiện</span>
        <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <input
          name="q"
          type="search"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder="Tìm nhân vật, triều đại, sự kiện, năm..."
          className="border-input bg-muted/60 placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:ring-ring/25 h-10 w-full rounded-xl border pl-9 pr-3 text-sm outline-none transition focus:ring-4"
        />
      </label>
      {expanded && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label="Gợi ý"
          onMouseDown={(e) => e.preventDefault()}
          className="bg-popover absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl border shadow-lg"
        >
          {shown.map((r, i) => (
            <li
              key={r.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onClick={() => go(r)}
              className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm ${i === active ? "bg-muted" : "hover:bg-muted"}`}
            >
              {r.name}
              <span className="text-muted-foreground shrink-0 text-xs">
                {searchKindLabels[r.kind]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
