import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from "@lineagraph/ui";
import { NotFound } from "../components/NotFound";
import { AttributesField } from "../components/AttributesField";
import { CitationsPanel } from "../components/CitationsPanel";
import { DateField, cleanDate } from "../components/DateField";
import { Field } from "../components/Field";
import { FormSkeleton } from "../components/FormSkeleton";
import { NamesField, emptyNames } from "../components/NamesField";
import { NodeGraph } from "../components/NodeGraph";
import { RelationsPanel } from "../components/RelationsPanel";
import { TenuresPanel } from "../components/TenuresPanel";
import { api } from "../lib/api";
import { toDateInput } from "../lib/format";
import { errorMessage, useRegistry } from "../lib/hooks";
import type { AttributeValue, DateInput, DateValue, NameValue } from "../lib/types";

type Form = {
  names: NameValue[];
  polityType: string;
  summary: string;
  body: string;
  attributes: AttributeValue[];
  started: DateInput | null;
  ended: DateInput | null;
};
const emptyForm = (): Form => ({
  names: emptyNames(),
  polityType: "dynasty",
  summary: "",
  body: "",
  attributes: [],
  started: null,
  ended: null,
});
type EditData = Omit<Form, "started" | "ended" | "summary" | "body"> & {
  id: string;
  slug: string;
  summary: string | null;
  body: string | null;
  started: DateValue | null;
  ended: DateValue | null;
};

export function PolityDetail() {
  const { id = "new" } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: types } = useRegistry("polity_type");
  const [form, setForm] = useState<Form>(emptyForm());

  const { data, isError, isLoading } = useQuery({
    queryKey: ["polity-edit", id],
    enabled: !isNew,
    queryFn: () => api.get<EditData>(`/polities/${id}/edit`),
  });
  useEffect(() => {
    if (data) {
      setForm({
        ...data,
        summary: data.summary ?? "",
        body: data.body ?? "",
        started: toDateInput(data.started),
        ended: toDateInput(data.ended),
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, started: cleanDate(form.started), ended: cleanDate(form.ended) };
      if (isNew) return api.post<{ id: string }>("/polities", body);
      await api.put(`/polities/${id}`, body);
      return { id };
    },
    onSuccess: (result) => {
      toast.success(isNew ? "Đã thêm chính thể" : "Đã lưu");
      queryClient.invalidateQueries({ queryKey: ["polities"] });
      queryClient.invalidateQueries({ queryKey: ["polity-edit", id] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      if (isNew) navigate(`/polities/${result.id}`, { replace: true });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isError)
    return (
      <NotFound
        message="Không tìm thấy chính thể này."
        backTo="/polities"
        backLabel="Về danh sách chính thể"
      />
    );
  const primaryName = form.names.find((n) => n.isPrimary)?.name;

  const info = (
    <form
      className="flex max-w-3xl flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <NamesField value={form.names} onChange={(names) => setForm({ ...form, names })} />
      <Field label="Loại chính thể">
        <Select
          value={form.polityType}
          onValueChange={(polityType) => setForm({ ...form, polityType })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {types?.map((t) => (
              <SelectItem key={t.code} value={t.code}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <DateField
        label="Bắt đầu"
        value={form.started}
        onChange={(started) => setForm({ ...form, started })}
      />
      <DateField
        label="Kết thúc"
        value={form.ended}
        onChange={(ended) => setForm({ ...form, ended })}
      />
      <Field label="Tóm tắt" hint="Một hai câu giới thiệu.">
        <Textarea
          rows={3}
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
        />
      </Field>
      <Field label="Lịch sử chi tiết" hint="Văn bản dài. Xuống dòng để tách đoạn.">
        <Textarea
          rows={10}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
      </Field>
      <AttributesField
        value={form.attributes}
        onChange={(attributes) => setForm({ ...form, attributes })}
      />
      <div>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Đang lưu..." : isNew ? "Tạo chính thể" : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  );

  return (
    <>
      <Link to="/polities" className="mb-3 inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" /> Chính thể
      </Link>
      {!isNew && isLoading ? (
        <Skeleton className="mb-6 h-9 w-56" />
      ) : (
        <h1 className="mb-6">{isNew ? "Thêm chính thể" : (primaryName ?? "...")}</h1>
      )}
      {isNew ? (
        info
      ) : isLoading ? (
        <FormSkeleton />
      ) : (
        <Tabs defaultValue="info">
          <TabsList className="mb-6">
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="relations">Quan hệ</TabsTrigger>
            <TabsTrigger value="graph">Sơ đồ</TabsTrigger>
            <TabsTrigger value="members">Nhân vật</TabsTrigger>
            <TabsTrigger value="sources">Nguồn</TabsTrigger>
          </TabsList>
          <TabsContent value="info">{info}</TabsContent>
          <TabsContent value="graph">
            {data && (
              <NodeGraph node={{ id, kind: "polity", slug: data.slug, name: primaryName ?? "" }} />
            )}
          </TabsContent>
          <TabsContent value="relations">
            {data && (
              <RelationsPanel
                node={{ id, kind: "polity", slug: data.slug, name: primaryName ?? "" }}
              />
            )}
          </TabsContent>
          <TabsContent value="members">
            <TenuresPanel polityId={id} ownerName={primaryName ?? ""} />
          </TabsContent>
          <TabsContent value="sources">
            <CitationsPanel subjectTable="polity" subjectId={id} />
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}
