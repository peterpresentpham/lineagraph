import { Skeleton } from "@lineagraph/ui";
import { RowsSkeleton, SectionSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-2 h-5 w-40" />
      <div className="mt-3 flex gap-1.5">
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      <SectionSkeleton headingClassName="w-28">
        <Skeleton className="h-64 rounded-[var(--radius)]" />
      </SectionSkeleton>

      <SectionSkeleton headingClassName="w-56">
        <RowsSkeleton count={4} itemClassName="h-16" />
      </SectionSkeleton>
    </>
  );
}
