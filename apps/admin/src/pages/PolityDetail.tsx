import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  toast,
} from "@lineagraph/ui";
import { AttributesField } from "../components/AttributesField";
import { Breadcrumb } from "../components/Breadcrumb";
import { CitationsPanel } from "../components/CitationsPanel";
import { DateField, cleanDate } from "../components/DateField";
import { DetailLayout, type OutlineItem } from "../components/detail/DetailLayout";
import { SaveBar } from "../components/detail/SaveBar";
import { SectionCard } from "../components/detail/SectionCard";
import { Field } from "../components/Field";
import { FormSkeleton } from "../components/FormSkeleton";
import { NamesField, emptyNames } from "../components/NamesField";
import { NodeGraph } from "../components/NodeGraph";
import { NotFound } from "../components/NotFound";
import { RelationsPanel } from "../components/RelationsPanel";
import { TenuresPanel } from "../components/TenuresPanel";
import { api } from "../lib/api";
import { toDateInput } from "../lib/format";
import { errorMessage, useRegistry, useSaveShortcut, useUnsavedChangesGuard } from "../lib/hooks";
import { citationsOf, eventsOfNode, relationsOfNode, tenuresOf } from "../lib/queries";
import { WEB_URL } from "../lib/site";
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

const toBody = (f: Form) => ({
  ...f,
  started: cleanDate(f.started),
  ended: cleanDate(f.ended),
});

// One page per polity: basic info in cards at the top, then its relationships, office-holders,
// events and sources in sections of the same page.
export function PolityDetail() {
  const { id = "new" } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: types } = useRegistry("polity_type");
  const [form, setForm] = useState<Form>(emptyForm());
  const [baseline, setBaseline] = useState<Form>(emptyForm());
  // Serialized request body of the form as loaded; used to tell whether anything was edited.
  const [saved, setSaved] = useState<string | null>(() =>
    isNew ? JSON.stringify(toBody(emptyForm())) : null,
  );
  const formRef = useRef(form);
  const savedRef = useRef(saved);
  formRef.current = form;
  savedRef.current = saved;

  const { data, isError, isLoading } = useQuery({
    queryKey: ["polity-edit", id],
    enabled: !isNew,
    queryFn: () => api.get<EditData>(`/polities/${id}/edit`),
  });
  useEffect(() => {
    // A background refetch must not overwrite edits the admin is in the middle of making.
    const editing =
      savedRef.current !== null && JSON.stringify(toBody(formRef.current)) !== savedRef.current;
    if (data && !editing) {
      const loaded = {
        ...data,
        summary: data.summary ?? "",
        body: data.body ?? "",
        started: toDateInput(data.started),
        ended: toDateInput(data.ended),
      };
      setForm(loaded);
      setBaseline(loaded);
      setSaved(JSON.stringify(toBody(loaded)));
    }
  }, [data]);

  const hasEdits = saved !== null && JSON.stringify(toBody(form)) !== saved;
  const allowLeave = useUnsavedChangesGuard(hasEdits);

  const relations = useQuery({ ...relationsOfNode(id), enabled: !isNew });
  const members = useQuery({ ...tenuresOf(`polityId=${id}`), enabled: !isNew });
  const citations = useQuery({ ...citationsOf("polity", id), enabled: !isNew });
  const events = useQuery({ ...eventsOfNode(id), enabled: !isNew });

  const save = useMutation({
    mutationFn: async (_addAnother: boolean) => {
      const body = toBody(form);
      if (isNew) return api.post<{ id: string }>("/polities", body);
      await api.put(`/polities/${id}`, body);
      return { id };
    },
    onSuccess: (result, addAnother) => {
      toast.success(isNew ? "Đã thêm chính thể" : "Đã lưu");
      queryClient.invalidateQueries({ queryKey: ["polities"] });
      queryClient.invalidateQueries({ queryKey: ["polity-edit", id] });
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      queryClient.invalidateQueries({ queryKey: ["tenures"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      if (isNew && addAnother) {
        // Keep the type for the next one: polities are usually entered in runs of one kind.
        const next = { ...emptyForm(), polityType: form.polityType };
        setForm(next);
        setBaseline(next);
        setSaved(JSON.stringify(toBody(next)));
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      // What was just saved is the new baseline, so the form is clean again.
      setBaseline(form);
      setSaved(JSON.stringify(toBody(form)));
      if (isNew) {
        allowLeave();
        navigate(`/polities/${result.id}`, { replace: true });
      }
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const canSave = isNew || hasEdits;
  const submit = (addAnother = false) => {
    if (canSave && !save.isPending) save.mutate(addAnother);
  };
  useSaveShortcut(() => submit(), canSave);

  if (isError)
    return (
      <NotFound
        message="Không tìm thấy chính thể này."
        backTo="/polities"
        backLabel="Về danh sách chính thể"
      />
    );
  const primaryName = form.names.find((n) => n.isPrimary)?.name;
  const node = { id, kind: "polity" as const, slug: data?.slug ?? "", name: primaryName ?? "" };

  const outline: OutlineItem[] = [
    { id: "general", label: "Thông tin chung" },
    { id: "time", label: "Thời gian", warn: !form.started },
    { id: "history", label: "Lịch sử" },
    ...(isNew
      ? []
      : [
          { id: "relations", label: "Quan hệ", count: relations.data?.length },
          { id: "members", label: "Người giữ chức", count: members.data?.length },
          { id: "events", label: "Sự kiện", count: events.data?.items.length },
          {
            id: "sources",
            label: "Nguồn",
            count: citations.data?.length,
            warn: citations.data?.length === 0,
          },
          { id: "graph", label: "Sơ đồ" },
        ]),
  ];

  return (
    <>
      <Breadcrumb
        section={{ label: "Chính thể", to: "/polities" }}
        current={isNew ? "Thêm mới" : (primaryName ?? "...")}
      />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        {!isNew && isLoading ? (
          <Skeleton className="h-9 w-56" />
        ) : (
          <h1>{isNew ? "Thêm chính thể" : (primaryName ?? "...")}</h1>
        )}
        {data?.slug && (
          <Button asChild variant="outline" size="sm">
            <a href={`${WEB_URL}/polity/${data.slug}`} target="_blank" rel="noreferrer">
              Xem trên web <ExternalLink />
            </a>
          </Button>
        )}
      </div>
      <SaveBar
        isNew={isNew}
        dirty={hasEdits}
        saving={save.isPending}
        onSave={() => submit()}
        onSaveAndNew={isNew ? () => submit(true) : undefined}
        onDiscard={() => setForm(baseline)}
      />
      {!isNew && isLoading ? (
        <FormSkeleton />
      ) : (
        <DetailLayout outline={outline}>
          {/* Only the info cards sit inside the form: the panels below open their own forms. */}
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <SectionCard id="general" title="Thông tin chung">
              <div className="flex max-w-3xl flex-col gap-5">
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
                <Field label="Tóm tắt" hint="Một hai câu giới thiệu.">
                  <Textarea
                    rows={3}
                    value={form.summary}
                    onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              id="time"
              title="Thời gian"
              warning={form.started ? undefined : "Chưa có ngày bắt đầu"}
            >
              <div className="flex max-w-3xl flex-col gap-5">
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
              </div>
            </SectionCard>

            <SectionCard id="history" title="Lịch sử">
              <div className="flex max-w-3xl flex-col gap-5">
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
              </div>
            </SectionCard>
          </form>

          {!isNew && (
            <>
              <SectionCard id="relations" title="Quan hệ" count={relations.data?.length} autoSave>
                <RelationsPanel node={node} />
              </SectionCard>
              <SectionCard
                id="members"
                title="Người giữ chức"
                count={members.data?.length}
                autoSave
              >
                <TenuresPanel polityId={id} ownerName={primaryName ?? ""} />
              </SectionCard>
              <SectionCard
                id="events"
                title="Sự kiện"
                count={events.data?.items.length}
                description="Các sự kiện chính thể này tham gia. Thêm bên tham gia ở trang của sự kiện."
              >
                {events.data?.items.length ? (
                  <ul className="flex flex-col gap-1.5">
                    {events.data.items.map((e) => (
                      <li key={e.id}>
                        <Link to={`/events/${e.id}`} className="font-medium">
                          {e.name}
                        </Link>
                        <span className="text-muted-foreground ml-2 text-sm">
                          {e.eventTypeLabel}
                          {e.start ? ` · ${e.start.label}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">Chưa tham gia sự kiện nào.</p>
                )}
              </SectionCard>
              <SectionCard
                id="sources"
                title="Nguồn"
                count={citations.data?.length}
                warning={citations.data?.length === 0 ? "Chưa có nguồn" : undefined}
                autoSave
              >
                <CitationsPanel subjectTable="polity" subjectId={id} />
              </SectionCard>
              <SectionCard id="graph" title="Sơ đồ" collapsible>
                <NodeGraph node={node} />
              </SectionCard>
            </>
          )}
        </DetailLayout>
      )}
    </>
  );
}
