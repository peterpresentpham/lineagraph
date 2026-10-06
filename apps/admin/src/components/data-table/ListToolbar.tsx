import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lineagraph/ui";

const ALL = "__all__";

type ToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  /** Show "Xoá bộ lọc" when a search or filter is active. */
  hasFilters: boolean;
  onClear: () => void;
  /** The filter controls ({@link FilterSelect}, {@link FilterToggle}). */
  children?: ReactNode;
};

// Search box, filters and a reset button above a list.
export function ListToolbar({
  search,
  onSearchChange,
  placeholder = "Tìm theo tên (không cần gõ dấu)...",
  hasFilters,
  onClear,
  children,
}: ToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1 sm:max-w-sm">
        <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          aria-label="Tìm kiếm"
          placeholder={placeholder}
          className="pl-9"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {children}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X /> Xoá bộ lọc
        </Button>
      )}
    </div>
  );
}

type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
};

// A dropdown filter; the first entry ("Tất cả ...") clears it.
export function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
      <SelectTrigger aria-label={label} className="w-auto min-w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type FilterToggleProps = {
  label: string;
  active: boolean;
  onChange: (active: boolean) => void;
};

// An on/off filter shown as a pill ("Chưa có nguồn").
export function FilterToggle({ label, active, onChange }: FilterToggleProps) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      aria-pressed={active}
      onClick={() => onChange(!active)}
    >
      {label}
    </Button>
  );
}
