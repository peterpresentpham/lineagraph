import { Button } from "@lineagraph/ui";

type Props = {
  /** A record that does not exist yet. */
  isNew: boolean;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  /** Throw away the edits and go back to what was last saved. */
  onDiscard: () => void;
  /** Creating only: save, then open an empty form of the same kind. */
  onSaveAndNew?: () => void;
};

// Sticks under the top bar while a record is edited: what the state is, and Save (Ctrl/Cmd+S).
export function SaveBar({ isNew, dirty, saving, onSave, onDiscard, onSaveAndNew }: Props) {
  const status = saving
    ? "Đang lưu..."
    : isNew
      ? "Bản ghi mới, chưa lưu"
      : dirty
        ? "Có thay đổi chưa lưu"
        : "Đã lưu";
  return (
    <div
      className="bg-background/95 sticky top-[59px] z-20 -mx-4 mb-5 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 backdrop-blur md:-mx-8 md:px-8"
      role="region"
      aria-label="Lưu thay đổi"
    >
      <span className="flex items-center gap-2 text-sm" aria-live="polite">
        <span
          className={`size-2 rounded-full ${dirty || isNew ? "bg-amber-500" : "bg-emerald-500"}`}
          aria-hidden
        />
        {status}
      </span>
      <div className="flex items-center gap-2">
        {!isNew && dirty && (
          <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
            Huỷ thay đổi
          </Button>
        )}
        {isNew && onSaveAndNew && (
          <Button variant="secondary" size="sm" onClick={onSaveAndNew} disabled={saving}>
            Lưu và thêm tiếp
          </Button>
        )}
        <Button size="sm" onClick={onSave} disabled={saving || (!isNew && !dirty)}>
          {isNew ? "Tạo" : "Lưu"}
          <kbd className="ml-1 hidden rounded bg-white/20 px-1 text-[11px] sm:inline">⌘S</kbd>
        </Button>
      </div>
    </div>
  );
}
