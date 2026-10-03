import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lineagraph/ui";
import { Plus, Trash2 } from "lucide-react";
import { useRegistry } from "../lib/hooks";
import type { AttributeValue } from "../lib/types";
import { Field } from "./Field";

type Props = {
  value: AttributeValue[];
  onChange: (value: AttributeValue[]) => void;
};

export function AttributesField({ value, onChange }: Props) {
  const { data: kinds } = useRegistry("attribute_type");
  const set = (index: number, patch: Partial<AttributeValue>) =>
    onChange(value.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  return (
    <Field
      label="Thông tin khác"
      hint="Thêm bất kỳ thông tin nào: quê quán, nơi an táng, kinh đô... Loại thông tin mới thêm ở trang Danh mục."
    >
      <div className="flex flex-col gap-2">
        {value.map((a, i) => (
          <div key={i} className="flex items-center gap-2">
            <Select value={a.type} onValueChange={(type) => set(i, { type })}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(kinds ?? [{ code: a.type, label: a.type }]).map((k) => (
                  <SelectItem key={k.code} value={k.code}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Giá trị"
              value={a.value}
              onChange={(e) => set(i, { value: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
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
