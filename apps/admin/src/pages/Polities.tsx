import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@lineagraph/ui";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { PageHeader } from "../components/PageHeader";
import { TableSkeleton } from "../components/TableSkeleton";
import { api } from "../lib/api";
import { labelOf, useRegistry } from "../lib/hooks";
import type { PolitySummary } from "../lib/types";

export function Polities() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: types } = useRegistry("polity_type");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["polities", q],
    queryFn: () => api.get<PolitySummary[]>(`/polities?q=${encodeURIComponent(q)}`),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["polities"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  return (
    <>
      <PageHeader
        title="Chính thể"
        description="Triều đại, vương quốc, chính quyền... Bấm vào một chính thể để sửa thông tin, quan hệ, nhân vật và nguồn."
        action={
          <Button onClick={() => navigate("/polities/new")}>
            <Plus /> Thêm chính thể
          </Button>
        }
      />
      <Input
        placeholder="Tìm theo tên..."
        className="mb-4 max-w-sm"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Thời gian tồn tại</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeleton cols={4} />}
            {data?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <Link to={`/polities/${p.id}`}>{p.name}</Link>
                </TableCell>
                <TableCell>{labelOf(types, p.polityType)}</TableCell>
                <TableCell>
                  {p.started || p.ended
                    ? `${p.started?.label ?? "?"} – ${p.ended?.label ?? "?"}`
                    : ""}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/polities/${p.id}`)}>
                    <Pencil />
                  </Button>
                  <ConfirmDelete
                    title={`Xoá "${p.name}"?`}
                    description="Chính thể sẽ biến mất khỏi trang xem."
                    onConfirm={async () => {
                      await api.del(`/polities/${p.id}`);
                      toast.success("Đã xoá chính thể");
                      refresh();
                    }}
                    trigger={(openDialog) => (
                      <Button variant="ghost" size="icon" onClick={openDialog}>
                        <Trash2 />
                      </Button>
                    )}
                  />
                </TableCell>
              </TableRow>
            ))}
            {data && data.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                  Chưa có chính thể nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
