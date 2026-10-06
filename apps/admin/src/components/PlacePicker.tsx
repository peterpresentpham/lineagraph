import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Input, toast } from "@lineagraph/ui";
import { api } from "../lib/api";
import { errorMessage } from "../lib/hooks";
import type { PlaceSummary } from "../lib/types";

type Props = {
  value: string | null | undefined;
  /** Name shown while the value was loaded from the server. */
  selectedName?: string | null;
  onChange: (id: string | null, name: string | null) => void;
  /** A place that cannot be chosen (a place cannot be its own parent). */
  exclude?: string;
  placeholder?: string;
};

// Search-as-you-type picker for places.
export function PlacePicker({
  value,
  selectedName,
  onChange,
  exclude,
  placeholder = "Gõ tên địa điểm để tìm...",
}: Props) {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null | undefined>(selectedName);
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["place-picker", q],
    enabled: open,
    queryFn: () => api.get<{ items: PlaceSummary[] }>(`/places?limit=8&q=${encodeURIComponent(q)}`),
  });

  // A place that is not in the list yet is created from the typed name and selected.
  const create = async () => {
    const name = q.trim();
    if (!name) return;
    try {
      const { id } = await api.post<{ id: string }>("/places", { name });
      queryClient.invalidateQueries({ queryKey: ["places"] });
      queryClient.invalidateQueries({ queryKey: ["place-picker"] });
      toast.success(`Đã tạo địa điểm "${name}"`);
      setPicked(name);
      setQ("");
      setOpen(false);
      onChange(id, name);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  if (value && (picked || selectedName)) {
    return (
      <div className="bg-muted flex h-11 items-center justify-between rounded-xl border px-3 text-[15px]">
        <span>{picked ?? selectedName}</span>
        <button
          type="button"
          aria-label="Bỏ chọn địa điểm"
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
  const options = (data?.items ?? []).filter((p) => p.id !== exclude);
  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
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
            options.map((p) => (
              <button
                type="button"
                key={p.id}
                className="hover:bg-muted flex w-full items-center justify-between px-3 py-2 text-left text-sm"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setPicked(p.name);
                  setQ("");
                  setOpen(false);
                  onChange(p.id, p.name);
                }}
              >
                <span>{p.name}</span>
                {p.parent && <span className="text-muted-foreground text-xs">{p.parent.name}</span>}
              </button>
            ))
          ) : (
            <div className="text-muted-foreground px-3 py-2 text-sm">Không tìm thấy</div>
          )}
          {q.trim().length >= 2 && (
            <button
              type="button"
              className="hover:bg-muted flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm font-medium"
              onMouseDown={(e) => {
                e.preventDefault();
                void create();
              }}
            >
              <Plus className="size-4" />
              Tạo địa điểm “{q.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
