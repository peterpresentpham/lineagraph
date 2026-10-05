import { cn } from "@lineagraph/ui";

const tones = [
  "bg-accent text-accent-foreground",
  "bg-info/12 text-info",
  "bg-warning/15 text-warning",
] as const;

const sizes = {
  sm: "size-10 rounded-xl text-base",
  md: "size-12 rounded-xl text-lg",
  lg: "size-20 rounded-3xl text-4xl",
} as const;

type Props = { name: string; seed?: string; size?: keyof typeof sizes; className?: string };

// Initial-letter avatar. The tone is derived from `seed` so the same entity keeps its colour.
export function Monogram({ name, seed = name, size = "md", className }: Props) {
  const lastWord = name.trim().split(/\s+/).at(-1) ?? "";
  const initial = lastWord.charAt(0).toLocaleUpperCase("vi") || "?";
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center font-serif font-semibold",
        tones[hash % tones.length],
        sizes[size],
        className,
      )}
    >
      {initial}
    </span>
  );
}
