import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  toast,
} from "@lineagraph/ui";
import { Breadcrumb } from "../components/Breadcrumb";
import { CitationsPanel } from "../components/CitationsPanel";
import { DateField, cleanDate } from "../components/DateField";
import { DetailLayout, type OutlineItem } from "../components/detail/DetailLayout";
import { SaveBar } from "../components/detail/SaveBar";
import { SectionCard } from "../components/detail/SectionCard";
import { EventPicker } from "../components/EventPicker";
import { Field } from "../components/Field";
import { FormSkeleton } from "../components/FormSkeleton";
import { NamesField, emptyNames } from "../components/NamesField";
import { NotFound } from "../components/NotFound";
import { ParticipantsField, type ParticipantValue } from "../components/ParticipantsField";
import { PlacePicker } from "../components/PlacePicker";
import { api } from "../lib/api";
import { toDateInput } from "../lib/format";
import { errorMessage, useRegistry, useSaveShortcut, useUnsavedChangesGuard } from "../lib/hooks";
import { citationsOf } from "../lib/queries";
import { WEB_URL } from "../lib/site";
import type { DateInput, DateValue, NameValue } from "../lib/types";

type Form = {
  names: NameValue[];
  eventType: string;
  summary: string;
  outcome: string;
  body: string;
  start: DateInput | null;
  end: DateInput | null;
  placeId: string | null;
  placeName: string | null;
  parentEventId: string | null;
  parentEventName: string | null;
  participants: ParticipantValue[];
};
const emptyForm = (): Form => ({
  names: emptyNames(),
  eventType: "battle",
  summary: "",
  outcome: "",
  body: "",
  start: null,
  end: null,
  placeId: null,
  placeName: null,
  parentEventId: null,
  parentEventName: null,
  participants: [],
});

type EditData = {
  id: string;
  slug: string;
  names: NameValue[];
  eventType: string;
  summary: string | null;
  outcome: string | null;
  body: string | null;
  start: DateValue | null;
  end: DateValue | null;
  placeId: string | null;
  parentEventId: string | null;
  participants: {
    nodeId: string;
    nodeName: string;
    role: string;
    side: number | null;
    note: string | null;
  }[];
};

// The request body; also what "was anything edited" is judged on (display-only names are left out).
const toBody = (f: Form) => ({
  names: f.names,
  eventType: f.eventType,
  summary: f.summary || null,
  outcome: f.outcome || null,
  body: f.body || null,
  start: cleanDate(f.start),
  end: cleanDate(f.end),
  placeId: f.placeId,
  parentEventId: f.parentEventId,
  participants: f.participants
    .filter((p) => p.nodeId)
    .map((p) => ({
      nodeId: p.nodeId,
      role: p.role,
      side: p.side === "" ? null : Number(p.side),
      note: p.note || null,
    })),
});

export function EventDetail() {
  const { id = "new" } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: types } = useRegistry("event_type");
  const [form, setForm] = useState<Form>(emptyForm());
  const [baseline, setBaseline] = useState<Form>(emptyForm());
  const [saved, setSaved] = useState<string | null>(() =>
    isNew ? JSON.stringify(toBody(emptyForm())) : null,
  );
  const formRef = useRef(form);
  const savedRef = useRef(saved);
  formRef.current = form;
  savedRef.current = saved;

  const { data, isError, isLoading } = useQuery({
    queryKey: ["event-edit", id],
    enabled: !isNew,
    queryFn: () => api.get<EditData>(`/events/${id}/edit`),
  });
  // The place and parent event are shown by name; the edit data only has their ids.
  const { data: place } = useQuery({
    queryKey: ["place", data?.placeId],
    enabled: !!data?.placeId,
    queryFn: () => api.get<{ name: string }>(`/places/${data!.placeId}`),
  });
  const { data: parent } = useQuery({
    queryKey: ["event-name", data?.parentEventId],
    enabled: !!data?.parentEventId,
    queryFn: () => api.get<{ name: string }>(`/events/${data!.parentEventId}`),
  });

  useEffect(() => {
    // A background refetch must not overwrite edits the admin is in the middle of making.
    const editing =
      savedRef.current !== null && JSON.stringify(toBody(formRef.current)) !== savedRef.current;
    if (!data || editing) return;
    if ((data.placeId && !place) || (data.parentEventId && !parent)) return;
    const loaded: Form = {
      names: data.names,
      eventType: data.eventType,
      summary: data.summary ?? "",
      outcome: data.outcome ?? "",
      body: data.body ?? "",
      start: toDateInput(data.start),
      end: toDateInput(data.end),
      placeId: data.placeId,
      placeName: place?.name ?? null,
      parentEventId: data.parentEventId,
      parentEventName: parent?.name ?? null,
      participants: data.participants.map((p) => ({
        nodeId: p.nodeId,
        nodeName: p.nodeName,
        role: p.role,
        side: p.side?.toString() ?? "",
        note: p.note ?? "",
      })),
    };
    setForm(loaded);
    setBaseline(loaded);
    setSaved(JSON.stringify(toBody(loaded)));
  }, [data, place, parent]);

  const hasEdits = saved !== null && JSON.stringify(toBody(form)) !== saved;
  const allowLeave = useUnsavedChangesGuard(hasEdits);
  const citations = useQuery({ ...citationsOf("event", id), enabled: !isNew });

  const save = useMutation({
    mutationFn: async (_addAnother: boolean) => {
      const body = toBody(form);
      if (isNew) return api.post<{ id: string }>("/events", body);
      await api.put(`/events/${id}`, body);
      return { id };
    },
    onSuccess: (result, addAnother) => {
      toast.success(isNew ? "Đã thêm sự kiện" : "Đã lưu");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event-edit", id] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      if (isNew && addAnother) {
        // Keep the type and the larger event: battles are usually entered in runs of one campaign.
        const next = {
          ...emptyForm(),
          eventType: form.eventType,
          parentEventId: form.parentEventId,
          parentEventName: form.parentEventName,
        };
        setForm(next);
        setBaseline(next);
        setSaved(JSON.stringify(toBody(next)));
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setBaseline(form);
      setSaved(JSON.stringify(toBody(form)));
      if (isNew) {
        allowLeave();
        navigate(`/events/${result.id}`, { replace: true });
      }
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const canSave = isNew || hasEdits;
  const submit = (addAnother = false) => {
    if (canSave && !save.isPending) save.mutate(addAnother);
  };
  useSaveShortcut(() => submit(), canSave);

  if (isError) {
    return (
      <NotFound
        message="Không tìm thấy sự kiện này."
        backTo="/events"
        backLabel="Về danh sách sự kiện"
      />
    );
  }
  const primaryName = form.names.find((n) => n.isPrimary)?.name;
  const participantCount = form.participants.filter((p) => p.nodeId).length;

  const outline: OutlineItem[] = [
    { id: "general", label: "Thông tin chung" },
    { id: "when", label: "Thời gian và nơi", warn: !form.start },
    {
      id: "participants",
      label: "Người tham gia",
      count: participantCount,
      warn: participantCount === 0,
    },
    { id: "narrative", label: "Diễn biến" },
    ...(isNew
      ? []
      : [
          {
            id: "sources",
            label: "Nguồn",
            count: citations.data?.length,
            warn: citations.data?.length === 0,
          },
        ]),
  ];

  return (
    <>
      <Breadcrumb
        section={{ label: "Sự kiện", to: "/events" }}
        current={isNew ? "Thêm mới" : (primaryName ?? "...")}
      />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        {!isNew && isLoading ? (
          <Skeleton className="h-9 w-56" />
        ) : (
          <h1>{isNew ? "Thêm sự kiện" : (primaryName ?? "...")}</h1>
        )}
        {data?.slug && (
          <Button asChild variant="outline" size="sm">
            <a href={`${WEB_URL}/event/${data.slug}`} target="_blank" rel="noreferrer">
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
                <Field label="Loại sự kiện">
                  <Select
                    value={form.eventType}
                    onValueChange={(eventType) => setForm({ ...form, eventType })}
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
                <Field label="Kết quả" hint="Ví dụ: Quân Minh đại bại, rút về nước.">
                  <Input
                    value={form.outcome}
                    onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              id="when"
              title="Thời gian và nơi"
              warning={form.start ? undefined : "Chưa có ngày bắt đầu"}
            >
              <div className="flex max-w-3xl flex-col gap-5">
                <DateField
                  label="Bắt đầu"
                  value={form.start}
                  onChange={(start) => setForm({ ...form, start })}
                />
                <DateField
                  label="Kết thúc"
                  value={form.end}
                  onChange={(end) => setForm({ ...form, end })}
                />
                <Field label="Địa điểm">
                  <PlacePicker
                    value={form.placeId}
                    selectedName={form.placeName}
                    onChange={(placeId, placeName) => setForm({ ...form, placeId, placeName })}
                  />
                </Field>
                <Field
                  label="Thuộc sự kiện lớn hơn"
                  hint="Ví dụ một trận đánh nằm trong một chiến dịch hay cuộc chiến."
                >
                  <EventPicker
                    value={form.parentEventId}
                    selectedName={form.parentEventName}
                    exclude={isNew ? undefined : id}
                    onChange={(parentEventId, parentEventName) =>
                      setForm({ ...form, parentEventId, parentEventName })
                    }
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              id="participants"
              title="Người tham gia"
              count={participantCount}
              warning={participantCount === 0 ? "Chưa có ai" : undefined}
            >
              <div className="max-w-3xl">
                <ParticipantsField
                  value={form.participants}
                  onChange={(participants) => setForm({ ...form, participants })}
                />
              </div>
            </SectionCard>

            <SectionCard id="narrative" title="Diễn biến">
              <div className="max-w-3xl">
                <Field label="Diễn biến chi tiết" hint="Văn bản dài. Xuống dòng để tách đoạn.">
                  <Textarea
                    rows={10}
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                  />
                </Field>
              </div>
            </SectionCard>
          </form>

          {!isNew && (
            <SectionCard
              id="sources"
              title="Nguồn"
              count={citations.data?.length}
              warning={citations.data?.length === 0 ? "Chưa có nguồn" : undefined}
              autoSave
            >
              <CitationsPanel subjectTable="event" subjectId={id} />
            </SectionCard>
          )}
        </DetailLayout>
      )}
    </>
  );
}
