import { HeadingSkeleton, RowsSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <HeadingSkeleton titleClassName="w-40" subtitleClassName="w-80" />
      <RowsSkeleton className="mt-6" count={6} itemClassName="h-16" />
    </>
  );
}
