import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Badge, Button, Skeleton } from "@lineagraph/ui";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";

type Check =
  | "ancestor_cycle"
  | "parent_born_after_child"
  | "parent_died_before_conception"
  | "death_before_birth"
  | "tenure_ends_before_start"
  | "overlapping_tenures"
  | "node_without_source"
  | "event_without_participants"
  | "participant_outside_lifespan";

type Issue = {
  check: Check;
  severity: "error" | "warning" | "info";
  message: string;
  nodes: { id: string; kind: "person" | "polity" | "event"; name: string }[];
};

type Report = { generatedAt: string; counts: Record<Check, number>; issues: Issue[] };

const checks: { key: Check; title: string; hint: string }[] = [
  {
    key: "ancestor_cycle",
    title: "Vòng tổ tiên",
    hint: "Một người là tổ tiên của chính mình qua các quan hệ cha/mẹ - con.",
  },
  {
    key: "parent_born_after_child",
    title: "Cha mẹ sinh sau con",
    hint: "Ngày sinh của cha/mẹ muộn hơn ngày sinh của con.",
  },
  {
    key: "parent_died_before_conception",
    title: "Cha mất quá sớm",
    hint: "Cha/mẹ mất hơn chín tháng trước khi con ra đời (không tính con nuôi).",
  },
  {
    key: "death_before_birth",
    title: "Mất trước khi sinh",
    hint: "Ngày mất sớm hơn ngày sinh của cùng một người.",
  },
  {
    key: "tenure_ends_before_start",
    title: "Chức vụ kết thúc trước khi bắt đầu",
    hint: "Ngày kết thúc nhiệm kỳ sớm hơn ngày bắt đầu.",
  },
  {
    key: "overlapping_tenures",
    title: "Hai người cùng giữ một ngôi",
    hint: "Hai nhiệm kỳ chồng lên nhau cho cùng chức vụ đứng đầu của một chính thể (bỏ qua nhiệm kỳ còn tranh cãi).",
  },
  {
    key: "node_without_source",
    title: "Chưa có nguồn trích dẫn",
    hint: "Nhân vật, chính thể hoặc sự kiện chưa có nguồn nào cho chính nó, quan hệ hay chức vụ của nó.",
  },
  {
    key: "event_without_participants",
    title: "Sự kiện chưa có người tham gia",
    hint: "Sự kiện chưa ghi nhân vật hay chính thể nào tham gia.",
  },
  {
    key: "participant_outside_lifespan",
    title: "Tham gia khi chưa sinh hoặc đã mất",
    hint: "Người tham gia mất trước khi sự kiện bắt đầu hoặc sinh sau khi sự kiện kết thúc.",
  },
];

const severityBadge = { error: "destructive", warning: "warning", info: "neutral" } as const;
const severityLabel = { error: "Lỗi", warning: "Cần xem", info: "Gợi ý" } as const;

// Runs the data checks on demand and lists what they found, with links to fix each item.
export function Consistency() {
  const { data, isLoading, isFetching, refetch, isError } = useQuery({
    queryKey: ["consistency"],
    queryFn: () => api.get<Report>("/consistency-report"),
    staleTime: 0,
  });

  return (
    <>
      <PageHeader
        title="Chất lượng dữ liệu"
        description="Tìm những chỗ dữ liệu mâu thuẫn: ngày tháng đảo ngược, vòng tổ tiên, hai người cùng giữ một ngôi, mục chưa có nguồn."
        action={
          <Button variant="secondary" disabled={isFetching} onClick={() => void refetch()}>
            <RefreshCw className={isFetching ? "animate-spin" : ""} />
            {isFetching ? "Đang kiểm tra..." : "Kiểm tra lại"}
          </Button>
        }
      />
      {isError && <p className="text-destructive">Không chạy được kiểm tra, thử lại sau.</p>}
      {isLoading && <Skeleton className="h-40 w-full" />}
      {data && (
        <div className="flex flex-col gap-6">
          {checks.map(({ key, title, hint }) => {
            const issues = data.issues.filter((i) => i.check === key);
            const total = data.counts[key];
            return (
              <section key={key} className="bg-card rounded-xl border p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg">{title}</h2>
                  <Badge
                    variant={total === 0 ? "success" : severityBadge[issues[0]?.severity ?? "info"]}
                  >
                    {total === 0 ? "Ổn" : `${total} mục`}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">{hint}</p>
                {issues.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-2 text-sm">
                    {issues.map((issue, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Badge variant={severityBadge[issue.severity]}>
                          {severityLabel[issue.severity]}
                        </Badge>
                        <span>{issue.message}</span>
                        <span className="flex gap-2">
                          {issue.nodes.map((n) => (
                            <Link
                              key={n.id}
                              to={`/${n.kind === "person" ? "persons" : n.kind === "polity" ? "polities" : "events"}/${n.id}`}
                              className="text-primary"
                            >
                              Mở {n.name}
                            </Link>
                          ))}
                        </span>
                      </li>
                    ))}
                    {total > issues.length && (
                      <li className="text-muted-foreground">
                        … và {total - issues.length} mục nữa (chỉ hiện {issues.length} mục đầu).
                      </li>
                    )}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
