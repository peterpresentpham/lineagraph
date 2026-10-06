import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, toast } from "@lineagraph/ui";
import { DeleteDialog } from "../components/ConfirmDelete";
import { DataTable, type Column } from "../components/data-table/DataTable";
import { FilterSelect, ListToolbar } from "../components/data-table/ListToolbar";
import { PageHeader } from "../components/PageHeader";
import { RelationForm, useRelationTypes } from "../components/RelationForm";
import { api } from "../lib/api";
import { nodeKindLabels } from "../lib/format";
import { useOpenCreateFromUrl } from "../lib/hooks";
import type { RelationshipView } from "../lib/types";
import { useListState } from "../lib/useListState";

// The API returns up to this many at once, without a total.
const LIMIT = 200;

const columns: Column<RelationshipView>[] = [
  {
    key: "from",
    header: "Đối tượng thứ nhất",
    mobile: "title",
    className: "font-medium",
    cell: (r) => (
      <>
        {r.from.name}{" "}
        <span className="text-muted-foreground text-xs font-normal">
          {nodeKindLabels[r.from.kind]}
        </span>
      </>
    ),
  },
  {
    key: "type",
    header: "Quan hệ",
    cell: (r) => (
      <>
        {r.typeLabel}
        {r.label && (
          <Badge variant="warning" className="ml-2">
            {r.label}
          </Badge>
        )}
        {r.disputed && (
          <Badge variant="warning" className="ml-1">
            Còn tranh cãi
          </Badge>
        )}
      </>
    ),
  },
  {
    key: "to",
    header: "Đối tượng thứ hai",
    className: "font-medium",
    cell: (r) => (
      <>
        {r.to.name}{" "}
        <span className="text-muted-foreground text-xs font-normal">
          {nodeKindLabels[r.to.kind]}
        </span>
      </>
    ),
  },
];

export function Relationships() {
  const queryClient = useQueryClient();
  const { data: types } = useRelationTypes();
  const list = useListState({ keys: ["type"], pageSize: LIMIT });
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<RelationshipView | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["relationships", "list", list.query],
    queryFn: () => api.get<RelationshipView[]>(`/relationships?${list.query}`),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["relationships"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const openCreate = () => {
    setEditingId(null);
    setOpen(true);
  };
  const openEdit = (r: RelationshipView) => {
    setEditingId(r.id);
    setOpen(true);
  };
  useOpenCreateFromUrl(openCreate);

  return (
    <>
      <PageHeader
        title="Quan hệ"
        description="Mọi mối quan hệ giữa nhân vật và chính thể, gồm cha/mẹ–con, vợ/chồng, thầy trò, đồng minh, kế vị... Cũng có thể thêm ngay trong trang của từng nhân vật hoặc chính thể."
        action={
          <Button onClick={openCreate}>
            <Plus /> Thêm quan hệ
          </Button>
        }
      />
      <ListToolbar
        search={list.text}
        onSearchChange={list.setText}
        placeholder="Tìm theo tên một trong hai đối tượng..."
        hasFilters={list.hasFilters}
        onClear={list.clearFilters}
      >
        <FilterSelect
          label="Mọi loại quan hệ"
          value={list.filters.type!}
          onChange={(v) => list.setFilter("type", v)}
          options={(types ?? [])
            .filter((t) => t.isPrimary)
            .map((t) => ({ value: t.code, label: t.label }))}
        />
      </ListToolbar>
      <DataTable
        rows={data}
        loading={isLoading}
        columns={columns}
        rowKey={(r) => r.id}
        onOpen={openEdit}
        actions={(r) => [
          { label: "Sửa", icon: Pencil, onSelect: () => openEdit(r) },
          { label: "Xoá", icon: Trash2, destructive: true, onSelect: () => setToDelete(r) },
        ]}
        empty={
          list.hasFilters
            ? "Không có quan hệ nào khớp bộ lọc."
            : "Chưa có quan hệ nào. Thêm quan hệ ở trang của nhân vật hoặc chính thể, hoặc bấm “Thêm quan hệ”."
        }
      />
      {data && data.length >= LIMIT && (
        <p className="text-muted-foreground mt-3 text-sm">
          Hiển thị {LIMIT} quan hệ đầu tiên. Gõ tên hoặc chọn loại để thu hẹp danh sách.
        </p>
      )}
      <DeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Xoá quan hệ này?"
        description={
          toDelete ? `${toDelete.from.name} · ${toDelete.typeLabel} · ${toDelete.to.name}` : ""
        }
        onConfirm={async () => {
          await api.del(`/relationships/${toDelete!.id}`);
          toast.success("Đã xoá quan hệ");
          refresh();
        }}
      />
      <RelationForm open={open} onOpenChange={setOpen} editingId={editingId} />
    </>
  );
}
