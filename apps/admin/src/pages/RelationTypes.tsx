import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  Input,
  Label,
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
  toast,
} from "@lineagraph/ui";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { Field } from "../components/Field";
import { FormSheet } from "../components/FormSheet";
import { PageHeader } from "../components/PageHeader";
import { useRelationTypes } from "../components/RelationForm";
import { TableSkeleton } from "../components/TableSkeleton";
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
  code: "",
  label: "",
  category: "other",
  symmetric: false,
  inverseCode: "",
  inverseLabel: "",
  acyclic: false,
  subjectKinds: ["person"],
  objectKinds: ["person"],
});
const ALL_CATEGORIES = "__all__";
const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

type KindsFieldProps = {
  label: string;
  value: NodeKind[];
  onChange: (v: NodeKind[]) => void;
};

function KindsField({ label, value, onChange }: KindsFieldProps) {
  return (
    <Field label={label}>
      <div className="flex gap-4">
        {(["person", "polity"] as NodeKind[]).map((k) => (
          <Label key={k} className="flex items-center gap-2 font-normal">
            <Checkbox
              checked={value.includes(k)}
              onCheckedChange={(c) =>
                onChange(c === true ? [...value, k] : value.filter((x) => x !== k))
              }
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
  const { data, isLoading } = useRelationTypes();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm());
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);
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
    onSuccess: () => {
      toast.success("Đã thêm loại quan hệ");
      setOpen(false);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  // Each pair is stored as two rows; list it once, from its primary side.
  const primaries = data?.filter((t) => t.isPrimary) ?? [];
  const needle = normalize(q.trim());
  const filtered = primaries.filter((t) => {
    if (category !== ALL_CATEGORIES && t.category !== category) return false;
    if (!needle) return true;
    return [t.label, t.code, t.inverseLabel, t.inverseCode].some(
      (s) => s && normalize(s).includes(needle),
    );
  });

  return (
    <>
      <PageHeader
        title="Loại quan hệ"
        description="Các loại quan hệ có thể dùng để nối nhân vật và chính thể. Thêm loại mới (thầy trò, kết nghĩa, thông gia...) không cần sửa code."
        action={
          <Button
            onClick={() => {
              setForm(emptyForm());
              setOpen(true);
            }}
          >
            <Plus /> Thêm loại quan hệ
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Tìm theo tên hoặc mã..."
          className="max-w-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="max-w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>Mọi nhóm</SelectItem>
            {Object.entries(categoryLabels).map(([code, label]) => (
              <SelectItem key={code} value={code}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="bg-card rounded-xl border">
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
            {isLoading && <TableSkeleton cols={5} />}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                  {primaries.length === 0
                    ? "Chưa có loại quan hệ nào"
                    : "Không tìm thấy loại quan hệ phù hợp"}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((t) => (
              <TableRow key={t.code}>
                <TableCell>
                  <div className="font-medium">{t.label}</div>
                  <div className="text-muted-foreground font-mono text-xs">{t.code}</div>
                </TableCell>
                <TableCell>
                  {t.isSymmetric ? (
                    <Badge variant="neutral">Hai chiều như nhau</Badge>
                  ) : (
                    <>
                      <div>{t.inverseLabel}</div>
                      <div className="text-muted-foreground font-mono text-xs">{t.inverseCode}</div>
                    </>
                  )}
                  {t.isAcyclic && (
                    <Badge variant="info" className="mt-1">
                      Không cho vòng lặp
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {t.subjectKinds.map((k) => nodeKindLabels[k]).join(", ")} →{" "}
                  {t.objectKinds.map((k) => nodeKindLabels[k]).join(", ")}
                </TableCell>
                <TableCell>{categoryLabels[t.category] ?? t.category}</TableCell>
                <TableCell className="text-right">
                  <ConfirmDelete
                    title={`Xoá loại quan hệ "${t.label}"?`}
                    description="Không xoá được nếu vẫn còn quan hệ thuộc loại này."
                    onConfirm={async () => {
                      await api.del(`/relation-types/${t.code}`);
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
          </TableBody>
        </Table>
      </div>

      <FormSheet
        open={open}
        onOpenChange={setOpen}
        title="Thêm loại quan hệ"
        saving={create.isPending}
        onSubmit={() => create.mutate()}
      >
        <Field
          label="Tên quan hệ"
          hint='Đọc theo chiều từ đối tượng thứ nhất sang thứ hai, ví dụ "Là thầy của".'
        >
          <Input
            required
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
        </Field>
        <Field label="Mã" hint="Chữ thường, số, gạch dưới. Không đổi được sau khi tạo.">
          <Input
            required
            placeholder="teacher_of"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </Field>
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox
            checked={form.symmetric}
            onCheckedChange={(c) => setForm({ ...form, symmetric: c === true })}
          />
          Hai chiều như nhau (ví dụ “Là bạn của”, “Là đồng minh của”)
        </Label>
        {!form.symmetric && (
          <>
            <Field label="Tên chiều ngược lại" hint='Ví dụ "Là học trò của".'>
              <Input
                required
                value={form.inverseLabel}
                onChange={(e) => setForm({ ...form, inverseLabel: e.target.value })}
              />
            </Field>
            <Field label="Mã chiều ngược lại">
              <Input
                required
                placeholder="student_of"
                value={form.inverseCode}
                onChange={(e) => setForm({ ...form, inverseCode: e.target.value })}
              />
            </Field>
          </>
        )}
        <KindsField
          label="Đối tượng thứ nhất có thể là"
          value={form.subjectKinds}
          onChange={(subjectKinds) => setForm({ ...form, subjectKinds })}
        />
        <KindsField
          label="Đối tượng thứ hai có thể là"
          value={form.objectKinds}
          onChange={(objectKinds) => setForm({ ...form, objectKinds })}
        />
        <Field label="Nhóm">
          <Select
            value={form.category}
            onValueChange={(category) => setForm({ ...form, category })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([code, label]) => (
                <SelectItem key={code} value={code}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox
            checked={form.acyclic}
            onCheckedChange={(c) => setForm({ ...form, acyclic: c === true })}
          />
          Không cho vòng lặp (như cha–con: không ai là tổ tiên của chính mình)
        </Label>
      </FormSheet>
    </>
  );
}
