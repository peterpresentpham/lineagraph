import { Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@lineagraph/ui";
import { useRegistry } from "../lib/hooks";
import type { AttributeValue } from "../lib/types";
import { Field, NativeSelect } from "./Field";

// Free-form facts about a person or polity: hometown, burial place, capital... The kinds come
// from the "attribute_type" registry, which the admin can extend in the Danh mục page.
export function AttributesField({ value, onChange }: { value: AttributeValue[]; onChange: (value: AttributeValue[]) => void }) {
  const { data: kinds } = useRegistry("attribute_type");
  const set = (index: number, patch: Partial<AttributeValue>) =>
    onChange(value.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  return (
    <Field label="Thông tin khác" hint="Thêm bất kỳ thông tin nào: quê quán, nơi an táng, kinh đô... Loại thông tin mới thêm ở trang Danh mục.">
      <div className="flex flex-col gap-2">
        {value.map((a, i) => (
          <div key={i} className="flex items-center gap-2">
            <NativeSelect className="w-48" value={a.type} onChange={(e) => set(i, { type: e.target.value })}>
              {(kinds ?? [{ code: a.type, label: a.type }]).map((k) => (
                <option key={k.code} value={k.code}>{k.label}</option>
              ))}
            </NativeSelect>
            <Input placeholder="Giá trị" value={a.value} onChange={(e) => set(i, { value: e.target.value })} />
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-fit"
          onClick={() => onChange([...value, { type: kinds?.[0]?.code ?? "other", value: "" }])}
        >
          <Plus /> Thêm thông tin
        </Button>
      </div>
    </Field>
  );
}
