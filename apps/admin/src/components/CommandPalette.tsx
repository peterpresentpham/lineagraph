import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle, Input } from "@lineagraph/ui";
import { api } from "../lib/api";
import { createActions, navItems } from "../lib/nav";

type Hit = { key: string; label: string; hint: string; to: string };

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

const useDebounced = <T,>(value: T, ms = 200) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

// Ctrl/Cmd+K: jump to any person, polity, event or place by name, or run a menu command.
export function CommandPalette({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const needle = useDebounced(q.trim());

  useEffect(() => {
    if (!open) {
      setQ("");
      setActive(0);
    }
  }, [open]);

  const { data: found } = useQuery({
    queryKey: ["palette", needle],
    enabled: open && needle.length >= 2,
    queryFn: async (): Promise<Hit[]> => {
      const enc = encodeURIComponent(needle);
      const [nodes, events, places] = await Promise.all([
        api.get<{ id: string; kind: "person" | "polity"; name: string }[]>(`/search?q=${enc}`),
        api.get<{ items: { id: string; name: string; eventTypeLabel: string }[] }>(
          `/events?q=${enc}&limit=5`,
        ),
        api.get<{ items: { id: string; name: string }[] }>(`/places?q=${enc}&limit=5`),
      ]);
      return [
        ...nodes.map((n) => ({
          key: `n-${n.id}`,
          label: n.name,
          hint: n.kind === "person" ? "Nhân vật" : "Chính thể",
          to: `/${n.kind === "person" ? "persons" : "polities"}/${n.id}`,
        })),
        ...events.items.map((e) => ({
          key: `e-${e.id}`,
          label: e.name,
          hint: e.eventTypeLabel,
          to: `/events/${e.id}`,
        })),
        ...places.items.map((p) => ({
          key: `p-${p.id}`,
          label: p.name,
          hint: "Địa điểm",
          to: `/places?q=${encodeURIComponent(p.name)}`,
        })),
      ];
    },
  });

  // Menu pages and "add" commands, filtered by what was typed (all of them when nothing is).
  const commands = useMemo<Hit[]>(() => {
    const all: Hit[] = [
      ...navItems.map((i) => ({ key: `go-${i.to}`, label: i.label, hint: "Mở trang", to: i.to })),
      ...createActions.map((a) => ({
        key: `new-${a.to}`,
        label: a.label,
        hint: "Tạo mới",
        to: a.to,
      })),
    ];
    const n = q.trim().toLowerCase();
    return n ? all.filter((c) => c.label.toLowerCase().includes(n)) : all;
  }, [q]);

  const items = [...(found ?? []), ...commands];
  const current = Math.min(active, Math.max(items.length - 1, 0));

  const go = (hit: Hit) => {
    onOpenChange(false);
    navigate(hit.to);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Tìm nhanh</DialogTitle>
        <DialogDescription className="sr-only">
          Gõ tên để nhảy tới nhân vật, chính thể, sự kiện hay địa điểm, hoặc chọn một lệnh.
        </DialogDescription>
        <Input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls="palette-list"
          placeholder="Tìm nhân vật, chính thể, sự kiện... hoặc gõ lệnh"
          className="rounded-b-none border-0 border-b"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive(Math.min(current + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive(Math.max(current - 1, 0));
            } else if (e.key === "Enter" && items[current]) {
              e.preventDefault();
              go(items[current]);
            }
          }}
        />
        <ul id="palette-list" role="listbox" className="max-h-80 overflow-y-auto p-1">
          {items.map((hit, i) => (
            <li
              key={hit.key}
              role="option"
              aria-selected={i === current}
              className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${i === current ? "bg-accent" : ""}`}
              onMouseMove={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                go(hit);
              }}
            >
              <span>{hit.label}</span>
              <span className="text-muted-foreground text-xs">{hit.hint}</span>
            </li>
          ))}
          {items.length === 0 && (
            <li className="text-muted-foreground px-3 py-6 text-center text-sm">Không tìm thấy</li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
