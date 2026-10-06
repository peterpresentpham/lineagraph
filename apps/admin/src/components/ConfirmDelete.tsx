import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from "@lineagraph/ui";
import { useState, type ReactNode } from "react";
import { errorMessage } from "../lib/hooks";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => Promise<unknown>;
};

// The confirmation box for a delete that cannot be undone, controlled by the page that owns it
// (the "⋯" menu of a list row opens it).
export function DeleteDialog({ open, onOpenChange, title, description, onConfirm }: DialogProps) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } catch (e) {
                toast.error(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Xoá
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Props = {
  trigger: (open: () => void) => ReactNode;
  title: string;
  description: string;
  onConfirm: () => Promise<unknown>;
};

export function ConfirmDelete({ trigger, title, description, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {trigger(() => setOpen(true))}
      <DeleteDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        onConfirm={onConfirm}
      />
    </>
  );
}
