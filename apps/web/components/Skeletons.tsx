import type { ReactNode } from "react";
import { Skeleton, cn } from "@lineagraph/ui";

// Shared building blocks for route-level loading.tsx files, so each one only composes
// these instead of re-writing the same title/grid/list markup.

type HeadingSkeletonProps = {
  titleClassName?: string;
  subtitleClassName?: string;
  className?: string;
};

export function HeadingSkeleton({
  titleClassName = "w-40",
  subtitleClassName = "w-72",
  className,
}: HeadingSkeletonProps) {
  return (
    <div className={className}>
      <Skeleton className={cn("h-8", titleClassName)} />
      <Skeleton className={cn("mt-2 h-5", subtitleClassName)} />
    </div>
  );
}

type SectionSkeletonProps = {
  headingClassName?: string;
  children: ReactNode;
};

// Mirrors the real <Section>: a heading plus its divider, wrapping loading content for that section.
export function SectionSkeleton({ headingClassName = "w-28", children }: SectionSkeletonProps) {
  return (
    <section className="mt-8">
      <Skeleton className={cn("h-6", headingClassName)} />
      <Skeleton className="mb-4 mt-2 h-px w-full" />
      {children}
    </section>
  );
}

type GridSkeletonProps = {
  count: number;
  itemClassName?: string;
  gridClassName?: string;
  className?: string;
};

export function GridSkeleton({
  count,
  itemClassName = "h-20",
  gridClassName = "sm:grid-cols-2 lg:grid-cols-3",
  className,
}: GridSkeletonProps) {
  return (
    <div className={cn("grid gap-3", gridClassName, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn("rounded-[var(--radius)]", itemClassName)} />
      ))}
    </div>
  );
}

type RowsSkeletonProps = {
  count: number;
  itemClassName?: string;
  className?: string;
};

export function RowsSkeleton({ count, itemClassName = "h-16", className }: RowsSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn("rounded-[var(--radius)]", itemClassName)} />
      ))}
    </div>
  );
}
