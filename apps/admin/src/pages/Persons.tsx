import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Badge,
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
import { historicityLabels, lifeSpan, sexLabels } from "../lib/format";
import type { PersonSummary } from "../lib/types";

const PAGE_SIZE = 50;

export function Persons() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["persons", q, page],
    queryFn: () =>
      api.get<{ items: PersonSummary[]; total: number }>(
        `/persons?q=${encodeURIComponent(q)}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`,
      ),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["persons"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Nhân vật"
        description="Bấm vào một nhân vật để sửa thông tin, quan hệ, chức vụ và nguồn."
        action={
          <Button onClick={() => navigate("/persons/new")}>
            <Plus /> Thêm nhân vật
          </Button>
        }
      />
      <Input
        placeholder="Tìm theo tên (không cần gõ dấu)..."
        className="mb-4 max-w-sm"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(0);
        }}
      />
      <div className="bg-card rounded-[var(--radius)] border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Giới tính</TableHead>
              <TableHead>Sinh – mất</TableHead>
              <TableHead>Tính xác thực</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeleton cols={5} />}
            {data?.items.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <Link to={`/persons/${p.id}`}>{p.name}</Link>
                </TableCell>
                <TableCell>{sexLabels[p.sex]}</TableCell>
                <TableCell>{lifeSpan(p.birth, p.death)}</TableCell>
                <TableCell>
                  <Badge variant={p.historicity === "historical" ? "success" : "warning"}>
                    {historicityLabels[p.historicity]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/persons/${p.id}`)}>
                    <Pencil />
                  </Button>
                  <ConfirmDelete
                    title={`Xoá "${p.name}"?`}
                    description="Nhân vật sẽ biến mất khỏi trang xem. Các quan hệ liên quan không còn hiển thị."
                    onConfirm={async () => {
                      await api.del(`/persons/${p.id}`);
                      toast.success("Đã xoá nhân vật");
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
            {data && data.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                  Chưa có nhân vật nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="text-muted-foreground mt-4 flex items-center justify-end gap-3 text-sm">
          Trang {page + 1}/{totalPages}
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Trước
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Sau
          </Button>
        </div>
      )}
    </>
  );
}
