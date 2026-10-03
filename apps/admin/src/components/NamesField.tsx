import { Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@lineagraph/ui";
import { useRegistry } from "../lib/hooks";
import type { NameValue } from "../lib/types";
import { Field, NativeSelect } from "./Field";

export function NamesField({ value, onChange }: { value: NameValue[]; onChange: (value: NameValue[]) => void }) {
  const { data: kinds } = useRegistry("name_kind");
  const set = (index: number, patch: Partial<NameValue>) =>
    onChange(value.map((n, i) => (i === index ? { ...n, ...patch } : n)));
  const setPrimary = (index: number) => onChange(value.map((n, i) => ({ ...n, isPrimary: i === index })));
  const remove = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    if (next.length && !next.some((n) => n.isPrimary)) next[0] = { ...next[0]!, isPrimary: true };
    onChange(next);
  };

  return (
    <Field label="Tên" hint="Chọn một tên làm tên chính. Một người có thể có nhiều tên (húy, hiệu, thụy hiệu...).">
      <div className="flex flex-col gap-2">
        {value.map((n, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="primary-name"
              checked={n.isPrimary}
              onChange={() => setPrimary(i)}
              title="Tên chính"
              className="size-4 accent-[var(--primary)]"
            />
            <Input placeholder="Tên" value={n.name} onChange={(e) => set(i, { name: e.target.value })} />
            <NativeSelect className="w-44" value={n.kind} onChange={(e) => set(i, { kind: e.target.value })}>
              {(kinds ?? [{ code: n.kind, label: n.kind }]).map((k) => (
                <option key={k.code} value={k.code}>{k.label}</option>
              ))}
            </NativeSelect>
            <Button type="button" variant="ghost" size="icon" disabled={value.length === 1} onClick={() => remove(i)}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-fit"
          onClick={() => onChange([...value, { name: "", kind: "common", isPrimary: value.length === 0 }])}
        >
          <Plus /> Thêm tên
        </Button>
      </div>
    </Field>
  );
}

export const emptyNames = (): NameValue[] => [{ name: "", kind: "common", isPrimary: true }];
