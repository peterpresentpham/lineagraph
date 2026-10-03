import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
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
import { api } from "../lib/api";
import { errorMessage } from "../lib/hooks";
import { ConfirmDelete } from "./ConfirmDelete";
import { Field } from "./Field";
import { FormSheet } from "./FormSheet";

type Citation = {
  id: string;
  locator: string | null;
  quote: string | null;
  confidence: number;
  source: { id: string; title: string; author: string | null; url: string | null };
};
type Source = { id: string; title: string; author: string | null };

type Props = {
  subjectTable: "person" | "polity";
  subjectId: string;
};

// Sources that back the facts about one person or polity.
export function CitationsPanel({ subjectTable, subjectId }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ sourceId: "", locator: "", quote: "", confidence: "3" });

  const { data } = useQuery({
    queryKey: ["citations", subjectTable, subjectId],
    queryFn: () =>
      api.get<Citation[]>(`/citations?subjectTable=${subjectTable}&subjectId=${subjectId}`),
  });
  const { data: sources } = useQuery({
    queryKey: ["sources"],
    queryFn: () => api.get<Source[]>("/sources"),
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["citations", subjectTable, subjectId] });

  const save = useMutation({
    mutationFn: () => {
      if (!form.sourceId) throw new Error("Chọn nguồn trước khi lưu");
      return api.post("/citations", {
        subjectTable,
        subjectId,
        sourceId: form.sourceId,
        locator: form.locator || null,
        quote: form.quote || null,
        confidence: Number(form.confidence),
      });
    },
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
        <p className="text-muted-foreground text-sm">
          Nguồn tư liệu dẫn chứng cho thông tin ở trên. Tạo nguồn mới ở trang Nguồn tư liệu.
        </p>
        <Button
          onClick={() => {
            setForm({ sourceId: "", locator: "", quote: "", confidence: "3" });
            setOpen(true);
          }}
        >
          <Plus /> Thêm nguồn
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {data?.map((c) => (
          <div
            key={c.id}
            className="bg-card rounded-(--radius) flex items-start justify-between gap-3 border p-4"
          >
            <div className="text-sm">
              <div className="font-medium">
                {c.source.title}
                {c.source.author && (
                  <span className="text-muted-foreground font-normal"> — {c.source.author}</span>
                )}
              </div>
              {c.locator && <div className="text-muted-foreground">{c.locator}</div>}
              {c.quote && (
                <blockquote className="text-muted-foreground mt-1 border-l-2 pl-3">
                  {c.quote}
                </blockquote>
              )}
              <div className="text-muted-foreground mt-1 text-xs">
                Độ chắc chắn: {c.confidence}/5
              </div>
            </div>
            <ConfirmDelete
              title="Xoá trích dẫn này?"
              description={c.source.title}
              onConfirm={async () => {
                await api.del(`/citations/${c.id}`);
                toast.success("Đã xoá trích dẫn");
                refresh();
              }}
              trigger={(openDialog) => (
                <Button variant="ghost" size="icon" onClick={openDialog}>
                  <Trash2 />
                </Button>
              )}
            />
          </div>
        ))}
        {data && data.length === 0 && (
          <p className="text-muted-foreground rounded-(--radius) border border-dashed p-8 text-center">
            Chưa có nguồn nào.
          </p>
        )}
      </div>

      <FormSheet
        open={open}
        onOpenChange={setOpen}
        title="Thêm nguồn trích dẫn"
        saving={save.isPending}
        onSubmit={() => save.mutate()}
      >
        <Field label="Nguồn">
          <Select
            value={form.sourceId}
            onValueChange={(sourceId) => setForm({ ...form, sourceId })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn nguồn..." />
            </SelectTrigger>
            <SelectContent>
              {sources?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}
                  {s.author ? ` — ${s.author}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Vị trí trong nguồn" hint="Ví dụ: Bản kỷ, quyển 11, tr. 45.">
          <Input
            value={form.locator}
            onChange={(e) => setForm({ ...form, locator: e.target.value })}
          />
        </Field>
        <Field label="Trích nguyên văn">
          <Textarea
            rows={3}
            value={form.quote}
            onChange={(e) => setForm({ ...form, quote: e.target.value })}
          />
        </Field>
        <Field label="Độ chắc chắn">
          <Select
            value={form.confidence}
            onValueChange={(confidence) => setForm({ ...form, confidence })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}/5
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FormSheet>
    </div>
  );
}
