import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

type Options = {
  /** Filter and sort names this list understands; anything else in the URL is left alone. */
  keys: string[];
  pageSize: number;
};

/**
 * The state of a list page (search text, filters, sort, page) kept in the URL, so a filtered list
 * survives a refresh, the back button after opening a record, and can be shared as a link.
 * Typing in the search box updates the field at once and the URL (and so the request) shortly after.
 */
export function useListState({ keys, pageSize }: Options) {
  const [params, setParams] = useSearchParams();
  const urlQ = params.get("q") ?? "";
  const [text, setText] = useState(urlQ);

  // Back/forward or a link into the list changes the URL under the box.
  useEffect(() => setText(urlQ), [urlQ]);

  const update = useCallback(
    (patch: Record<string, string | null>, resetPage = true) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v) next.set(k, v);
            else next.delete(k);
          }
          if (resetPage) next.delete("page");
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  useEffect(() => {
    if (text === urlQ) return;
    const t = setTimeout(() => update({ q: text }), 250);
    return () => clearTimeout(t);
  }, [text, urlQ, update]);

  const page = Math.max(1, Number(params.get("page")) || 1);
  const filters = Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ""]));
  const query = new URLSearchParams();
  if (urlQ) query.set("q", urlQ);
  for (const [k, v] of Object.entries(filters)) if (v) query.set(k, v);
  query.set("limit", String(pageSize));
  query.set("offset", String((page - 1) * pageSize));

  return {
    /** Current value of the search box. */
    text,
    setText,
    filters,
    setFilter: (key: string, value: string) => update({ [key]: value || null }),
    clearFilters: () => update({ q: null, ...Object.fromEntries(keys.map((k) => [k, null])) }),
    hasFilters: !!urlQ || Object.values(filters).some(Boolean),
    page,
    setPage: (p: number) => update({ page: p > 1 ? String(p) : null }, false),
    pageSize,
    /** Query string for the list endpoint: filters plus limit and offset. */
    query: query.toString(),
  };
}
