import { Skeleton } from "@lineagraph/ui";
import { HeadingSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <HeadingSkeleton titleClassName="w-44" subtitleClassName="w-full max-w-2xl mb-6" />
      <Skeleton className="h-[480px] rounded-[var(--radius)]" />
    </>
  );
}
