import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Textarea, toast } from "@lineagraph/ui";
import { api } from "../lib/api";
import { errorMessage } from "../lib/hooks";
import { ConfirmDelete } from "./ConfirmDelete";
import { Field, NativeSelect } from "./Field";
import { FormSheet } from "./FormSheet";

type Citation = {
  id: string;
  locator: string | null;
  quote: string | null;
  confidence: number;
  source: { id: string; title: string; author: string | null; url: string | null };
};
type Source = { id: string; title: string; author: string | null };

// Sources that back the facts about one person or polity.
export function CitationsPanel({ subjectTable, subjectId }: { subjectTable: "person" | "polity"; subjectId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ sourceId: "", locator: "", quote: "", confidence: "3" });

  const { data } = useQuery({
    queryKey: ["citations", subjectTable, subjectId],
    queryFn: () => api.get<Citation[]>(`/citations?subjectTable=${subjectTable}&subjectId=${subjectId}`),
  });
  const { data: sources } = useQuery({ queryKey: ["sources"], queryFn: () => api.get<Source[]>("/sources") });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["citations", subjectTable, subjectId] });

  const save = useMutation({
    mutationFn: () =>
      api.post("/citations", {
        subjectTable, subjectId, sourceId: form.sourceId,
        locator: form.locator || null, quote: form.quote || null, confidence: Number(form.confidence),
      }),
    onSuccess: () => {
      toast.success("Đã thêm nguồn trích dẫn");
      setOpen(false);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Nguồn tư liệu dẫn chứng cho thông tin ở trên. Tạo nguồn mới ở trang Nguồn tư liệu.</p>
        <Button onClick={() => { setForm({ sourceId: "", locator: "", quote: "", confidence: "3" }); setOpen(true); }}><Plus /> Thêm nguồn</Button>
      </div>
      <div className="flex flex-col gap-2">
        {data?.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-3 rounded-[var(--radius)] border bg-card p-4">
            <div className="text-sm">
              <div className="font-medium">{c.source.title}{c.source.author && <span className="font-normal text-muted-foreground"> — {c.source.author}</span>}</div>
              {c.locator && <div className="text-muted-foreground">{c.locator}</div>}
              {c.quote && <blockquote className="mt-1 border-l-2 pl-3 text-muted-foreground">{c.quote}</blockquote>}
              <div className="mt-1 text-xs text-muted-foreground">Độ chắc chắn: {c.confidence}/5</div>
            </div>
            <ConfirmDelete
              title="Xoá trích dẫn này?"
              description={c.source.title}
              onConfirm={async () => { await api.del(`/citations/${c.id}`); toast.success("Đã xoá trích dẫn"); refresh(); }}
              trigger={(openDialog) => <Button variant="ghost" size="icon" onClick={openDialog}><Trash2 /></Button>}
            />
          </div>
        ))}
        {data && data.length === 0 && (
          <p className="rounded-[var(--radius)] border border-dashed p-8 text-center text-muted-foreground">Chưa có nguồn nào.</p>
        )}
      </div>

      <FormSheet open={open} onOpenChange={setOpen} title="Thêm nguồn trích dẫn" saving={save.isPending} onSubmit={() => save.mutate()}>
        <Field label="Nguồn">
          <NativeSelect required value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })}>
            <option value="">Chọn nguồn...</option>
            {sources?.map((s) => <option key={s.id} value={s.id}>{s.title}{s.author ? ` — ${s.author}` : ""}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Vị trí trong nguồn" hint="Ví dụ: Bản kỷ, quyển 11, tr. 45.">
          <Input value={form.locator} onChange={(e) => setForm({ ...form, locator: e.target.value })} />
        </Field>
        <Field label="Trích nguyên văn">
          <Textarea rows={3} value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} />
        </Field>
        <Field label="Độ chắc chắn">
          <NativeSelect value={form.confidence} onChange={(e) => setForm({ ...form, confidence: e.target.value })}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5</option>)}
          </NativeSelect>
        </Field>
      </FormSheet>
    </div>
  );
}
