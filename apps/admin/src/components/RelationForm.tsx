import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Checkbox, Input, Label, Textarea, toast } from "@lineagraph/ui";
import { api } from "../lib/api";
import { toDateInput, variantOptions } from "../lib/format";
import { errorMessage } from "../lib/hooks";
import type { DateInput, NodeKind, NodeRef, RelationType, RelationshipView } from "../lib/types";
import { DateField, cleanDate } from "./DateField";
import { EntityPicker } from "./EntityPicker";
import { Field, NativeSelect } from "./Field";
import { FormSheet } from "./FormSheet";

type Form = {
  type: string;
  fromId: string | null;
  toId: string | null;
  variant: string;
  label: string;
  note: string;
  disputed: boolean;
  start: DateInput | null;
  end: DateInput | null;
};

const emptyForm = (fromId: string | null): Form => ({
  type: "", fromId, toId: null, variant: "", label: "", note: "", disputed: false, start: null, end: null,
});

export const useRelationTypes = () =>
  useQuery({ queryKey: ["relation-types"], queryFn: () => api.get<RelationType[]>("/relation-types"), staleTime: 60_000 });

// Create or edit one relationship. When opened from a person's or polity's page, `fixedFrom`
// pins the first end so the admin only picks the type and the other end.
export function RelationForm({
  open,
  onOpenChange,
  editingId,
  fixedFrom,
  preset,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId?: string | null;
  fixedFrom?: NodeRef;
  /** Start a new relationship with both ends already chosen (for example from the graph). */
  preset?: { from: NodeRef; to: NodeRef };
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: types } = useRelationTypes();
  const [form, setForm] = useState<Form>(emptyForm(fixedFrom?.id ?? null));
  const [names, setNames] = useState<{ from?: string; to?: string }>({ from: fixedFrom?.name });
  const [fromKind, setFromKind] = useState<NodeKind | null>(fixedFrom?.kind ?? null);

  useEffect(() => {
    if (!open) return;
    if (!editingId) {
      setForm({ ...emptyForm(preset?.from.id ?? fixedFrom?.id ?? null), toId: preset?.to.id ?? null });
      setNames({ from: preset?.from.name ?? fixedFrom?.name, to: preset?.to.name });
      setFromKind(preset?.from.kind ?? fixedFrom?.kind ?? null);
      return;
    }
    api.get<RelationshipView & { fromId: string; toId: string }>(`/relationships/${editingId}`).then((r) => {
      setForm({
        type: r.type, fromId: r.fromId, toId: r.toId, variant: r.variant ?? "", label: r.label ?? "", note: r.note ?? "",
        disputed: r.disputed, start: toDateInput(r.start), end: toDateInput(r.end),
      });
      setNames({ from: r.from.name, to: r.to.name });
      setFromKind(r.from.kind);
    }).catch((e) => toast.error(errorMessage(e)));
  }, [open, editingId, fixedFrom?.id, preset?.from.id, preset?.to.id]);

  const selected = types?.find((t) => t.code === form.type);
  // Offer every type whose first end can be this kind (both sides of each pair, so the admin
  // picks the direction in natural words: "Là cha của" or "Là con của").
  const options = (types ?? []).filter((t) => !fromKind || t.subjectKinds.includes(fromKind));
  const variants = form.type ? variantOptions[form.type] : undefined;

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        variant: form.variant || null,
        label: form.label || null,
        note: form.note || null,
        start: cleanDate(form.start),
        end: cleanDate(form.end),
      };
      return editingId ? api.put(`/relationships/${editingId}`, body) : api.post("/relationships", body);
    },
    onSuccess: () => {
      toast.success(editingId ? "Đã cập nhật quan hệ" : "Đã thêm quan hệ");
      onOpenChange(false);
      onSaved?.();
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const sentence = form.type && names.from && names.to ? `${names.from} · ${selected?.label ?? form.type} · ${names.to}` : null;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={editingId ? "Sửa quan hệ" : "Thêm quan hệ"}
      description="Nối hai nhân vật hoặc chính thể bằng một loại quan hệ bất kỳ. Thêm loại mới ở trang Loại quan hệ."
      saving={save.isPending}
      onSubmit={() => save.mutate()}
    >
      <Field label="Đối tượng thứ nhất">
        {fixedFrom ? (
          <div className="flex h-11 items-center rounded-[var(--radius)] border bg-muted px-3 text-[15px]">{fixedFrom.name}</div>
        ) : (
          <EntityPicker
            key={`from-${editingId ?? "new"}-${open}`}
            kinds={["person", "polity"]}
            value={form.fromId}
            selectedName={names.from}
            onChange={(id, ref) => {
              setForm({ ...form, fromId: id, type: "" });
              setNames({ ...names, from: ref?.name });
              setFromKind(ref?.kind ?? null);
            }}
          />
        )}
      </Field>
      <Field label="Loại quan hệ">
        <NativeSelect value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, toId: null, variant: "" })}>
          <option value="">Chọn loại quan hệ...</option>
          {options.map((t) => (
            <option key={t.code} value={t.code}>{t.label}</option>
          ))}
        </NativeSelect>
      </Field>
      {form.type && (
        <Field label="Đối tượng thứ hai">
          <EntityPicker
            key={`to-${form.type}-${editingId ?? "new"}-${open}`}
            kinds={selected?.objectKinds ?? ["person", "polity"]}
            value={form.toId}
            selectedName={names.to}
            onChange={(id, ref) => {
              setForm({ ...form, toId: id });
              setNames({ ...names, to: ref?.name });
            }}
          />
        </Field>
      )}
      {sentence && <p className="rounded-[var(--radius)] border border-dashed bg-accent px-3 py-2 text-sm">{sentence}</p>}

      {variants ? (
        <Field label="Loại cụ thể">
          <NativeSelect value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })}>
            <option value="">Không rõ</option>
            {variants.map((v) => <option key={v.code} value={v.code}>{v.label}</option>)}
          </NativeSelect>
        </Field>
      ) : null}
      <Field label="Nhãn hiển thị" hint='Ví dụ "Hoàng hậu", "Quân sư". Hiện kèm bên cạnh quan hệ.'>
        <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
      </Field>
      <DateField label="Bắt đầu" value={form.start} onChange={(start) => setForm({ ...form, start })} />
      <DateField label="Kết thúc" value={form.end} onChange={(end) => setForm({ ...form, end })} />
      <Field label="Ghi chú">
        <Textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </Field>
      <Label className="flex items-center gap-2 font-normal">
        <Checkbox checked={form.disputed} onCheckedChange={(c) => setForm({ ...form, disputed: c === true })} />
        Còn tranh cãi (ẩn khỏi kết quả tìm mối liên hệ trừ khi người xem bật)
      </Label>
    </FormSheet>
  );
}
