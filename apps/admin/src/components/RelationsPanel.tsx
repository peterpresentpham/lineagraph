import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, toast } from "@lineagraph/ui";
import { api } from "../lib/api";
import { categoryLabels, variantOptions } from "../lib/format";
import type { NodeRef, RelationshipView } from "../lib/types";
import { ConfirmDelete } from "./ConfirmDelete";
import { QuickRelations } from "./QuickRelations";
import { RelationForm } from "./RelationForm";

type Props = { node: NodeRef };

// All relationships of one person or polity, read from that node's point of view.
export function RelationsPanel({ node }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["relationships", "node", node.id],
    queryFn: () => api.get<RelationshipView[]>(`/relationships?nodeId=${node.id}&limit=500`),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["relationships"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  // From this node's side: the (already sex-aware) stored label when it is the first end, the
  // inverse label otherwise — e.g. "Là cha của" on the father's page, "Là con trai của" on the son's.
  const seen = (r: RelationshipView) => {
    const outgoing = r.from.id === node.id;
    return { label: outgoing ? r.typeLabel : r.inverseTypeLabel, other: outgoing ? r.to : r.from };
  };
  const groups = new Map<string, RelationshipView[]>();
  for (const r of data ?? []) groups.set(r.category, [...(groups.get(r.category) ?? []), r]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Quan hệ với nhân vật và chính thể khác. Cha/mẹ, vợ/chồng, thầy trò, đồng minh... đều nhập
          ở đây.
        </p>
        <Button
          onClick={() => {
            setEditingId(null);
            setOpen(true);
          }}
        >
          <Plus /> Thêm quan hệ
        </Button>
      </div>
      <QuickRelations node={node} />
      {data && data.length === 0 && (
        <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center">
          Chưa có quan hệ nào.
        </p>
      )}
      <div className="flex flex-col gap-6">
        {[...groups.entries()].map(([category, items]) => (
          <section key={category}>
            <h3 className="text-muted-foreground mb-2">{categoryLabels[category] ?? category}</h3>
            <div className="bg-card rounded-xl border">
              {items.map((r, i) => {
                const { label, other } = seen(r);
                const variant = r.variant
                  ? variantOptions[r.type]?.find((v) => v.code === r.variant)?.label
                  : null;
                return (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? "border-t" : ""}`}
                  >
                    <div className="min-w-0">
                      <span className="text-muted-foreground">{label} </span>
                      <span className="font-medium">{other.name}</span>
                      <Badge variant="neutral" className="ml-2">
                        {other.kind === "person" ? "Nhân vật" : "Chính thể"}
                      </Badge>
                      {variant && variant !== "Ruột" && (
                        <Badge variant="info" className="ml-1">
                          {variant}
                        </Badge>
                      )}
                      {r.label && (
                        <Badge variant="warning" className="ml-1">
                          {r.label}
                        </Badge>
                      )}
                      {r.disputed && (
                        <Badge variant="warning" className="ml-1">
                          Còn tranh cãi
                        </Badge>
                      )}
                      {(r.start || r.end) && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          {r.start?.label ?? "?"} – {r.end?.label ?? "?"}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingId(r.id);
                          setOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <ConfirmDelete
                        title="Xoá quan hệ này?"
                        description={`${r.from.name} · ${r.typeLabel} · ${r.to.name}`}
                        onConfirm={async () => {
                          await api.del(`/relationships/${r.id}`);
                          toast.success("Đã xoá quan hệ");
                          refresh();
                        }}
                        trigger={(openDialog) => (
                          <Button variant="ghost" size="icon" onClick={openDialog}>
                            <Trash2 />
                          </Button>
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <RelationForm open={open} onOpenChange={setOpen} editingId={editingId} fixedFrom={node} />
    </div>
  );
}
