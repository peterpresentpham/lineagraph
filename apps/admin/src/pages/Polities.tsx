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
import { labelOf, useRegistry } from "../lib/hooks";
import { WEB_URL } from "../lib/site";
import type { PolitySummary } from "../lib/types";
import { useDeleteWithUndo } from "../lib/useDeleteWithUndo";
import { useListState } from "../lib/useListState";

const PAGE_SIZE = 50;

export function Polities() {
  const navigate = useNavigate();
  const { data: types } = useRegistry("polity_type");
  const list = useListState({ keys: ["type", "noSource", "sort"], pageSize: PAGE_SIZE });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  useEffect(() => setSelected(new Set()), [list.query]);
  const { remove } = useDeleteWithUndo({
    path: "/polities",
    noun: "chính thể",
    invalidate: ["polities"],
  });

  const { data, isLoading } = useQuery({
    queryKey: ["polities", list.query],
    queryFn: () => api.get<{ items: PolitySummary[]; total: number }>(`/polities?${list.query}`),
  });

  const columns: Column<PolitySummary>[] = [
    {
      key: "name",
      header: "Tên",
      mobile: "title",
      className: "font-medium",
      cell: (p) => <RowLink to={`/polities/${p.id}`}>{p.name}</RowLink>,
    },
    { key: "type", header: "Loại", cell: (p) => labelOf(types, p.polityType) },
    {
      key: "time",
      header: "Thời gian tồn tại",
      cell: (p) =>
        p.started || p.ended ? `${p.started?.label ?? "?"} – ${p.ended?.label ?? "?"}` : "",
    },
  ];

  const deleteSelected = async () => {
    setDeleting(true);
    const items = (data?.items ?? [])
      .filter((p) => selected.has(p.id))
      .map((p) => ({ id: p.id, name: p.name }));
    await remove(items);
    setSelected(new Set());
    setDeleting(false);
  };

  return (
    <>
      <PageHeader
        title="Chính thể"
        description="Triều đại, vương quốc, chính quyền... Bấm vào một dòng để sửa thông tin, quan hệ, nhân vật và nguồn."
        action={
          <Button onClick={() => navigate("/polities/new")}>
            <Plus /> Thêm chính thể
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
        rowKey={(p) => p.id}
        onOpen={(p) => navigate(`/polities/${p.id}`)}
        selected={selected}
        onSelectedChange={setSelected}
        actions={(p) => [
          { label: "Sửa", icon: Pencil, onSelect: () => navigate(`/polities/${p.id}`) },
          {
            label: "Xem trên web",
            icon: ExternalLink,
            onSelect: () => window.open(`${WEB_URL}/polity/${p.slug}`, "_blank", "noopener"),
          },
          {
            label: "Xoá",
            icon: Trash2,
            destructive: true,
            onSelect: () => remove([{ id: p.id, name: p.name }]),
          },
        ]}
        empty={
          list.hasFilters ? (
            "Không có chính thể nào khớp bộ lọc."
          ) : (
            <>
              Chưa có chính thể nào.{" "}
              <Button
                variant="link"
                className="h-auto p-0"
                onClick={() => navigate("/polities/new")}
              >
                Thêm chính thể đầu tiên
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
