import type { KeyboardEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lineagraph/ui";

type RowLinkProps = { to: string; children: ReactNode };

/** The name link of a row. Clicking it must not also fire the row's own "open". */
export function RowLink({ to, children }: RowLinkProps) {
  return (
    <Link to={to} onClick={(e) => e.stopPropagation()}>
      {children}
    </Link>
  );
}

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** On a narrow screen a row becomes a card: "title" is its heading, "meta" lines follow, false hides. */
  mobile?: "title" | "meta" | false;
};

export type RowAction<T> = {
  label: string;
  icon?: LucideIcon;
  onSelect: (row: T) => void;
  destructive?: boolean;
};

type Props<T> = {
  rows: T[] | undefined;
  loading: boolean;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Opens the record: a click anywhere on the row, or Enter on a focused row. */
  onOpen: (row: T) => void;
  /** Items of the "⋯" menu; a destructive one is set apart from the rest. */
  actions?: (row: T) => RowAction<T>[];
  selected?: Set<string>;
  onSelectedChange?: (selected: Set<string>) => void;
  /** Shown instead of the rows when there are none. */
  empty: ReactNode;
};

// One list for every record type: a table on wide screens, cards on narrow ones, with an optional
// select column and a "⋯" menu per row.
export function DataTable<T>({
  rows,
  loading,
  columns,
  rowKey,
  onOpen,
  actions,
  selected,
  onSelectedChange,
  empty,
}: Props<T>) {
  const selectable = !!selected && !!onSelectedChange;
  const ids = (rows ?? []).map(rowKey);
  const allSelected = selectable && ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = selectable && ids.some((id) => selected.has(id));

  const toggle = (id: string) => {
    if (!selected || !onSelectedChange) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  };
  const toggleAll = () => {
    if (!selected || !onSelectedChange) return;
    const next = new Set(selected);
    for (const id of ids) {
      if (allSelected) next.delete(id);
      else next.add(id);
    }
    onSelectedChange(next);
  };
  const onRowKey = (e: KeyboardEvent, row: T) => {
    // Only when the row itself has focus; Enter on a link or button inside keeps its own meaning.
    if (e.target === e.currentTarget && e.key === "Enter") onOpen(row);
  };

  const menu = (row: T) => {
    const items = actions?.(row) ?? [];
    if (items.length === 0) return null;
    const safe = items.filter((a) => !a.destructive);
    const danger = items.filter((a) => a.destructive);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Thao tác"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          {safe.map((a) => (
            <DropdownMenuItem key={a.label} onSelect={() => a.onSelect(row)}>
              {a.icon && <a.icon />}
              {a.label}
            </DropdownMenuItem>
          ))}
          {safe.length > 0 && danger.length > 0 && <DropdownMenuSeparator />}
          {danger.map((a) => (
            <DropdownMenuItem key={a.label} variant="destructive" onSelect={() => a.onSelect(row)}>
              {a.icon && <a.icon />}
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const isEmpty = !loading && rows && rows.length === 0;
  const titleColumn = columns.find((c) => c.mobile === "title") ?? columns[0]!;
  const metaColumns = columns.filter((c) => c !== titleColumn && c.mobile !== false);

  return (
    <div className="bg-card rounded-xl border">
      {/* Wide screens */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Chọn tất cả"
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
              )}
              {columns.map((c) => (
                <TableHead key={c.key} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
              {actions && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 6 }, (_, i) => (
                <TableRow key={i}>
                  {Array.from(
                    { length: columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0) },
                    (_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full max-w-40" />
                      </TableCell>
                    ),
                  )}
                </TableRow>
              ))}
            {rows?.map((row) => {
              const id = rowKey(row);
              return (
                <TableRow
                  key={id}
                  tabIndex={0}
                  data-state={selected?.has(id) ? "selected" : undefined}
                  className="focus-visible:bg-muted cursor-pointer outline-none"
                  onClick={() => onOpen(row)}
                  onKeyDown={(e) => onRowKey(e, row)}
                >
                  {selectable && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        aria-label="Chọn dòng này"
                        checked={selected.has(id)}
                        onCheckedChange={() => toggle(id)}
                      />
                    </TableCell>
                  )}
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                  {actions && <TableCell className="text-right">{menu(row)}</TableCell>}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Narrow screens: one card per row */}
      <ul className="divide-y md:hidden">
        {loading &&
          Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex flex-col gap-2 p-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </li>
          ))}
        {rows?.map((row) => {
          const id = rowKey(row);
          return (
            <li
              key={id}
              className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 p-4"
              onClick={() => onOpen(row)}
            >
              {selectable && (
                <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    aria-label="Chọn dòng này"
                    checked={selected.has(id)}
                    onCheckedChange={() => toggle(id)}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium">{titleColumn.cell(row)}</div>
                <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {metaColumns.map((c) => (
                    <span key={c.key}>{c.cell(row)}</span>
                  ))}
                </div>
              </div>
              {actions && <div className="-mr-2 -mt-1">{menu(row)}</div>}
            </li>
          );
        })}
      </ul>

      {isEmpty && <div className="text-muted-foreground px-4 py-12 text-center">{empty}</div>}
    </div>
  );
}
