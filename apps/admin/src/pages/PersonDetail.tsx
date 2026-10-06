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
import { PlacePicker } from "../components/PlacePicker";
import { RelationsPanel } from "../components/RelationsPanel";
import { TenuresPanel } from "../components/TenuresPanel";
import { api } from "../lib/api";
import { historicityLabels, sexLabels, toDateInput } from "../lib/format";
import { errorMessage, useSaveShortcut, useUnsavedChangesGuard } from "../lib/hooks";
import { citationsOf, eventsOfNode, relationsOfNode, tenuresOf } from "../lib/queries";
import { WEB_URL } from "../lib/site";
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
  birthPlaceId: string | null;
  deathPlaceId: string | null;
  // Names for display only (not sent to the API).
  birthPlaceName: string | null;
  deathPlaceName: string | null;
};
const emptyForm = (): Form => ({
  names: emptyNames(),
  sex: "unknown",
  historicity: "historical",
  summary: "",
  body: "",
  attributes: [],
  birth: null,
  death: null,
  birthPlaceId: null,
  deathPlaceId: null,
  birthPlaceName: null,
  deathPlaceName: null,
});
type EditData = Omit<Form, "birth" | "death" | "summary" | "body"> & {
  id: string;
  slug: string;
  summary: string | null;
  body: string | null;
  birth: DateValue | null;
  death: DateValue | null;
};

const toBody = (f: Form) => ({ ...f, birth: cleanDate(f.birth), death: cleanDate(f.death) });

// One page per person: basic info in cards at the top, then everything attached to the person
// (relationships, offices, events, sources) in sections of the same page.
export function PersonDetail() {
  const { id = "new" } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(emptyForm());
  // The form as last loaded or saved, to discard edits back to it, and its serialized request
  // body to tell whether anything was edited.
  const [baseline, setBaseline] = useState<Form>(emptyForm());
  const [saved, setSaved] = useState<string | null>(() =>
    isNew ? JSON.stringify(toBody(emptyForm())) : null,
  );
  const formRef = useRef(form);
  const savedRef = useRef(saved);
  formRef.current = form;
  savedRef.current = saved;

  const { data, isError, isLoading } = useQuery({
    queryKey: ["person-edit", id],
    enabled: !isNew,
    queryFn: () => api.get<EditData>(`/persons/${id}/edit`),
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
        birth: toDateInput(data.birth),
        death: toDateInput(data.death),
      };
      setForm(loaded);
      setBaseline(loaded);
      setSaved(JSON.stringify(toBody(loaded)));
    }
  }, [data]);

  const hasEdits = saved !== null && JSON.stringify(toBody(form)) !== saved;
  const allowLeave = useUnsavedChangesGuard(hasEdits);

  // Counts for the outline and the "missing" markers; the panels read the same cached requests.
  const relations = useQuery({ ...relationsOfNode(id), enabled: !isNew });
  const tenures = useQuery({ ...tenuresOf(`personId=${id}`), enabled: !isNew });
  const citations = useQuery({ ...citationsOf("person", id), enabled: !isNew });
  const events = useQuery({ ...eventsOfNode(id), enabled: !isNew });

  const save = useMutation({
    mutationFn: async (_addAnother: boolean) => {
      const body = toBody(form);
      if (isNew) return api.post<{ id: string }>("/persons", body);
      await api.put(`/persons/${id}`, body);
      return { id };
    },
    onSuccess: (result, addAnother) => {
      toast.success(isNew ? "Đã thêm nhân vật" : "Đã lưu");
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      queryClient.invalidateQueries({ queryKey: ["person-edit", id] });
      // Names show up in relationship and office lists, so those caches are stale too.
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      queryClient.invalidateQueries({ queryKey: ["tenures"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      if (isNew && addAnother) {
        // Stay on the empty form for the next person.
        setForm(emptyForm());
        setBaseline(emptyForm());
        setSaved(JSON.stringify(toBody(emptyForm())));
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      // What was just saved is the new baseline, so the form is clean again.
      setBaseline(form);
      setSaved(JSON.stringify(toBody(form)));
      if (isNew) {
        allowLeave();
        navigate(`/persons/${result.id}`, { replace: true });
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
        message="Không tìm thấy nhân vật này."
        backTo="/persons"
        backLabel="Về danh sách nhân vật"
      />
    );
  const primaryName = form.names.find((n) => n.isPrimary)?.name;
  const node = { id, kind: "person" as const, slug: data?.slug ?? "", name: primaryName ?? "" };

  const outline: OutlineItem[] = [
    { id: "general", label: "Thông tin chung" },
    { id: "life", label: "Ngày và nơi", warn: !form.birth },
    { id: "bio", label: "Tiểu sử" },
    ...(isNew
      ? []
      : [
          { id: "relations", label: "Quan hệ", count: relations.data?.length },
          { id: "tenures", label: "Chức vụ", count: tenures.data?.length },
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
        section={{ label: "Nhân vật", to: "/persons" }}
        current={isNew ? "Thêm mới" : (primaryName ?? "...")}
      />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        {!isNew && isLoading ? (
          <Skeleton className="h-9 w-56" />
        ) : (
          <h1>{isNew ? "Thêm nhân vật" : (primaryName ?? "...")}</h1>
        )}
        {data?.slug && (
          <Button asChild variant="outline" size="sm">
            <a href={`${WEB_URL}/person/${data.slug}`} target="_blank" rel="noreferrer">
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
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Giới tính">
                    <Select value={form.sex} onValueChange={(sex) => setForm({ ...form, sex })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(sexLabels).map(([code, label]) => (
                          <SelectItem key={code} value={code}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Tính xác thực">
                    <Select
                      value={form.historicity}
                      onValueChange={(historicity) => setForm({ ...form, historicity })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(historicityLabels).map(([code, label]) => (
                          <SelectItem key={code} value={code}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field
                  label="Tóm tắt"
                  hint="Một hai câu giới thiệu, hiện ở đầu trang và trong kết quả tìm kiếm."
                >
                  <Textarea
                    rows={3}
                    value={form.summary}
                    onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              id="life"
              title="Ngày và nơi"
              warning={form.birth ? undefined : "Chưa có ngày sinh"}
            >
              <div className="flex max-w-3xl flex-col gap-5">
                <DateField
                  label="Ngày sinh"
                  value={form.birth}
                  onChange={(birth) => setForm({ ...form, birth })}
                />
                <DateField
                  label="Ngày mất"
                  value={form.death}
                  onChange={(death) => setForm({ ...form, death })}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nơi sinh">
                    <PlacePicker
                      value={form.birthPlaceId}
                      selectedName={form.birthPlaceName}
                      onChange={(pid, name) =>
                        setForm({ ...form, birthPlaceId: pid, birthPlaceName: name })
                      }
                    />
                  </Field>
                  <Field label="Nơi mất">
                    <PlacePicker
                      value={form.deathPlaceId}
                      selectedName={form.deathPlaceName}
                      onChange={(pid, name) =>
                        setForm({ ...form, deathPlaceId: pid, deathPlaceName: name })
                      }
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            <SectionCard id="bio" title="Tiểu sử">
              <div className="flex max-w-3xl flex-col gap-5">
                <Field label="Tiểu sử chi tiết" hint="Văn bản dài. Xuống dòng để tách đoạn.">
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
              <SectionCard id="tenures" title="Chức vụ" count={tenures.data?.length} autoSave>
                <TenuresPanel personId={id} ownerName={primaryName ?? ""} />
              </SectionCard>
              <SectionCard
                id="events"
                title="Sự kiện"
                count={events.data?.items.length}
                description="Các sự kiện nhân vật này tham gia. Thêm người tham gia ở trang của sự kiện."
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
                <CitationsPanel subjectTable="person" subjectId={id} />
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
