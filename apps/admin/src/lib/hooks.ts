import { useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";
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

/**
 * Warns before leaving a form that has unsaved edits (in-app navigation and closing the tab).
 * Returns `allowLeave`, to call right before navigating away on purpose (for example after a
 * successful create), because the new state would not have reached the guard yet.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const dirtyRef = useRef(dirty);
  const bypass = useRef(false);
  dirtyRef.current = dirty;
  const blocker = useBlocker(() => dirtyRef.current && !bypass.current);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("Bạn có thay đổi chưa lưu. Rời khỏi trang này?")) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return () => {
    bypass.current = true;
  };
}
