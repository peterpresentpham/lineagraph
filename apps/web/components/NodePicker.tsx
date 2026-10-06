"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { PUBLIC_API_URL } from "@/lib/site";
import type { SearchResult } from "@/lib/types";

const MAX_OPTIONS = 8;

type Props = {
  name: string;
  label: string;
  initial?: { slug: string; name: string };
  /** When given, the picker reports the choice instead of acting as a form field. */
  onSelect?: (result: SearchResult) => void;
};

type Status = "idle" | "loading" | "error" | "done";

// Type-ahead picker that stores the chosen slug in a hidden input, so it works inside a plain GET
// form. It is an ARIA combobox: arrow keys move through the options, Enter picks one, Escape closes.
export function NodePicker({ name, label, initial, onSelect }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [chosen, setChosen] = useState(initial ?? null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    request.current?.abort();
    if (!q.trim()) {
      setResults([]);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${PUBLIC_API_URL}/search?q=${encodeURIComponent(q)}&kinds=person,polity`,
          {
            signal: controller.signal,
          },
        );
        if (!res.ok) throw new Error(String(res.status));
        setResults((await res.json()) as SearchResult[]);
        setActive(-1);
        setStatus("done");
      } catch {
        // An aborted request is a newer keystroke taking over, not an error to show.
        if (!controller.signal.aborted) setStatus("error");
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const shown = results.slice(0, MAX_OPTIONS);

  const pick = (r: SearchResult) => {
    setChosen({ slug: r.slug, name: r.name });
    onSelect?.(r);
    setQ("");
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (shown.length ? (i + 1) % shown.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (shown.length ? (i <= 0 ? shown.length - 1 : i - 1) : -1));
    } else if (e.key === "Enter" && open && active >= 0 && shown[active]) {
      // Choosing an option must not also submit the surrounding form.
      e.preventDefault();
      pick(shown[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const message =
    status === "loading"
      ? "Đang tìm..."
      : status === "error"
        ? "Không tìm được lúc này, thử lại."
        : status === "done" && shown.length === 0
          ? "Không có kết quả."
          : null;
  const expanded = open && (shown.length > 0 || message !== null) && q.trim() !== "";

  return (
    <div className="relative flex-1">
      <label htmlFor={`${id}-input`} className="text-muted-foreground mb-1 block text-sm">
        {label}
      </label>
      {chosen ? (
        <div className="bg-card flex h-11 items-center justify-between rounded-xl border px-3.5">
          <span className="font-medium">{chosen.name}</span>
          <input type="hidden" name={name} value={chosen.slug} />
          <button
            type="button"
            aria-label={`Bỏ chọn ${chosen.name}`}
            onClick={() => setChosen(null)}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring grid size-8 place-items-center rounded-md outline-none focus-visible:ring-2"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <>
          <input
            id={`${id}-input`}
            role="combobox"
            aria-expanded={expanded}
            aria-controls={listId}
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
            placeholder="Gõ tên để tìm..."
            className="border-input bg-background focus:border-ring focus:ring-ring/25 h-11 w-full rounded-xl border px-3.5 outline-none transition focus:ring-4"
          />
          {expanded && (
            // Pressing an option must not blur the input first, or the list would close under the
            // pointer before the click lands.
            <ul
              id={listId}
              role="listbox"
              aria-label={label}
              onMouseDown={(e) => e.preventDefault()}
              className="bg-popover absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border shadow-lg"
            >
              {shown.map((r, i) => (
                <li
                  key={r.id}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onClick={() => pick(r)}
                  className={`flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm ${i === active ? "bg-muted" : "hover:bg-muted"}`}
                >
                  {r.name}
                  <span className="text-muted-foreground text-xs">
                    {r.kind === "person" ? "Nhân vật" : "Chính thể"}
                  </span>
                </li>
              ))}
              {message && shown.length === 0 && (
                <li role="status" className="text-muted-foreground px-3 py-2.5 text-sm">
                  {message}
                </li>
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
