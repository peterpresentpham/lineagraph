import { Skeleton } from "@lineagraph/ui";
import { HeadingSkeleton, RowsSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <HeadingSkeleton titleClassName="w-44" subtitleClassName="w-96" />
      <div className="mt-6 flex flex-col gap-8">
        {Array.from({ length: 3 }).map((_, g) => (
          <section key={g}>
            <Skeleton className="mb-3 h-6 w-32" />
            <RowsSkeleton count={4} itemClassName="h-14" />
          </section>
        ))}
      </div>
    </>
  );
}
