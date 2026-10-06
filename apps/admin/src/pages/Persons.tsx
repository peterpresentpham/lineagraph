import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button } from "@lineagraph/ui";
import { BulkBar } from "../components/data-table/BulkBar";
import { DataTable, RowLink, type Column } from "../components/data-table/DataTable";
import { ListFooter } from "../components/data-table/ListFooter";
import { FilterSelect, FilterToggle, ListToolbar } from "../components/data-table/ListToolbar";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import { historicityLabels, lifeSpan, sexLabels } from "../lib/format";
import { WEB_URL } from "../lib/site";
import type { PersonSummary } from "../lib/types";
import { useDeleteWithUndo } from "../lib/useDeleteWithUndo";
import { useListState } from "../lib/useListState";

const PAGE_SIZE = 50;

const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export function Persons() {
  const navigate = useNavigate();
  const list = useListState({
    keys: ["sex", "historicity", "noSource", "sort"],
    pageSize: PAGE_SIZE,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  // A selection belongs to the rows on screen; a new search, filter or page starts a new one.
  useEffect(() => setSelected(new Set()), [list.query]);
  const { remove } = useDeleteWithUndo({
    path: "/persons",
    noun: "nhân vật",
    invalidate: ["persons"],
  });

  const { data, isLoading } = useQuery({
    queryKey: ["persons", list.query],
    queryFn: () => api.get<{ items: PersonSummary[]; total: number }>(`/persons?${list.query}`),
  });

  const columns: Column<PersonSummary>[] = [
    {
      key: "name",
      header: "Tên",
      mobile: "title",
      className: "font-medium",
      cell: (p) => <RowLink to={`/persons/${p.id}`}>{p.name}</RowLink>,
    },
    { key: "sex", header: "Giới tính", cell: (p) => sexLabels[p.sex] },
    { key: "life", header: "Sinh – mất", cell: (p) => lifeSpan(p.birth, p.death) },
    {
      key: "historicity",
      header: "Tính xác thực",
      cell: (p) => (
        <Badge variant={p.historicity === "historical" ? "success" : "warning"}>
          {historicityLabels[p.historicity]}
        </Badge>
      ),
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
        title="Nhân vật"
        description="Bấm vào một dòng để sửa thông tin, quan hệ, chức vụ và nguồn."
        action={
          <Button onClick={() => navigate("/persons/new")}>
            <Plus /> Thêm nhân vật
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
          label="Mọi giới tính"
          value={list.filters.sex!}
          onChange={(v) => list.setFilter("sex", v)}
          options={toOptions(sexLabels)}
        />
        <FilterSelect
          label="Mọi mức xác thực"
          value={list.filters.historicity!}
          onChange={(v) => list.setFilter("historicity", v)}
          options={toOptions(historicityLabels)}
        />
        <FilterToggle
          label="Chưa có nguồn"
          active={list.filters.noSource === "1"}
          onChange={(on) => list.setFilter("noSource", on ? "1" : "")}
        />
        <FilterSelect
          label="Xếp theo tên"
          value={list.filters.sort!}
          onChange={(v) => list.setFilter("sort", v)}
          options={[{ value: "birth", label: "Xếp theo năm sinh" }]}
        />
      </ListToolbar>
      <DataTable
        rows={data?.items}
        loading={isLoading}
        columns={columns}
        rowKey={(p) => p.id}
        onOpen={(p) => navigate(`/persons/${p.id}`)}
        selected={selected}
        onSelectedChange={setSelected}
        actions={(p) => [
          { label: "Sửa", icon: Pencil, onSelect: () => navigate(`/persons/${p.id}`) },
          {
            label: "Xem trên web",
            icon: ExternalLink,
            onSelect: () => window.open(`${WEB_URL}/person/${p.slug}`, "_blank", "noopener"),
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
            "Không có nhân vật nào khớp bộ lọc."
          ) : (
            <>
              Chưa có nhân vật nào.{" "}
              <Button
                variant="link"
                className="h-auto p-0"
                onClick={() => navigate("/persons/new")}
              >
                Thêm nhân vật đầu tiên
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
