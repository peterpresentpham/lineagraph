import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Input } from "@lineagraph/ui";
import { api } from "../lib/api";
import type { EventSummary } from "../lib/types";

type Props = {
  value: string | null | undefined;
  /** Name shown while the value was loaded from the server. */
  selectedName?: string | null;
  onChange: (id: string | null, name: string | null) => void;
  /** An event that cannot be chosen (an event cannot be its own parent). */
  exclude?: string;
};

// Search-as-you-type picker for events (used to nest a battle inside a war).
export function EventPicker({ value, selectedName, onChange, exclude }: Props) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null | undefined>(selectedName);
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["event-picker", q],
    enabled: open,
    queryFn: () => api.get<{ items: EventSummary[] }>(`/events?limit=8&q=${encodeURIComponent(q)}`),
  });

  if (value && (picked || selectedName)) {
    return (
      <div className="bg-muted flex h-11 items-center justify-between rounded-xl border px-3 text-[15px]">
        <span>{picked ?? selectedName}</span>
        <button
          type="button"
          aria-label="Bỏ chọn sự kiện"
          onClick={() => {
            setPicked(null);
            onChange(null, null);
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }
  const options = (data?.items ?? []).filter((e) => e.id !== exclude);
  return (
    <div className="relative">
      <Input
        placeholder="Gõ tên sự kiện để tìm..."
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="bg-popover absolute z-50 mt-1 w-full overflow-hidden rounded-xl border shadow-lg">
          {options.length ? (
            options.map((e) => (
              <button
                type="button"
                key={e.id}
                className="hover:bg-muted flex w-full items-center justify-between px-3 py-2 text-left text-sm"
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  setPicked(e.name);
                  setQ("");
                  setOpen(false);
                  onChange(e.id, e.name);
                }}
              >
                <span>{e.name}</span>
                <span className="text-muted-foreground text-xs">{e.eventTypeLabel}</span>
              </button>
            ))
          ) : (
            <div className="text-muted-foreground px-3 py-2 text-sm">Không tìm thấy</div>
          )}
        </div>
      )}
    </div>
  );
}
