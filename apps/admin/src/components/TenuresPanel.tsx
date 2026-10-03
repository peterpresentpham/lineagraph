import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, toast } from "@lineagraph/ui";
import { api } from "../lib/api";
import { toDateInput } from "../lib/format";
import { errorMessage, labelOf, useRegistry } from "../lib/hooks";
import type { DateInput, DateValue } from "../lib/types";
import { ConfirmDelete } from "./ConfirmDelete";
import { DateField, cleanDate } from "./DateField";
import { EntityPicker } from "./EntityPicker";
import { Field, NativeSelect } from "./Field";
import { FormSheet } from "./FormSheet";

type Row = {
  id: string;
  person: { id: string; name: string };
  polity: { id: string; name: string } | null;
  officeType: string;
  start: DateValue | null;
  end: DateValue | null;
  seq: number | null;
};
type Era = { name: string; start: DateInput | null; end: DateInput | null };
type Form = {
  personId: string | null;
  polityId: string | null;
  officeType: string;
  successionMode: string;
  seq: string;
  start: DateInput | null;
  end: DateInput | null;
  eras: Era[];
};
const emptyForm = (personId: string | null, polityId: string | null): Form => ({
  personId, polityId, officeType: "emperor", successionMode: "", seq: "", start: null, end: null, eras: [],
});

// Offices held by one person, or held in one polity, with the era names (niên hiệu).
export function TenuresPanel({
  personId,
  polityId,
  ownerName,
}: {
  personId?: string;
  polityId?: string;
  ownerName: string;
}) {
  const queryClient = useQueryClient();
  const { data: offices } = useRegistry("office_type");
  const { data: modes } = useRegistry("succession_mode");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Form>(emptyForm(personId ?? null, polityId ?? null));

  const filter = personId ? `personId=${personId}` : `polityId=${polityId}`;
  const { data } = useQuery({
    queryKey: ["tenures", filter],
    queryFn: () => api.get<Row[]>(`/tenures?${filter}`),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["tenures"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        personId: form.personId,
        polityId: form.polityId,
        officeType: form.officeType,
        successionMode: form.successionMode || null,
        seq: form.seq === "" ? null : Number(form.seq),
        start: cleanDate(form.start),
        end: cleanDate(form.end),
        eras: form.eras.map((e) => ({ ...e, start: cleanDate(e.start), end: cleanDate(e.end) })),
      };
      return editing ? api.put(`/tenures/${editing.id}`, body) : api.post("/tenures", body);
    },
    onSuccess: () => {
      toast.success(editing ? "Đã cập nhật chức vụ" : "Đã thêm chức vụ");
      setOpen(false);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(personId ?? null, polityId ?? null));
    setOpen(true);
  };
  const openEdit = async (row: Row) => {
    try {
      const d = await api.get<{
        personId: string; polityId: string | null; officeType: string; successionMode: string | null; seq: number | null;
        start: DateValue | null; end: DateValue | null;
        eras: { name: string; start: DateValue | null; end: DateValue | null }[];
      }>(`/tenures/${row.id}`);
      setEditing(row);
      setForm({
        personId: d.personId, polityId: d.polityId, officeType: d.officeType, successionMode: d.successionMode ?? "",
        seq: d.seq?.toString() ?? "", start: toDateInput(d.start), end: toDateInput(d.end),
        eras: d.eras.map((e) => ({ name: e.name, start: toDateInput(e.start), end: toDateInput(e.end) })),
      });
      setOpen(true);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const setEra = (index: number, patch: Partial<Era>) =>
    setForm({ ...form, eras: form.eras.map((e, i) => (i === index ? { ...e, ...patch } : e)) });
  const eraYear = (date: DateInput | null) => (date && !Number.isNaN(date.year) ? date.year : "");
  const withYear = (date: DateInput | null, value: string): DateInput | null =>
    value === "" ? null : { month: null, day: null, approximate: false, ...date, year: Number(value) };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {personId ? "Chức vụ nhân vật này từng giữ." : "Những người từng giữ chức vụ trong chính thể này."}
        </p>
        <Button onClick={openCreate}><Plus /> Thêm chức vụ</Button>
      </div>
      <div className="rounded-[var(--radius)] border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {personId ? <TableHead>Chính thể</TableHead> : <TableHead>Nhân vật</TableHead>}
              <TableHead>Chức vụ</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{personId ? t.polity?.name : t.person.name}</TableCell>
                <TableCell>{labelOf(offices, t.officeType)}{t.seq != null ? ` · thứ ${t.seq}` : ""}</TableCell>
                <TableCell>{t.start || t.end ? `${t.start?.label ?? "?"} – ${t.end?.label ?? "?"}` : ""}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil /></Button>
                  <ConfirmDelete
                    title="Xoá chức vụ này?"
                    description={`${t.person.name} – ${labelOf(offices, t.officeType)}`}
                    onConfirm={async () => { await api.del(`/tenures/${t.id}`); toast.success("Đã xoá chức vụ"); refresh(); }}
                    trigger={(openDialog) => <Button variant="ghost" size="icon" onClick={openDialog}><Trash2 /></Button>}
                  />
                </TableCell>
              </TableRow>
            ))}
            {data && data.length === 0 && (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Chưa có chức vụ nào</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FormSheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Sửa chức vụ" : "Thêm chức vụ"}
        saving={save.isPending}
        onSubmit={() => save.mutate()}
      >
        <Field label="Nhân vật">
          {personId ? (
            <div className="flex h-11 items-center rounded-[var(--radius)] border bg-muted px-3 text-[15px]">{ownerName}</div>
          ) : (
            <EntityPicker kinds={["person"]} value={form.personId} selectedName={editing?.person.name} onChange={(id) => setForm({ ...form, personId: id })} />
          )}
        </Field>
        <Field label="Chính thể" hint="Bỏ trống nếu chức vụ không thuộc chính thể nào.">
          {polityId ? (
            <div className="flex h-11 items-center rounded-[var(--radius)] border bg-muted px-3 text-[15px]">{ownerName}</div>
          ) : (
            <EntityPicker kinds={["polity"]} value={form.polityId} selectedName={editing?.polity?.name} onChange={(id) => setForm({ ...form, polityId: id })} />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Chức vụ">
            <NativeSelect value={form.officeType} onChange={(e) => setForm({ ...form, officeType: e.target.value })}>
              {offices?.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Cách lên nắm quyền">
            <NativeSelect value={form.successionMode} onChange={(e) => setForm({ ...form, successionMode: e.target.value })}>
              <option value="">Không rõ</option>
              {modes?.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
            </NativeSelect>
          </Field>
        </div>
        <Field label="Thứ tự trong chính thể" hint="Ví dụ vua thứ 1, thứ 2 của triều đại.">
          <Input type="number" className="w-28" value={form.seq} onChange={(e) => setForm({ ...form, seq: e.target.value })} />
        </Field>
        <DateField label="Bắt đầu" value={form.start} onChange={(start) => setForm({ ...form, start })} />
        <DateField label="Kết thúc" value={form.end} onChange={(end) => setForm({ ...form, end })} />
        <Field label="Niên hiệu">
          <div className="flex flex-col gap-2">
            {form.eras.map((era, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input placeholder="Tên niên hiệu" value={era.name} onChange={(e) => setEra(i, { name: e.target.value })} />
                <Input type="number" placeholder="Từ năm" className="w-28" value={eraYear(era.start)} onChange={(e) => setEra(i, { start: withYear(era.start, e.target.value) })} />
                <Input type="number" placeholder="Đến năm" className="w-28" value={eraYear(era.end)} onChange={(e) => setEra(i, { end: withYear(era.end, e.target.value) })} />
                <Button type="button" variant="ghost" size="icon" onClick={() => setForm({ ...form, eras: form.eras.filter((_, j) => j !== i) })}><Trash2 /></Button>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => setForm({ ...form, eras: [...form.eras, { name: "", start: null, end: null }] })}>
              <Plus /> Thêm niên hiệu
            </Button>
          </div>
        </Field>
      </FormSheet>
    </div>
  );
}
