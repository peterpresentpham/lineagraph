import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, toast } from "@lineagraph/ui";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { Field, NativeSelect } from "../components/Field";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import { errorMessage } from "../lib/hooks";
import type { RegistryItem } from "../lib/types";

const tableLabels: Record<string, string> = {
  name_kind: "Loại tên",
  polity_type: "Loại chính thể",
  office_type: "Chức vụ",
  succession_mode: "Cách lên nắm quyền",
  attribute_type: "Loại thông tin khác",
  relation_type: "Loại quan hệ (xem trang Loại quan hệ)",
  calendar: "Lịch",
};
const editable = new Set(["name_kind", "polity_type", "office_type", "succession_mode", "attribute_type"]);

export function Registries() {
  const queryClient = useQueryClient();
  const [table, setTable] = useState("office_type");
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");

  const { data } = useQuery({
    queryKey: ["registry", table],
    queryFn: () => api.get<RegistryItem[]>(`/registries/${table}`),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["registry", table] });

  const add = useMutation({
    mutationFn: () => api.post(`/registries/${table}`, { code, label }),
    onSuccess: () => { toast.success("Đã thêm"); setCode(""); setLabel(""); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Danh mục"
        description="Các giá trị dùng trong danh sách chọn (chức vụ, loại tên...). Thêm giá trị mới ở đây, không cần sửa code."
      />
      <Field label="Danh mục" className="mb-4 max-w-xs">
        <NativeSelect value={table} onChange={(e) => setTable(e.target.value)}>
          {Object.entries(tableLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </NativeSelect>
      </Field>

      {editable.has(table) && (
        <form
          className="mb-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => { e.preventDefault(); add.mutate(); }}
        >
          <Field label="Mã" hint="Chữ thường, số, gạch dưới. Không đổi được sau khi tạo.">
            <Input required placeholder="vi_du_ma" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Field label="Nhãn hiển thị">
            <Input required placeholder="Tên tiếng Việt" value={label} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <Button type="submit" disabled={add.isPending} className="mb-6">Thêm</Button>
        </form>
      )}

      <div className="max-w-2xl rounded-[var(--radius)] border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Nhãn hiển thị</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((item) => (
              <TableRow key={item.code}>
                <TableCell className="font-mono text-xs">{item.code}</TableCell>
                <TableCell>{item.label}</TableCell>
                <TableCell className="text-right">
                  {editable.has(table) && (
                    <ConfirmDelete
                      title={`Xoá "${item.label}"?`}
                      description="Không xoá được nếu giá trị này đang được dùng."
                      onConfirm={async () => { await api.del(`/registries/${table}/${item.code}`); toast.success("Đã xoá"); refresh(); }}
                      trigger={(openDialog) => <Button variant="ghost" size="icon" onClick={openDialog}><Trash2 /></Button>}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
