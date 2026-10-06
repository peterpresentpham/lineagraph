import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@lineagraph/ui";
import { BulkBar } from "../components/data-table/BulkBar";
import { DataTable, RowLink, type Column } from "../components/data-table/DataTable";
import { ListFooter } from "../components/data-table/ListFooter";
import { FilterSelect, FilterToggle, ListToolbar } from "../components/data-table/ListToolbar";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import { useRegistry } from "../lib/hooks";
import { WEB_URL } from "../lib/site";
import type { EventSummary } from "../lib/types";
import { useDeleteWithUndo } from "../lib/useDeleteWithUndo";
import { useListState } from "../lib/useListState";

const PAGE_SIZE = 50;

const when = (e: EventSummary) =>
  e.start || e.end ? `${e.start?.label ?? "?"}${e.end ? ` – ${e.end.label}` : ""}` : "";

export function Events() {
  const navigate = useNavigate();
  const { data: types } = useRegistry("event_type");
  const list = useListState({ keys: ["type", "noSource", "sort"], pageSize: PAGE_SIZE });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  useEffect(() => setSelected(new Set()), [list.query]);
  const { remove } = useDeleteWithUndo({
    path: "/events",
    noun: "sự kiện",
    invalidate: ["events"],
  });

  const { data, isLoading } = useQuery({
    queryKey: ["events", list.query],
    queryFn: () => api.get<{ items: EventSummary[]; total: number }>(`/events?${list.query}`),
  });

  const columns: Column<EventSummary>[] = [
    {
      key: "name",
      header: "Tên",
      mobile: "title",
      className: "font-medium",
      cell: (e) => <RowLink to={`/events/${e.id}`}>{e.name}</RowLink>,
    },
    { key: "type", header: "Loại", cell: (e) => e.eventTypeLabel },
    { key: "time", header: "Thời gian", cell: when },
    { key: "place", header: "Địa điểm", cell: (e) => e.place?.name ?? "" },
    {
      key: "participants",
      header: "Người tham gia",
      className: "text-right",
      mobile: false,
      cell: (e) => e.participantCount,
    },
  ];

  const deleteSelected = async () => {
    setDeleting(true);
    const items = (data?.items ?? [])
      .filter((e) => selected.has(e.id))
      .map((e) => ({ id: e.id, name: e.name }));
    await remove(items);
    setSelected(new Set());
    setDeleting(false);
  };

  return (
    <>
      <PageHeader
        title="Sự kiện"
        description="Trận đánh, hiệp ước, lễ đăng quang... Mỗi sự kiện có thời gian, địa điểm, những người và chính thể tham gia với vai trò rõ ràng, và nguồn dẫn chứng."
        action={
          <Button onClick={() => navigate("/events/new")}>
            <Plus /> Thêm sự kiện
          </Button>
        }
      />
      <ListToolbar
        search={list.text}
        onSearchChange={list.setText}
        hasFilters={list.hasFilters}
        onClear={list.clearFilters}
      >
        <FilterSelect
          label="Mọi loại"
          value={list.filters.type!}
          onChange={(v) => list.setFilter("type", v)}
          options={(types ?? []).map((t) => ({ value: t.code, label: t.label }))}
        />
        <FilterToggle
          label="Chưa có nguồn"
          active={list.filters.noSource === "1"}
          onChange={(on) => list.setFilter("noSource", on ? "1" : "")}
        />
        <FilterSelect
          label="Xếp theo thời gian"
          value={list.filters.sort!}
          onChange={(v) => list.setFilter("sort", v)}
          options={[{ value: "name", label: "Xếp theo tên" }]}
        />
      </ListToolbar>
      <DataTable
        rows={data?.items}
        loading={isLoading}
        columns={columns}
        rowKey={(e) => e.id}
        onOpen={(e) => navigate(`/events/${e.id}`)}
        selected={selected}
        onSelectedChange={setSelected}
        actions={(e) => [
          { label: "Sửa", icon: Pencil, onSelect: () => navigate(`/events/${e.id}`) },
          {
            label: "Xem trên web",
            icon: ExternalLink,
            onSelect: () => window.open(`${WEB_URL}/event/${e.slug}`, "_blank", "noopener"),
          },
          {
            label: "Xoá",
            icon: Trash2,
            destructive: true,
            onSelect: () => remove([{ id: e.id, name: e.name }]),
          },
        ]}
        empty={
          list.hasFilters ? (
            "Không có sự kiện nào khớp bộ lọc."
          ) : (
            <>
              Chưa có sự kiện nào.{" "}
              <Button variant="link" className="h-auto p-0" onClick={() => navigate("/events/new")}>
                Thêm sự kiện đầu tiên
              </Button>
            </>
          )
        }
      />
      <ListFooter page={list.page} pageSize={PAGE_SIZE} total={data?.total} onPage={list.setPage} />
      <BulkBar
        count={selected.size}
        deleting={deleting}
        onClear={() => setSelected(new Set())}
        onDelete={deleteSelected}
      />
    </>
  );
}
