import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@lineagraph/ui";
import { api } from "./api";
import { errorMessage } from "./hooks";

type Options = {
  /** API collection path, e.g. "/persons"; `${path}/${id}` is deleted, `${path}/${id}/restore` undoes it. */
  path: string;
  /** What one item is called, e.g. "nhân vật". */
  noun: string;
  /** Query keys to refresh afterwards. */
  invalidate: string[];
};

const UNDO_MS = 8000;
const PARALLEL = 5;

/**
 * Deletes people, polities or events without a confirmation box: the toast offers "Hoàn tác" for a
 * few seconds instead (deletes are soft, so the record and its sources come back whole). Items
 * that cannot be deleted (still linked to others) are reported with the server's reason.
 */
export function useDeleteWithUndo({ path, noun, invalidate }: Options) {
  const queryClient = useQueryClient();
  const refresh = () => {
    for (const key of invalidate) queryClient.invalidateQueries({ queryKey: [key] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const restore = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => api.post(`${path}/${id}/restore`)));
      toast.success(
        ids.length === 1 ? `Đã khôi phục ${noun}` : `Đã khôi phục ${ids.length} ${noun}`,
      );
    } catch (e) {
      toast.error(errorMessage(e));
    }
    refresh();
  };

  /** Deletes the given items; `names` are only used in the message. Returns how many went. */
  const remove = async (items: { id: string; name: string }[]) => {
    const done: string[] = [];
    const failed: string[] = [];
    for (let i = 0; i < items.length; i += PARALLEL) {
      const batch = items.slice(i, i + PARALLEL);
      const results = await Promise.allSettled(batch.map((it) => api.del(`${path}/${it.id}`)));
      results.forEach((r, j) => {
        if (r.status === "fulfilled") done.push(batch[j]!.id);
        else failed.push(`${batch[j]!.name}: ${errorMessage(r.reason)}`);
      });
    }
    if (done.length > 0) {
      toast(
        done.length === 1
          ? `Đã xoá "${items.find((it) => it.id === done[0])!.name}"`
          : `Đã xoá ${done.length} ${noun}`,
        { duration: UNDO_MS, action: { label: "Hoàn tác", onClick: () => restore(done) } },
      );
    }
    if (failed.length > 0) {
      toast.error(
        failed.length === 1 ? failed[0]! : `${failed.length} mục không xoá được. ${failed[0]}`,
      );
    }
    refresh();
    return done.length;
  };

  return { remove };
}
