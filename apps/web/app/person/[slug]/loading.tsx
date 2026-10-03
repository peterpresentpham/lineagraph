import { Skeleton } from "@lineagraph/ui";
import { GridSkeleton, RowsSkeleton, SectionSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-56" />
          <Skeleton className="mt-2 h-5 w-40" />
          <div className="mt-3 flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      <SectionSkeleton headingClassName="w-20">
        <RowsSkeleton count={3} itemClassName="h-16" />
      </SectionSkeleton>

      <SectionSkeleton headingClassName="w-20">
        <GridSkeleton count={3} itemClassName="h-20" />
      </SectionSkeleton>
    </>
  );
}
