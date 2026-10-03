import { Skeleton } from "@lineagraph/ui";
import { HeadingSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <HeadingSkeleton titleClassName="w-48" subtitleClassName="w-full max-w-2xl mb-6" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 w-20" />
      </div>
    </>
  );
}
