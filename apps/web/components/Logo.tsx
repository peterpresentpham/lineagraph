import Link from "next/link";
import { Waypoints } from "lucide-react";
import { cn } from "@lineagraph/ui";

type Props = { showName?: boolean; className?: string; onDark?: boolean };

// Brand mark: gradient tile with a node-graph glyph, plus the product name.
export function Logo({ showName = true, className, onDark }: Props) {
  return (
    <Link
      href="/"
      aria-label="Sử Phả - trang chủ"
      className={cn("group flex items-center gap-2.5 no-underline hover:no-underline", className)}
    >
      <span className="bg-brand-gradient shadow-brand grid size-9 shrink-0 place-items-center rounded-xl text-white transition-transform duration-300 group-hover:rotate-6">
        <Waypoints className="size-5" />
      </span>
      {showName && (
        <span
          className={cn(
            "font-serif text-xl font-semibold tracking-tight",
            onDark ? "text-white" : "text-foreground",
          )}
        >
          Sử Phả
        </span>
      )}
    </Link>
  );
}
