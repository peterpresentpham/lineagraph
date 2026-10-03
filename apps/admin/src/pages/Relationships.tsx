import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import { RelationForm, useRelationTypes } from "../components/RelationForm";
import { TableSkeleton } from "../components/TableSkeleton";
import { api } from "../lib/api";
import { nodeKindLabels } from "../lib/format";
import type { RelationshipView } from "../lib/types";

const ALL_TYPES = "__all__";

export function Relationships() {
  const queryClient = useQueryClient();
  const { data: types } = useRelationTypes();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["relationships", "list", q, type],
    queryFn: () =>
      api.get<RelationshipView[]>(
        `/relationships?q=${encodeURIComponent(q)}&type=${type}&limit=200`,
      ),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["relationships"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  return (
    <>
      <PageHeader
        title="Quan hệ"
        description="Mọi mối quan hệ giữa nhân vật và chính thể, gồm cha/mẹ–con, vợ/chồng, thầy trò, đồng minh, kế vị... Cũng có thể thêm ngay trong trang của từng nhân vật hoặc chính thể."
        action={
          <Button
            onClick={() => {
              setEditingId(null);
              setOpen(true);
            }}
          >
            <Plus /> Thêm quan hệ
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Tìm theo tên một trong hai đối tượng..."
          className="max-w-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={type || ALL_TYPES} onValueChange={(v) => setType(v === ALL_TYPES ? "" : v)}>
          <SelectTrigger className="max-w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES}>Mọi loại quan hệ</SelectItem>
            {types
              ?.filter((t) => t.isPrimary)
              .map((t) => (
                <SelectItem key={t.code} value={t.code}>
                  {t.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <div className="bg-card rounded-[var(--radius)] border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Đối tượng thứ nhất</TableHead>
              <TableHead>Quan hệ</TableHead>
              <TableHead>Đối tượng thứ hai</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeleton cols={4} />}
            {data?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {r.from.name}{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    {nodeKindLabels[r.from.kind]}
                  </span>
                </TableCell>
                <TableCell>
                  {r.typeLabel}
                  {r.label && (
                    <Badge variant="warning" className="ml-2">
                      {r.label}
                    </Badge>
                  )}
                  {r.disputed && (
                    <Badge variant="warning" className="ml-1">
                      Còn tranh cãi
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {r.to.name}{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    {nodeKindLabels[r.to.kind]}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingId(r.id);
                      setOpen(true);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <ConfirmDelete
                    title="Xoá quan hệ này?"
                    description={`${r.from.name} · ${r.typeLabel} · ${r.to.name}`}
                    onConfirm={async () => {
                      await api.del(`/relationships/${r.id}`);
                      toast.success("Đã xoá quan hệ");
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
                  Chưa có quan hệ nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <RelationForm open={open} onOpenChange={setOpen} editingId={editingId} />
    </>
  );
}
