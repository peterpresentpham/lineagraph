import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { RegistryItem } from "./types";

export const useRegistry = (table: string) =>
  useQuery({
    queryKey: ["registry", table],
    queryFn: () => api.get<RegistryItem[]>(`/registries/${table}`),
    staleTime: 5 * 60 * 1000,
  });

export const labelOf = (items: RegistryItem[] | undefined, code: string | null | undefined) =>
  (code && items?.find((i) => i.code === code)?.label) || code || "";

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Đã có lỗi xảy ra";
}
