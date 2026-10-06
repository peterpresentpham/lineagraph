import { Plus, X } from "lucide-react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lineagraph/ui";
import { useRegistry } from "../lib/hooks";
import { EntityPicker } from "./EntityPicker";
import { Field } from "./Field";

export type ParticipantValue = {
  nodeId: string | null;
  nodeName?: string;
  role: string;
  // "" = the event has no sides.
  side: string;
  note: string;
};

export const emptyParticipant = (): ParticipantValue => ({
  nodeId: null,
  role: "participant",
  side: "",
  note: "",
});

type Props = {
  value: ParticipantValue[];
  onChange: (value: ParticipantValue[]) => void;
};

// Who took part in an event and in what role; `side` groups the parties of a war or treaty.
export function ParticipantsField({ value, onChange }: Props) {
  const { data: roles } = useRegistry("participant_role");
  const update = (i: number, patch: Partial<ParticipantValue>) =>
    onChange(value.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <Field
      label="Người và chính thể tham gia"
      hint="Đặt cùng số 'bên' cho những người cùng phe (ví dụ 1 và 2 cho hai phe của một cuộc chiến)."
    >
      <div className="flex flex-col gap-3">
        {value.map((p, i) => (
          <div key={i} className="bg-card flex flex-col gap-2 rounded-xl border p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <EntityPicker
                  key={`participant-${i}-${p.nodeId ?? "none"}`}
                  kinds={["person", "polity"]}
                  value={p.nodeId}
                  selectedName={p.nodeName}
                  onChange={(id, ref) => update(i, { nodeId: id, nodeName: ref?.name })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Bỏ người này"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                <X />
              </Button>
            </div>
            <div className="grid grid-cols-[1fr_5rem_1fr] gap-2">
              <Select value={p.role} onValueChange={(role) => update(i, { role })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                max={20}
                placeholder="Bên"
                aria-label="Bên"
                value={p.side}
                onChange={(e) => update(i, { side: e.target.value })}
              />
              <Input
                placeholder="Ghi chú"
                aria-label="Ghi chú"
                value={p.note}
                onChange={(e) => update(i, { note: e.target.value })}
              />
            </div>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange([...value, emptyParticipant()])}
          >
            <Plus /> Thêm người tham gia
          </Button>
        </div>
      </div>
    </Field>
  );
}
