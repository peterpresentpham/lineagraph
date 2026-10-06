import { Trash2, X } from "lucide-react";
import { Button } from "@lineagraph/ui";

type Props = {
  count: number;
  onDelete: () => void;
  onClear: () => void;
  deleting?: boolean;
};

// Appears at the bottom of the screen while rows are selected.
export function BulkBar({ count, onDelete, onClear, deleting }: Props) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Thao tác với các mục đã chọn"
      className="bg-card fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-lg"
    >
      <span className="text-sm font-medium">Đã chọn {count}</span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X /> Bỏ chọn
        </Button>
        <Button variant="destructive" size="sm" disabled={deleting} onClick={onDelete}>
          <Trash2 /> {deleting ? "Đang xoá..." : "Xoá"}
        </Button>
      </div>
    </div>
  );
}
