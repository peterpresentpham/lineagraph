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
import { TableSkeleton } from "../components/TableSkeleton";
import { api } from "../lib/api";
import { errorMessage } from "../lib/hooks";

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

export function Sources() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  // Serialized form as loaded for an edit; null when creating.
  const [baseline, setBaseline] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sources"],
    queryFn: () => api.get<Source[]>("/sources"),
  });
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
          <Button
            onClick={() => {
              setEditingId(null);
              setBaseline(null);
              setForm(emptyForm());
              setOpen(true);
            }}
          >
            <Plus /> Thêm nguồn
          </Button>
        }
      />
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Tác giả</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Độ tin cậy</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeleton cols={5} />}
            {data?.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.title}</TableCell>
                <TableCell>{s.author}</TableCell>
                <TableCell>{s.kind}</TableCell>
                <TableCell>{s.reliability ? `${s.reliability}/5` : ""}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                    <Pencil />
                  </Button>
                  <ConfirmDelete
                    title={`Xoá "${s.title}"?`}
                    description="Không xoá được nếu nguồn đang được dùng để dẫn chứng."
                    onConfirm={async () => {
                      await api.del(`/sources/${s.id}`);
                      toast.success("Đã xoá nguồn");
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
            {data && data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                  Chưa có nguồn nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
