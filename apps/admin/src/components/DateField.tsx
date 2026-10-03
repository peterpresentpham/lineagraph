import { Checkbox, Input, Label } from "@lineagraph/ui";
import type { DateInput } from "../lib/types";
import { Field } from "./Field";

const toNumber = (value: string) => (value === "" ? null : Number(value));

type Props = {
  label: string;
  value: DateInput | null;
  onChange: (value: DateInput | null) => void;
};

// Year is required for a date to exist; month and day are optional (fuzzy dates).
export function DateField({ label, value, onChange }: Props) {
  const update = (patch: Partial<DateInput>) => {
    const next = {
      year: value?.year ?? NaN,
      month: value?.month ?? null,
      day: value?.day ?? null,
      approximate: value?.approximate ?? false,
      ...patch,
    };
    onChange(Number.isNaN(next.year) && !next.month && !next.day ? null : next);
  };
  return (
    <Field
      label={label}
      hint="Chỉ nhập năm nếu không rõ ngày tháng. Năm trước Công nguyên nhập số âm."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          placeholder="Năm"
          className="w-28"
          value={value && !Number.isNaN(value.year) ? value.year : ""}
          onChange={(e) => update({ year: e.target.value === "" ? NaN : Number(e.target.value) })}
        />
        <Input
          type="number"
          min={1}
          max={12}
          placeholder="Tháng"
          className="w-24"
          value={value?.month ?? ""}
          onChange={(e) => update({ month: toNumber(e.target.value) })}
        />
        <Input
          type="number"
          min={1}
          max={31}
          placeholder="Ngày"
          className="w-24"
          value={value?.day ?? ""}
          onChange={(e) => update({ day: toNumber(e.target.value) })}
        />
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox
            checked={value?.approximate ?? false}
            onCheckedChange={(checked) => update({ approximate: checked === true })}
          />
          Khoảng
        </Label>
      </div>
    </Field>
  );
}

// A date is only sent to the API when it has a year.
export const cleanDate = (value: DateInput | null): DateInput | null =>
  value && !Number.isNaN(value.year) ? value : null;
