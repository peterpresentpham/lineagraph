import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Plus, Undo2 } from "lucide-react";
import { Button, Card, CardContent, Skeleton, toast } from "@lineagraph/ui";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import { errorMessage } from "../lib/hooks";

type Report = { counts: Record<string, number>; issues: unknown[] };
type Recent = {
  at: string;
  action: string;
  table: string;
  rowId: string;
  name: string | null;
}[];

// Where to open each kind of record from the change log.
const tableRoutes: Record<string, { label: string; to: (id: string) => string; restore?: string }> =
  {
    person: { label: "Nhân vật", to: (id) => `/persons/${id}`, restore: "/persons" },
    polity: { label: "Chính thể", to: (id) => `/polities/${id}`, restore: "/polities" },
    event: { label: "Sự kiện", to: (id) => `/events/${id}`, restore: "/events" },
    place: { label: "Địa điểm", to: () => "/places" },
    source: { label: "Nguồn", to: () => "/sources" },
    tenure: { label: "Chức vụ", to: () => "/links?tab=tenures" },
    relation: { label: "Quan hệ", to: () => "/links?tab=relations" },
    citation: { label: "Trích dẫn", to: () => "/sources" },
  };
const actionLabels: Record<string, string> = {
  create: "Thêm",
  update: "Sửa",
  delete: "Xoá",
  restore: "Khôi phục",
};

// What each data check means for the to-do list, and where to go to fix it. "Chưa có nguồn" is
// left out: it is listed per kind of record below, with a list already filtered.
const checkTasks: Record<string, string> = {
  ancestor_cycle: "người là tổ tiên của chính mình",
  parent_born_after_child: "cha mẹ sinh sau con",
  parent_died_before_conception: "cha mất quá sớm so với ngày con sinh",
  death_before_birth: "người mất trước khi sinh",
  tenure_ends_before_start: "chức vụ kết thúc trước khi bắt đầu",
  overlapping_tenures: "ngôi vị có hai người cùng giữ",
  event_without_participants: "sự kiện chưa có người tham gia",
  participant_outside_lifespan: "người tham gia khi chưa sinh hoặc đã mất",
};

const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
};

const statTiles = [
  { key: "persons", label: "Nhân vật", to: "/persons" },
  { key: "polities", label: "Chính thể", to: "/polities" },
  { key: "events", label: "Sự kiện", to: "/events" },
  { key: "relations", label: "Quan hệ", to: "/links?tab=relations" },
  { key: "tenures", label: "Chức vụ", to: "/links?tab=tenures" },
  { key: "sources", label: "Nguồn tư liệu", to: "/sources" },
] as const;

const addButtons = [
  { label: "Nhân vật", to: "/persons/new" },
  { label: "Chính thể", to: "/polities/new" },
  { label: "Sự kiện", to: "/events/new" },
  { label: "Nguồn", to: "/sources?new=1" },
];

export function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<Record<string, number>>("/stats"),
  });
  const { data: report } = useQuery({
    queryKey: ["consistency"],
    queryFn: () => api.get<Report>("/consistency-report"),
    staleTime: 60_000,
  });
  // How many records of each kind have no source at all (the filtered lists give the total).
  const unsourced = useQuery({
    queryKey: ["unsourced"],
    staleTime: 60_000,
    queryFn: async () => {
      const total = async (path: string) =>
        (await api.get<{ total: number }>(`${path}?noSource=1&limit=1`)).total;
      const [persons, polities, events] = await Promise.all([
        total("/persons"),
        total("/polities"),
        total("/events"),
      ]);
      return { persons, polities, events };
    },
  });
  const { data: recent } = useQuery({
    queryKey: ["recent"],
    queryFn: () => api.get<Recent>("/recent?limit=10"),
  });

  const tasks: { text: string; to: string; level: "error" | "info" }[] = [];
  const u = unsourced.data;
  if (u?.persons)
    tasks.push({
      text: `${u.persons} nhân vật chưa có nguồn`,
      to: "/persons?noSource=1",
      level: "info",
    });
  if (u?.polities)
    tasks.push({
      text: `${u.polities} chính thể chưa có nguồn`,
      to: "/polities?noSource=1",
      level: "info",
    });
  if (u?.events)
    tasks.push({
      text: `${u.events} sự kiện chưa có nguồn`,
      to: "/events?noSource=1",
      level: "info",
    });
  for (const [check, text] of Object.entries(checkTasks)) {
    const n = report?.counts[check] ?? 0;
    if (n > 0) tasks.push({ text: `${n} ${text}`, to: "/quality", level: "error" });
  }
  const tasksReady = !!report && !!unsourced.data;

  const restore = async (row: Recent[number]) => {
    const route = tableRoutes[row.table];
    if (!route?.restore) return;
    try {
      await api.post(`${route.restore}/${row.rowId}/restore`);
      toast.success(`Đã khôi phục "${row.name ?? route.label}"`);
      queryClient.invalidateQueries();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description="Việc cần làm, thay đổi gần đây và số lượng dữ liệu. Dữ liệu thêm ở đây hiện ngay trên trang xem."
        action={
          <div className="flex flex-wrap gap-2">
            {addButtons.map((b) => (
              <Button key={b.to} variant="outline" size="sm" onClick={() => navigate(b.to)}>
                <Plus /> {b.label}
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 text-lg">Việc cần làm</h2>
            {!tasksReady ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-6 w-52" />
              </div>
            ) : tasks.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-4" /> Dữ liệu ổn, chưa có gì cần xử lý.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {tasks.map((t) => (
                  <li key={t.text}>
                    <Link
                      to={t.to}
                      className="hover:bg-muted -mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm no-underline hover:no-underline"
                    >
                      <AlertTriangle
                        className={`size-4 shrink-0 ${t.level === "error" ? "text-destructive" : "text-amber-600"}`}
                        aria-hidden
                      />
                      {t.text}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 text-lg">Thay đổi gần đây</h2>
            {!recent ? (
              <Skeleton className="h-24 w-full" />
            ) : recent.length === 0 ? (
              <p className="text-muted-foreground text-sm">Chưa có thay đổi nào.</p>
            ) : (
              <ul className="flex flex-col">
                {recent.map((r) => {
                  const route = tableRoutes[r.table];
                  const label = r.name ?? route?.label ?? r.table;
                  const gone = r.action === "delete";
                  return (
                    <li
                      key={`${r.table}-${r.rowId}`}
                      className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-b-0"
                    >
                      <span className="min-w-0 truncate">
                        <span className="text-muted-foreground mr-2">
                          {actionLabels[r.action] ?? r.action}
                        </span>
                        {route && !gone ? (
                          <Link to={route.to(r.rowId)} className="font-medium">
                            {label}
                          </Link>
                        ) : (
                          <span className="font-medium">{label}</span>
                        )}
                        {r.name && route && (
                          <span className="text-muted-foreground ml-2 text-xs">{route.label}</span>
                        )}
                      </span>
                      <span className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
                        {gone && route?.restore && (
                          <Button variant="ghost" size="xs" onClick={() => restore(r)}>
                            <Undo2 /> Khôi phục
                          </Button>
                        )}
                        {timeAgo(r.at)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statTiles.map(({ key, label, to }) => (
          <Link key={key} to={to} className="no-underline hover:no-underline">
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                {statsLoading ? (
                  <Skeleton className="h-7 w-10" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.[key] ?? "–"}</div>
                )}
                <div className="text-muted-foreground text-sm">{label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <p className="text-muted-foreground mt-4 text-xs">
        Mẹo: nhấn <kbd className="bg-muted rounded px-1">Ctrl</kbd> +{" "}
        <kbd className="bg-muted rounded px-1">K</kbd> để tìm nhanh ở bất cứ đâu.
      </p>
    </>
  );
}
