import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Button, toast } from "@lineagraph/ui";
import { api } from "../lib/api";
import { errorMessage } from "../lib/hooks";
import type { NodeRef } from "../lib/types";
import { EntityPicker } from "./EntityPicker";

// The relationships entered most often for a person, one click each. `type` is read from the
// person's side ("child_of" = this person is the child of whoever is picked).
const quick = [
  { type: "child_of", label: "Cha/mẹ", prompt: "Cha hoặc mẹ của nhân vật này" },
  { type: "spouse_of", label: "Vợ/chồng", prompt: "Vợ hoặc chồng" },
  { type: "parent_of", label: "Con", prompt: "Con của nhân vật này" },
  { type: "sibling_of", label: "Anh chị em", prompt: "Anh, chị hoặc em" },
] as const;

type Props = { node: NodeRef };

// "Thêm nhanh: Cha/mẹ · Vợ/chồng · Con · Anh chị em": pick (or create) the other person and the
// relationship is saved at once; dates, label and the like can be added by editing it afterwards.
export function QuickRelations({ node }: Props) {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<(typeof quick)[number] | null>(null);
  const [added, setAdded] = useState(0);

  if (node.kind !== "person") return null;

  const add = async (otherId: string, otherName: string) => {
    if (!active) return;
    try {
      await api.post("/relationships", { type: active.type, fromId: node.id, toId: otherId });
      toast.success(`Đã thêm ${active.label.toLowerCase()}: ${otherName}`);
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      // Stay on the same kind: a person often has several children or spouses to enter in a row.
      setAdded((n) => n + 1);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="mb-5 rounded-xl border border-dashed p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Thêm nhanh:</span>
        {quick.map((q) => (
          <Button
            key={q.type}
            type="button"
            size="sm"
            variant={active?.type === q.type ? "default" : "outline"}
            onClick={() => setActive(active?.type === q.type ? null : q)}
          >
            <Plus /> {q.label}
          </Button>
        ))}
      </div>
      {active && (
        <div className="mt-3 flex items-start gap-2">
          <div className="max-w-md flex-1">
            <EntityPicker
              key={`${active.type}-${added}`}
              kinds={["person"]}
              value={null}
              placeholder={`${active.prompt}: gõ tên để tìm hoặc tạo mới...`}
              onChange={(id, ref) => {
                if (id && ref) void add(id, ref.name);
              }}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Đóng"
            onClick={() => setActive(null)}
          >
            <X />
          </Button>
        </div>
      )}
    </div>
  );
}
