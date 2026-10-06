import { GridSkeleton, HeadingSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <HeadingSkeleton titleClassName="w-32" subtitleClassName="w-64" />
      <GridSkeleton className="mt-6" count={12} itemClassName="h-20" />
    </>
  );
}
