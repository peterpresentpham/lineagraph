import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Input, toast } from "@lineagraph/ui";
import { api } from "../lib/api";
import { errorMessage } from "../lib/hooks";
import { lifeSpan, nodeKindLabels } from "../lib/format";
import type { NodeKind, NodeRef, PersonSummary, PolitySummary } from "../lib/types";

type Option = { id: string; kind: NodeKind; name: string; detail?: string };

type Props = {
  kinds?: NodeKind[];
  value: string | null | undefined;
  selectedName?: string;
  onChange: (id: string | null, ref: Pick<NodeRef, "id" | "kind" | "name"> | null) => void;
  placeholder?: string;
  /** Offer "Tạo ..." for a name that is not found (default on). */
  allowCreate?: boolean;
};

// Search-as-you-type picker for people and/or polities. `selectedName` is shown while editing
// a record whose selection was loaded from the server.
export function EntityPicker({
  kinds = ["person"],
  value,
  selectedName,
  onChange,
  placeholder,
  allowCreate = true,
}: Props) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
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
        (
          await api.get<{ items: PersonSummary[] }>(`/persons?q=${query}&limit=${both ? 5 : 8}`)
        ).items.map((p): Option => ({
          id: p.id,
          kind: "person",
          name: p.name,
          detail: lifeSpan(p.birth, p.death),
        }));
      const polities = async () =>
        (
          await api.get<{ items: PolitySummary[] }>(`/polities?q=${query}&limit=${both ? 5 : 8}`)
        ).items.map((p): Option => ({ id: p.id, kind: "polity", name: p.name }));
      if (both) return [...(await people()), ...(await polities())];
      return kinds.includes("person") ? people() : polities();
    },
  });

  if (value && picked) {
    return (
      <div className="bg-muted flex h-11 items-center justify-between rounded-xl border px-3 text-[15px]">
        <span>{picked}</span>
        <button
          type="button"
          onClick={() => {
            setPicked(undefined);
            onChange(null, null);
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  // Creates a bare record from the typed name and selects it, so the admin does not have to leave
  // the form (and lose what it holds) to add the person or polity that is missing.
  const create = async (kind: NodeKind) => {
    const name = q.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const names = [{ name, kind: "common", isPrimary: true }];
      const { id } =
        kind === "person"
          ? await api.post<{ id: string }>("/persons", { names })
          : await api.post<{ id: string }>("/polities", { names, polityType: "state" });
      queryClient.invalidateQueries({ queryKey: [kind === "person" ? "persons" : "polities"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success(`Đã tạo ${kind === "person" ? "nhân vật" : "chính thể"} "${name}"`);
      setPicked(name);
      setQ("");
      setOpen(false);
      onChange(id, { id, kind, name });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const fallback = both
    ? "Gõ tên nhân vật hoặc chính thể để tìm..."
    : kinds.includes("person")
      ? "Gõ tên nhân vật để tìm..."
      : "Gõ tên chính thể để tìm...";
  return (
    <div className="relative">
      <Input
        placeholder={placeholder ?? fallback}
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
          {data?.length ? (
            data.map((o) => (
              <button
                type="button"
                key={o.id}
                className="hover:bg-muted flex w-full items-center justify-between px-3 py-2 text-left text-sm"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setPicked(o.name);
                  setQ("");
                  setOpen(false);
                  onChange(o.id, { id: o.id, kind: o.kind, name: o.name });
                }}
              >
                <span>{o.name}</span>
                <span className="text-muted-foreground text-xs">
                  {both ? nodeKindLabels[o.kind] : o.detail}
                </span>
              </button>
            ))
          ) : (
            <div className="text-muted-foreground px-3 py-2 text-sm">Không tìm thấy</div>
          )}
          {allowCreate &&
            q.trim().length >= 2 &&
            kinds.map((kind) => (
              <button
                type="button"
                key={`create-${kind}`}
                className="hover:bg-muted flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm font-medium"
                onMouseDown={(e) => {
                  e.preventDefault();
                  void create(kind);
                }}
              >
                <Plus className="size-4" />
                Tạo {kind === "person" ? "nhân vật" : "chính thể"} “{q.trim()}”
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
