import { Skeleton } from "@lineagraph/ui";
import { GridSkeleton, SectionSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <div className="border-l-primary bg-card border-l-4 px-8 py-10 shadow-[0_1px_0_var(--border)]">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-4 h-9 w-full max-w-2xl" />
        <Skeleton className="mt-2 h-9 w-2/3 max-w-xl" />
        <Skeleton className="mt-4 h-5 w-full max-w-xl" />
        <Skeleton className="mt-6 h-12 w-full max-w-md" />
      </div>
      <SectionSkeleton headingClassName="w-28">
        <GridSkeleton count={6} itemClassName="h-20" />
      </SectionSkeleton>
      <SectionSkeleton headingClassName="w-24">
        <GridSkeleton
          count={8}
          itemClassName="h-24"
          gridClassName="sm:grid-cols-2 lg:grid-cols-4"
        />
      </SectionSkeleton>
    </>
  );
}
