import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@lineagraph/ui";
import { DeleteDialog } from "../components/ConfirmDelete";
import { DataTable, type Column } from "../components/data-table/DataTable";
import { ListToolbar } from "../components/data-table/ListToolbar";
import { Field } from "../components/Field";
import { FormSheet } from "../components/FormSheet";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import { errorMessage, useOpenCreateFromUrl } from "../lib/hooks";
import { useListState } from "../lib/useListState";

type Source = {
  id: string;
  title: string;
  author: string | null;
  kind: string | null;
  url: string | null;
  reliability: number | null;
  note: string | null;
};
type Form = {
  title: string;
  author: string;
  kind: string;
  url: string;
  reliability: string;
  note: string;
};
const emptyForm = (): Form => ({
  title: "",
  author: "",
  kind: "",
  url: "",
  reliability: "",
  note: "",
});
const UNRATED = "__unrated__";

const columns: Column<Source>[] = [
  {
    key: "title",
    header: "Tên nguồn",
    mobile: "title",
    className: "font-medium",
    cell: (s) => s.title,
  },
  { key: "author", header: "Tác giả", cell: (s) => s.author ?? "" },
  { key: "kind", header: "Loại", cell: (s) => s.kind ?? "" },
  {
    key: "reliability",
    header: "Độ tin cậy",
    cell: (s) => (s.reliability ? `${s.reliability}/5` : ""),
  },
];

export function Sources() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const list = useListState({ keys: [], pageSize: 1000 });
  const [toDelete, setToDelete] = useState<Source | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  // Serialized form as loaded for an edit; null when creating.
  const [baseline, setBaseline] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sources"],
    queryFn: () => api.get<Source[]>("/sources"),
  });
  // The API returns every source, so searching happens here, as the admin types.
  const needle = list.text.trim().toLowerCase();
  const rows = data?.filter(
    (s) => !needle || `${s.title} ${s.author ?? ""} ${s.kind ?? ""}`.toLowerCase().includes(needle),
  );
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["sources"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        reliability: form.reliability === "" ? null : Number(form.reliability),
      };
      return editingId ? api.put(`/sources/${editingId}`, body) : api.post("/sources", body);
    },
    onSuccess: () => {
      toast.success(editingId ? "Đã cập nhật nguồn" : "Đã thêm nguồn");
      setOpen(false);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const openCreate = () => {
    setEditingId(null);
    setBaseline(null);
    setForm(emptyForm());
    setOpen(true);
  };
  useOpenCreateFromUrl(openCreate);
  const openEdit = (s: Source) => {
    const loaded = {
      title: s.title,
      author: s.author ?? "",
      kind: s.kind ?? "",
      url: s.url ?? "",
      reliability: s.reliability?.toString() ?? "",
      note: s.note ?? "",
    };
    setEditingId(s.id);
    setForm(loaded);
    setBaseline(JSON.stringify(loaded));
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Nguồn tư liệu"
        description="Sách sử, bia ký, bài nghiên cứu... dùng để dẫn nguồn cho dữ kiện."
        action={
          <Button onClick={openCreate}>
            <Plus /> Thêm nguồn
          </Button>
        }
      />
      <ListToolbar
        search={list.text}
        onSearchChange={list.setText}
        placeholder="Tìm theo tên sách, tác giả..."
        hasFilters={!!list.text}
        onClear={() => list.setText("")}
      />
      <DataTable
        rows={rows}
        loading={isLoading}
        columns={columns}
        rowKey={(s) => s.id}
        onOpen={openEdit}
        actions={(s) => [
          { label: "Sửa", icon: Pencil, onSelect: () => openEdit(s) },
          { label: "Xoá", icon: Trash2, destructive: true, onSelect: () => setToDelete(s) },
        ]}
        empty={
          list.text ? (
            "Không có nguồn nào khớp."
          ) : (
            <>
              Chưa có nguồn nào.{" "}
              <Button variant="link" className="h-auto p-0" onClick={openCreate}>
                Thêm nguồn đầu tiên
              </Button>
            </>
          )
        }
      />
      <DeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Xoá nguồn "${toDelete?.title}"?`}
        description="Không xoá được nếu nguồn đang được dùng để dẫn chứng."
        onConfirm={async () => {
          await api.del(`/sources/${toDelete!.id}`);
          toast.success("Đã xoá nguồn");
          refresh();
        }}
      />
      <FormSheet
        open={open}
        onOpenChange={setOpen}
        title={editingId ? "Sửa nguồn" : "Thêm nguồn"}
        saving={save.isPending}
        unchanged={baseline !== null && JSON.stringify(form) === baseline}
        onSubmit={() => save.mutate()}
      >
        <Field label="Tiêu đề">
          <Input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Tác giả">
          <Input
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Loại" hint="Ví dụ: chính sử, bia ký, nghiên cứu.">
            <Input value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} />
          </Field>
          <Field label="Độ tin cậy">
            <Select
              value={form.reliability || UNRATED}
              onValueChange={(v) => setForm({ ...form, reliability: v === UNRATED ? "" : v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNRATED}>Chưa đánh giá</SelectItem>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}/5
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Đường dẫn">
          <Input
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
        </Field>
        <Field label="Ghi chú">
          <Textarea
            rows={4}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </Field>
      </FormSheet>
    </>
  );
}
