import type { FormEvent, ReactNode } from "react";
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@lineagraph/ui";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  saving: boolean;
  onSubmit: () => void;
  children: ReactNode;
};

// Right-hand drawer holding a create/edit form. Children are the form fields.
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  saving,
  onSubmit,
  children,
}: Props) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} className="flex min-h-full flex-col gap-5 p-5">
          <SheetHeader className="p-0">
            <SheetTitle className="text-lg">{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-5">{children}</div>
          <div className="bg-background sticky bottom-0 flex justify-end gap-2 border-t py-3">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
