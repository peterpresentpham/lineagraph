import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, Checkbox, Input, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, toast } from "@lineagraph/ui";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { Field, NativeSelect } from "../components/Field";
import { FormSheet } from "../components/FormSheet";
import { PageHeader } from "../components/PageHeader";
import { useRelationTypes } from "../components/RelationForm";
import { api } from "../lib/api";
import { categoryLabels, nodeKindLabels } from "../lib/format";
import { errorMessage } from "../lib/hooks";
import type { NodeKind } from "../lib/types";

type Form = {
  code: string;
  label: string;
  category: string;
  symmetric: boolean;
  inverseCode: string;
  inverseLabel: string;
  acyclic: boolean;
  subjectKinds: NodeKind[];
  objectKinds: NodeKind[];
};
const emptyForm = (): Form => ({
  code: "", label: "", category: "other", symmetric: false, inverseCode: "", inverseLabel: "", acyclic: false,
  subjectKinds: ["person"], objectKinds: ["person"],
});

function KindsField({ label, value, onChange }: { label: string; value: NodeKind[]; onChange: (v: NodeKind[]) => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-4">
        {(["person", "polity"] as NodeKind[]).map((k) => (
          <Label key={k} className="flex items-center gap-2 font-normal">
            <Checkbox
              checked={value.includes(k)}
              onCheckedChange={(c) => onChange(c === true ? [...value, k] : value.filter((x) => x !== k))}
            />
            {nodeKindLabels[k]}
          </Label>
        ))}
      </div>
    </Field>
  );
}

export function RelationTypes() {
  const queryClient = useQueryClient();
  const { data } = useRelationTypes();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm());
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["relation-types"] });

  const create = useMutation({
    mutationFn: () =>
      api.post("/relation-types", {
        code: form.code,
        label: form.label,
        category: form.category,
        isSymmetric: form.symmetric,
        isAcyclic: form.acyclic,
        inverseCode: form.symmetric ? null : form.inverseCode,
        inverseLabel: form.symmetric ? null : form.inverseLabel,
        subjectKinds: form.subjectKinds,
        objectKinds: form.objectKinds,
      }),
    onSuccess: () => { toast.success("Đã thêm loại quan hệ"); setOpen(false); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  // Each pair is stored as two rows; list it once, from its primary side.
  const primaries = data?.filter((t) => t.isPrimary) ?? [];

  return (
    <>
      <PageHeader
        title="Loại quan hệ"
        description="Các loại quan hệ có thể dùng để nối nhân vật và chính thể. Thêm loại mới (thầy trò, kết nghĩa, thông gia...) không cần sửa code."
        action={<Button onClick={() => { setForm(emptyForm()); setOpen(true); }}><Plus /> Thêm loại quan hệ</Button>}
      />
      <div className="rounded-[var(--radius)] border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quan hệ</TableHead>
              <TableHead>Chiều ngược</TableHead>
              <TableHead>Áp dụng cho</TableHead>
              <TableHead>Nhóm</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {primaries.map((t) => (
              <TableRow key={t.code}>
                <TableCell>
                  <div className="font-medium">{t.label}</div>
                  <div className="font-mono text-xs text-muted-foreground">{t.code}</div>
                </TableCell>
                <TableCell>
                  {t.isSymmetric ? <Badge variant="neutral">Hai chiều như nhau</Badge> : (
                    <>
                      <div>{t.inverseLabel}</div>
                      <div className="font-mono text-xs text-muted-foreground">{t.inverseCode}</div>
                    </>
                  )}
                  {t.isAcyclic && <Badge variant="info" className="mt-1">Không cho vòng lặp</Badge>}
                </TableCell>
                <TableCell className="text-sm">
                  {t.subjectKinds.map((k) => nodeKindLabels[k]).join(", ")} → {t.objectKinds.map((k) => nodeKindLabels[k]).join(", ")}
                </TableCell>
                <TableCell>{categoryLabels[t.category] ?? t.category}</TableCell>
                <TableCell className="text-right">
                  <ConfirmDelete
                    title={`Xoá loại quan hệ "${t.label}"?`}
                    description="Không xoá được nếu vẫn còn quan hệ thuộc loại này."
                    onConfirm={async () => { await api.del(`/relation-types/${t.code}`); toast.success("Đã xoá"); refresh(); }}
                    trigger={(openDialog) => <Button variant="ghost" size="icon" onClick={openDialog}><Trash2 /></Button>}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FormSheet open={open} onOpenChange={setOpen} title="Thêm loại quan hệ" saving={create.isPending} onSubmit={() => create.mutate()}>
        <Field label="Tên quan hệ" hint='Đọc theo chiều từ đối tượng thứ nhất sang thứ hai, ví dụ "Là thầy của".'>
          <Input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        </Field>
        <Field label="Mã" hint="Chữ thường, số, gạch dưới. Không đổi được sau khi tạo.">
          <Input required placeholder="teacher_of" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </Field>
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox checked={form.symmetric} onCheckedChange={(c) => setForm({ ...form, symmetric: c === true })} />
          Hai chiều như nhau (ví dụ "Là bạn của", "Là đồng minh của")
        </Label>
        {!form.symmetric && (
          <>
            <Field label="Tên chiều ngược lại" hint='Ví dụ "Là học trò của".'>
              <Input required value={form.inverseLabel} onChange={(e) => setForm({ ...form, inverseLabel: e.target.value })} />
            </Field>
            <Field label="Mã chiều ngược lại">
              <Input required placeholder="student_of" value={form.inverseCode} onChange={(e) => setForm({ ...form, inverseCode: e.target.value })} />
            </Field>
          </>
        )}
        <KindsField label="Đối tượng thứ nhất có thể là" value={form.subjectKinds} onChange={(subjectKinds) => setForm({ ...form, subjectKinds })} />
        <KindsField label="Đối tượng thứ hai có thể là" value={form.objectKinds} onChange={(objectKinds) => setForm({ ...form, objectKinds })} />
        <Field label="Nhóm">
          <NativeSelect value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {Object.entries(categoryLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </NativeSelect>
        </Field>
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox checked={form.acyclic} onCheckedChange={(c) => setForm({ ...form, acyclic: c === true })} />
          Không cho vòng lặp (như cha–con: không ai là tổ tiên của chính mình)
        </Label>
      </FormSheet>
    </>
  );
}
