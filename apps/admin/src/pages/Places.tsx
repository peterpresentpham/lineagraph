import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  toast,
} from "@lineagraph/ui";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { Field } from "../components/Field";
import { FormSheet } from "../components/FormSheet";
import { PageHeader } from "../components/PageHeader";
import { PlacePicker } from "../components/PlacePicker";
import { TableSkeleton } from "../components/TableSkeleton";
import { api } from "../lib/api";
import { errorMessage } from "../lib/hooks";
import type { PlaceSummary } from "../lib/types";

type Form = {
  name: string;
  parentId: string | null;
  parentName: string | null;
  latitude: string;
  longitude: string;
  note: string;
};
const emptyForm = (): Form => ({
  name: "",
  parentId: null,
  parentName: null,
  latitude: "",
  longitude: "",
  note: "",
});
const toNumber = (v: string) => (v.trim() === "" ? null : Number(v));

// Where people were born or died; places can sit inside larger places (city inside a province).
export function Places() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  // Serialized form as loaded for an edit; null when creating.
  const [baseline, setBaseline] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["places", q],
    queryFn: () =>
      api.get<{ items: PlaceSummary[]; total: number }>(
        `/places?limit=200&q=${encodeURIComponent(q)}`,
      ),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["places"] });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        parentId: form.parentId,
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
  const openEdit = (p: PlaceSummary) => {
    const loaded: Form = {
      name: p.name,
      parentId: p.parent?.id ?? null,
      parentName: p.parent?.name ?? null,
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
      <Input
        placeholder="Tìm theo tên..."
        className="mb-4 max-w-sm"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Thuộc</TableHead>
              <TableHead>Toạ độ</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeleton cols={4} />}
            {data?.items.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.parent?.name ?? ""}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {p.latitude != null && p.longitude != null ? `${p.latitude}, ${p.longitude}` : ""}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                    <Pencil />
                  </Button>
                  <ConfirmDelete
                    title={`Xoá địa điểm "${p.name}"?`}
                    description="Không xoá được nếu còn nhân vật hoặc địa điểm con đang dùng nơi này."
                    onConfirm={async () => {
                      await api.del(`/places/${p.id}`);
                      toast.success("Đã xoá");
                      refresh();
                    }}
                    trigger={(openDialog) => (
                      <Button variant="ghost" size="icon" onClick={openDialog}>
                        <Trash2 />
                      </Button>
                    )}
                  />
                </TableCell>
              </TableRow>
            ))}
            {data && data.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                  Chưa có địa điểm nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {data && data.total > data.items.length && (
        <p className="text-muted-foreground mt-3 text-sm">
          Hiển thị {data.items.length}/{data.total} địa điểm. Gõ tên để thu hẹp danh sách.
        </p>
      )}

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
