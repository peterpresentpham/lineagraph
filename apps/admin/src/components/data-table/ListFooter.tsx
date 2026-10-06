import { Button } from "@lineagraph/ui";

type Props = {
  page: number;
  pageSize: number;
  total: number | undefined;
  onPage: (page: number) => void;
};

// "Hiển thị 51–100 / 230" with previous and next.
export function ListFooter({ page, pageSize, total, onPage }: Props) {
  if (total === undefined || total === 0) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="text-muted-foreground mt-4 flex items-center justify-between gap-3 text-sm">
      <span>
        Hiển thị {from}–{to} / {total}
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          Trang {page}/{pages}
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            Trước
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}
