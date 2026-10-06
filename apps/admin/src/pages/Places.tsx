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
import { ListFooter } from "../components/data-table/ListFooter";
import { ListToolbar } from "../components/data-table/ListToolbar";
import { Field } from "../components/Field";
import { FormSheet } from "../components/FormSheet";
import { PageHeader } from "../components/PageHeader";
import { PlacePicker } from "../components/PlacePicker";
import { api } from "../lib/api";
import { placeTypes } from "../lib/format";
import { errorMessage, useOpenCreateFromUrl } from "../lib/hooks";
import type { PlaceSummary } from "../lib/types";
import { useListState } from "../lib/useListState";

const PAGE_SIZE = 50;

const columns: Column<PlaceSummary>[] = [
  { key: "name", header: "Tên", mobile: "title", className: "font-medium", cell: (p) => p.name },
  {
    key: "type",
    header: "Loại",
    cell: (p) => placeTypes.find(([code]) => code === p.placeType)?.[1] ?? "",
  },
  { key: "parent", header: "Thuộc", cell: (p) => p.parent?.name ?? "" },
  {
    key: "coords",
    header: "Toạ độ",
    className: "text-muted-foreground text-sm",
    cell: (p) => (p.latitude != null && p.longitude != null ? `${p.latitude}, ${p.longitude}` : ""),
  },
];

type Form = {
  name: string;
  parentId: string | null;
  parentName: string | null;
  placeType: string;
  latitude: string;
  longitude: string;
  note: string;
};
const emptyForm = (): Form => ({
  name: "",
  parentId: null,
  parentName: null,
  placeType: "",
  latitude: "",
  longitude: "",
  note: "",
});
const toNumber = (v: string) => (v.trim() === "" ? null : Number(v));

// Where people were born or died; places can sit inside larger places (city inside a province).
export function Places() {
  const queryClient = useQueryClient();
  const list = useListState({ keys: [], pageSize: PAGE_SIZE });
  const [toDelete, setToDelete] = useState<PlaceSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  // Serialized form as loaded for an edit; null when creating.
  const [baseline, setBaseline] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["places", list.query],
    queryFn: () => api.get<{ items: PlaceSummary[]; total: number }>(`/places?${list.query}`),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["places"] });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        parentId: form.parentId,
        placeType: form.placeType || null,
        latitude: toNumber(form.latitude),
        longitude: toNumber(form.longitude),
        note: form.note || null,
      };
      return editingId ? api.put(`/places/${editingId}`, body) : api.post("/places", body);
    },
    onSuccess: () => {
      toast.success(editingId ? "Đã cập nhật địa điểm" : "Đã thêm địa điểm");
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
  const openEdit = (p: PlaceSummary) => {
    const loaded: Form = {
      name: p.name,
      parentId: p.parent?.id ?? null,
      parentName: p.parent?.name ?? null,
      placeType: p.placeType ?? "",
      latitude: p.latitude?.toString() ?? "",
      longitude: p.longitude?.toString() ?? "",
      note: p.note ?? "",
    };
    setEditingId(p.id);
    setForm(loaded);
    setBaseline(JSON.stringify(loaded));
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Địa điểm"
        description="Nơi sinh, nơi mất của nhân vật. Một địa điểm có thể nằm trong địa điểm lớn hơn."
        action={
          <Button onClick={openCreate}>
            <Plus /> Thêm địa điểm
          </Button>
        }
      />
      <ListToolbar
        search={list.text}
        onSearchChange={list.setText}
        placeholder="Tìm theo tên địa điểm..."
        hasFilters={list.hasFilters}
        onClear={list.clearFilters}
      />
      <DataTable
        rows={data?.items}
        loading={isLoading}
        columns={columns}
        rowKey={(p) => p.id}
        onOpen={openEdit}
        actions={(p) => [
          { label: "Sửa", icon: Pencil, onSelect: () => openEdit(p) },
          { label: "Xoá", icon: Trash2, destructive: true, onSelect: () => setToDelete(p) },
        ]}
        empty={
          list.hasFilters ? (
            "Không có địa điểm nào khớp."
          ) : (
            <>
              Chưa có địa điểm nào.{" "}
              <Button variant="link" className="h-auto p-0" onClick={openCreate}>
                Thêm địa điểm đầu tiên
              </Button>
            </>
          )
        }
      />
      <ListFooter page={list.page} pageSize={PAGE_SIZE} total={data?.total} onPage={list.setPage} />
      <DeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Xoá địa điểm "${toDelete?.name}"?`}
        description="Không xoá được nếu còn nhân vật, sự kiện hoặc địa điểm con đang dùng nơi này."
        onConfirm={async () => {
          await api.del(`/places/${toDelete!.id}`);
          toast.success("Đã xoá địa điểm");
          refresh();
        }}
      />
      <FormSheet
        open={open}
        onOpenChange={setOpen}
        title={editingId ? "Sửa địa điểm" : "Thêm địa điểm"}
        saving={save.isPending}
        unchanged={baseline !== null && JSON.stringify(form) === baseline}
        onSubmit={() => save.mutate()}
      >
        <Field label="Tên">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field
          label="Thuộc địa điểm"
          hint="Nơi lớn hơn chứa địa điểm này, ví dụ tỉnh của một thành phố."
        >
          <PlacePicker
            value={form.parentId}
            selectedName={form.parentName}
            exclude={editingId ?? undefined}
            onChange={(id, name) => setForm({ ...form, parentId: id, parentName: name })}
          />
        </Field>
        <Field label="Loại địa điểm">
          <Select
            value={form.placeType || "__none__"}
            onValueChange={(v) => setForm({ ...form, placeType: v === "__none__" ? "" : v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Chưa phân loại</SelectItem>
              {placeTypes.map(([code, label]) => (
                <SelectItem key={code} value={code}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Vĩ độ" hint="Từ -90 đến 90">
            <Input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
            />
          </Field>
          <Field label="Kinh độ" hint="Từ -180 đến 180">
            <Input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Ghi chú">
          <Textarea
            rows={3}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </Field>
      </FormSheet>
    </>
  );
}
