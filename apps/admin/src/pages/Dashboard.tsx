import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, Crown, GitFork, Landmark, Network, Users } from "lucide-react";
import { Card, CardContent, Skeleton } from "@lineagraph/ui";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";

const tiles = [
  { key: "persons", label: "Nhân vật", to: "/persons", icon: Users },
  { key: "polities", label: "Chính thể", to: "/polities", icon: Landmark },
  { key: "relations", label: "Quan hệ", to: "/relationships", icon: Network },
  { key: "relation_types", label: "Loại quan hệ", to: "/relation-types", icon: GitFork },
  { key: "tenures", label: "Chức vụ đã ghi", to: "/persons", icon: Crown },
  { key: "sources", label: "Nguồn tư liệu", to: "/sources", icon: BookOpen },
];

export function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<Record<string, number>>("/stats"),
  });
  return (
    <>
      <PageHeader
        title="Tổng quan"
        description="Số lượng dữ liệu hiện có. Dữ liệu thêm ở đây sẽ hiện ngay trên trang xem của người dùng."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ key, label, to, icon: Icon }) => (
          <Link key={key} to={to} className="no-underline hover:no-underline">
            <Card className="no-underline transition-shadow hover:no-underline hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="bg-accent grid size-11 place-items-center rounded-[var(--radius)] text-[var(--primary)]">
                  <Icon className="size-5" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-10" />
                  ) : (
                    <div className="text-2xl font-bold">{data?.[key] ?? "–"}</div>
                  )}
                  <div className="text-muted-foreground text-sm">{label}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
