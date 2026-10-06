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
      calendar: value?.calendar,
      ...patch,
    };
    onChange(Number.isNaN(next.year) && !next.month && !next.day ? null : next);
  };
  return (
    <Field
      label={label}
      hint="Chỉ nhập năm nếu không rõ ngày tháng. Năm trước Công nguyên nhập số âm (1 TCN là -1, không có năm 0). Dùng lịch Julius cho ngày trước năm 1582 nếu nguồn ghi theo lịch đó."
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
        <select
          aria-label="Lịch"
          disabled={!value}
          value={value?.calendar ?? "gregorian"}
          onChange={(e) => update({ calendar: e.target.value as "gregorian" | "julian" })}
          className="border-input bg-background text-foreground focus-visible:ring-ring h-10 rounded-lg border px-2 text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
        >
          <option value="gregorian">Lịch Gregorius</option>
          <option value="julian">Lịch Julius</option>
        </select>
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
