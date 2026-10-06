import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Landmark, User } from "lucide-react";
import { Badge } from "@lineagraph/ui";
import { DataTable, RowLink, type Column } from "../components/data-table/DataTable";
import { ListToolbar } from "../components/data-table/ListToolbar";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import { labelOf, useRegistry } from "../lib/hooks";
import type { DateValue } from "../lib/types";
import { useListState } from "../lib/useListState";

type Row = {
  id: string;
  person: { id: string; name: string };
  polity: { id: string; name: string } | null;
  officeType: string;
  start: DateValue | null;
  end: DateValue | null;
  seq: number | null;
  disputed: boolean;
  state: string;
};

// The API returns up to this many, without a total.
const LIMIT = 500;

// Every office on record. Offices are added and edited on the person's or polity's own page (the
// "Chức vụ" section); this page is the overview that links there.
export function Tenures() {
  const navigate = useNavigate();
  const { data: offices } = useRegistry("office_type");
  const list = useListState({ keys: [], pageSize: LIMIT });
  const { data, isLoading } = useQuery({
    queryKey: ["tenures", "all"],
    queryFn: () => api.get<Row[]>("/tenures"),
  });
  // The whole list is loaded, so searching happens here, as the admin types.
  const needle = list.text.trim().toLowerCase();
  const rows = data?.filter(
    (t) =>
      !needle ||
      t.person.name.toLowerCase().includes(needle) ||
      t.polity?.name.toLowerCase().includes(needle),
  );

  const columns: Column<Row>[] = [
    {
      key: "person",
      header: "Nhân vật",
      mobile: "title",
      className: "font-medium",
      cell: (t) => <RowLink to={`/persons/${t.person.id}`}>{t.person.name}</RowLink>,
    },
    {
      key: "polity",
      header: "Chính thể",
      cell: (t) =>
        t.polity ? <RowLink to={`/polities/${t.polity.id}`}>{t.polity.name}</RowLink> : "",
    },
    {
      key: "office",
      header: "Chức vụ",
      cell: (t) => `${labelOf(offices, t.officeType)}${t.seq != null ? ` · thứ ${t.seq}` : ""}`,
    },
    {
      key: "time",
      header: "Thời gian",
      cell: (t) => (
        <>
          {t.start || t.end ? `${t.start?.label ?? "?"} – ${t.end?.label ?? "?"}` : ""}
          {t.disputed && (
            <Badge variant="warning" className="ml-2">
              Tranh cãi
            </Badge>
          )}
          {t.state === "alternative" && (
            <Badge variant="neutral" className="ml-2">
              Phiên bản khác
            </Badge>
          )}
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Chức vụ"
        description="Toàn bộ chức vụ đã ghi. Bấm một dòng để mở nhân vật và sửa ở mục Chức vụ."
      />
      <ListToolbar
        search={list.text}
        onSearchChange={list.setText}
        placeholder="Tìm theo tên nhân vật hoặc chính thể..."
        hasFilters={!!list.text}
        onClear={() => list.setText("")}
      />
      <DataTable
        rows={rows}
        loading={isLoading}
        columns={columns}
        rowKey={(t) => t.id}
        onOpen={(t) => navigate(`/persons/${t.person.id}#tenures`)}
        actions={(t) => [
          {
            label: "Mở nhân vật",
            icon: User,
            onSelect: () => navigate(`/persons/${t.person.id}#tenures`),
          },
          ...(t.polity
            ? [
                {
                  label: "Mở chính thể",
                  icon: Landmark,
                  onSelect: () => navigate(`/polities/${t.polity!.id}#members`),
                },
              ]
            : []),
        ]}
        empty={list.text ? "Không có chức vụ nào khớp." : "Chưa có chức vụ nào."}
      />
      {data && data.length >= LIMIT && (
        <p className="text-muted-foreground mt-3 text-sm">
          Chỉ hiện {LIMIT} chức vụ đầu tiên. Xem đầy đủ ở mục Chức vụ của từng nhân vật hoặc chính
          thể.
        </p>
      )}
    </>
  );
}
