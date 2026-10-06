import { useState, type ReactNode } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@lineagraph/ui";

type Props = {
  /** Anchor id, matched by the outline on the left. */
  id: string;
  title: string;
  /** How many items the section holds; shown next to the title. */
  count?: number;
  /** A reason this section needs attention (for example "Chưa có nguồn nào"). */
  warning?: string;
  description?: string;
  /** Changes made in this section are saved at once, not by the page's Save button. */
  autoSave?: boolean;
  /** Collapsible sections start closed and only mount their content once opened. */
  collapsible?: boolean;
  children: ReactNode;
};

// One block of a record's page: a titled card with an item count and an attention marker.
export function SectionCard({
  id,
  title,
  count,
  warning,
  description,
  autoSave = false,
  collapsible = false,
  children,
}: Props) {
  const [open, setOpen] = useState(!collapsible);
  const heading = (
    <>
      <h2 className="text-lg">{title}</h2>
      {count !== undefined && (
        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium tabular-nums">
          {count}
        </span>
      )}
      {autoSave && (
        <span
          className="text-muted-foreground rounded-full border px-2 py-0.5 text-xs"
          title="Mỗi thay đổi trong phần này được lưu ngay, không cần bấm Lưu"
        >
          Tự lưu
        </span>
      )}
      {warning && (
        <span
          className="text-warning-foreground inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"
          title={warning}
        >
          <AlertTriangle className="size-3" aria-hidden /> {warning}
        </span>
      )}
    </>
  );
  return (
    <section id={id} className="bg-card scroll-mt-32 rounded-2xl border p-5 md:p-6">
      {collapsible ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-2 text-left"
        >
          {heading}
          <ChevronDown
            className={cn("ml-auto size-4 transition-transform", open && "rotate-180")}
          />
        </button>
      ) : (
        <div className="flex items-center gap-2">{heading}</div>
      )}
      {description && open && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}
