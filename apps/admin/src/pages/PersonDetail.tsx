import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, toast } from "@lineagraph/ui";
import { NotFound } from "../components/NotFound";
import { AttributesField } from "../components/AttributesField";
import { CitationsPanel } from "../components/CitationsPanel";
import { DateField, cleanDate } from "../components/DateField";
import { Field, NativeSelect } from "../components/Field";
import { NamesField, emptyNames } from "../components/NamesField";
import { NodeGraph } from "../components/NodeGraph";
import { RelationsPanel } from "../components/RelationsPanel";
import { TenuresPanel } from "../components/TenuresPanel";
import { api } from "../lib/api";
import { historicityLabels, sexLabels, toDateInput } from "../lib/format";
import { errorMessage } from "../lib/hooks";
import type { AttributeValue, DateInput, DateValue, NameValue } from "../lib/types";

type Form = {
  names: NameValue[];
  sex: string;
  historicity: string;
  summary: string;
  body: string;
  attributes: AttributeValue[];
  birth: DateInput | null;
  death: DateInput | null;
};
const emptyForm = (): Form => ({
  names: emptyNames(), sex: "unknown", historicity: "historical", summary: "", body: "", attributes: [], birth: null, death: null,
});
type EditData = Omit<Form, "birth" | "death" | "summary" | "body"> & {
  id: string; slug: string; summary: string | null; body: string | null; birth: DateValue | null; death: DateValue | null;
};

// One page per person: basic info, free-form attributes, relationships, offices held and sources.
export function PersonDetail() {
  const { id = "new" } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(emptyForm());

  const { data, isError } = useQuery({
    queryKey: ["person-edit", id],
    enabled: !isNew,
    queryFn: () => api.get<EditData>(`/persons/${id}/edit`),
  });

  useEffect(() => {
    if (data) {
      setForm({ ...data, summary: data.summary ?? "", body: data.body ?? "", birth: toDateInput(data.birth), death: toDateInput(data.death) });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, birth: cleanDate(form.birth), death: cleanDate(form.death) };
      if (isNew) return api.post<{ id: string }>("/persons", body);
      await api.put(`/persons/${id}`, body);
      return { id };
    },
    onSuccess: (result) => {
      toast.success(isNew ? "Đã thêm nhân vật" : "Đã lưu");
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      queryClient.invalidateQueries({ queryKey: ["person-edit", id] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      if (isNew) navigate(`/persons/${result.id}`, { replace: true });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isError) return <NotFound message="Không tìm thấy nhân vật này." backTo="/persons" backLabel="Về danh sách nhân vật" />;
  const primaryName = form.names.find((n) => n.isPrimary)?.name;

  const info = (
    <form
      className="flex max-w-3xl flex-col gap-5"
      onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
    >
      <NamesField value={form.names} onChange={(names) => setForm({ ...form, names })} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Giới tính">
          <NativeSelect value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
            {Object.entries(sexLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Tính xác thực">
          <NativeSelect value={form.historicity} onChange={(e) => setForm({ ...form, historicity: e.target.value })}>
            {Object.entries(historicityLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </NativeSelect>
        </Field>
      </div>
      <DateField label="Ngày sinh" value={form.birth} onChange={(birth) => setForm({ ...form, birth })} />
      <DateField label="Ngày mất" value={form.death} onChange={(death) => setForm({ ...form, death })} />
      <Field label="Tóm tắt" hint="Một hai câu giới thiệu, hiện ở đầu trang và trong kết quả tìm kiếm.">
        <Textarea rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
      </Field>
      <Field label="Tiểu sử chi tiết" hint="Văn bản dài. Xuống dòng để tách đoạn.">
        <Textarea rows={10} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
      </Field>
      <AttributesField value={form.attributes} onChange={(attributes) => setForm({ ...form, attributes })} />
      <div><Button type="submit" disabled={save.isPending}>{save.isPending ? "Đang lưu..." : isNew ? "Tạo nhân vật" : "Lưu thay đổi"}</Button></div>
    </form>
  );

  return (
    <>
      <Link to="/persons" className="mb-3 inline-flex items-center gap-1 text-sm"><ArrowLeft className="size-4" /> Nhân vật</Link>
      <h1 className="mb-6">{isNew ? "Thêm nhân vật" : (primaryName ?? "...")}</h1>
      {isNew ? (
        info
      ) : (
        <Tabs defaultValue="info">
          <TabsList className="mb-6">
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="relations">Quan hệ</TabsTrigger>
            <TabsTrigger value="graph">Sơ đồ</TabsTrigger>
            <TabsTrigger value="tenures">Chức vụ</TabsTrigger>
            <TabsTrigger value="sources">Nguồn</TabsTrigger>
          </TabsList>
          <TabsContent value="info">{info}</TabsContent>
          <TabsContent value="graph">
            {data && <NodeGraph node={{ id, kind: "person", slug: data.slug, name: primaryName ?? "" }} />}
          </TabsContent>
          <TabsContent value="relations">
            {data && <RelationsPanel node={{ id, kind: "person", slug: data.slug, name: primaryName ?? "" }} />}
          </TabsContent>
          <TabsContent value="tenures"><TenuresPanel personId={id} ownerName={primaryName ?? ""} /></TabsContent>
          <TabsContent value="sources"><CitationsPanel subjectTable="person" subjectId={id} /></TabsContent>
        </Tabs>
      )}
    </>
  );
}
