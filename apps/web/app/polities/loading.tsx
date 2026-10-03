import { HeadingSkeleton, RowsSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <HeadingSkeleton titleClassName="w-28" subtitleClassName="w-72" />
      <RowsSkeleton className="mt-6" count={8} itemClassName="h-16" />
    </>
  );
}
