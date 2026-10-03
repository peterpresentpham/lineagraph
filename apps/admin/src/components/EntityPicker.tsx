import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Input } from "@lineagraph/ui";
import { api } from "../lib/api";
import { lifeSpan, nodeKindLabels } from "../lib/format";
import type { NodeKind, NodeRef, PersonSummary, PolitySummary } from "../lib/types";

type Option = { id: string; kind: NodeKind; name: string; detail?: string };

// Search-as-you-type picker for people and/or polities. `selectedName` is shown while editing
// a record whose selection was loaded from the server.
export function EntityPicker({
  kinds = ["person"],
  value,
  selectedName,
  onChange,
  placeholder,
}: {
  kinds?: NodeKind[];
  value: string | null | undefined;
  selectedName?: string;
  onChange: (id: string | null, ref: Pick<NodeRef, "id" | "kind" | "name"> | null) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | undefined>(selectedName);
  const [open, setOpen] = useState(false);
  const both = kinds.includes("person") && kinds.includes("polity");

  const { data } = useQuery({
    queryKey: ["picker", kinds.join(","), q],
    enabled: open,
    queryFn: async (): Promise<Option[]> => {
      const query = encodeURIComponent(q);
      const people = async () =>
        (await api.get<{ items: PersonSummary[] }>(`/persons?q=${query}&limit=${both ? 5 : 8}`)).items.map(
          (p): Option => ({ id: p.id, kind: "person", name: p.name, detail: lifeSpan(p.birth, p.death) }),
        );
      const polities = async () =>
        (await api.get<PolitySummary[]>(`/polities?q=${query}`)).slice(0, both ? 5 : 8).map(
          (p): Option => ({ id: p.id, kind: "polity", name: p.name }),
        );
      if (both) return [...(await people()), ...(await polities())];
      return kinds.includes("person") ? people() : polities();
    },
  });

  if (value && picked) {
    return (
      <div className="flex h-11 items-center justify-between rounded-[var(--radius)] border bg-muted px-3 text-[15px]">
        <span>{picked}</span>
        <button type="button" onClick={() => { setPicked(undefined); onChange(null, null); }} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  const fallback = both ? "Gõ tên nhân vật hoặc chính thể để tìm..." : kinds.includes("person") ? "Gõ tên nhân vật để tìm..." : "Gõ tên chính thể để tìm...";
  return (
    <div className="relative">
      <Input
        placeholder={placeholder ?? fallback}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-[var(--radius)] border bg-popover shadow-lg">
          {data?.length ? (
            data.map((o) => (
              <button
                type="button"
                key={o.id}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setPicked(o.name);
                  setQ("");
                  setOpen(false);
                  onChange(o.id, { id: o.id, kind: o.kind, name: o.name });
                }}
              >
                <span>{o.name}</span>
                <span className="text-xs text-muted-foreground">{both ? nodeKindLabels[o.kind] : o.detail}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">Không tìm thấy</div>
          )}
        </div>
      )}
    </div>
  );
}
