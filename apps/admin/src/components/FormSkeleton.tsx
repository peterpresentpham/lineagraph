import { Skeleton } from "@lineagraph/ui";

export function FormSkeleton() {
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Skeleton className="h-11 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
