// Types and helpers shared by the "Thử thách nối hai người" page and its game component.

export type NodeRef = { id: string; kind: "person" | "polity"; slug: string; name: string };
export type Challenge = { seed: string; date?: string; a: NodeRef; b: NodeRef; par: number };
export type Neighbor = { node: NodeRef; typeLabel: string; details: string[] };
export type RouteStep = { node: NodeRef; typeLabel: string; details: string[] };

/** How well a run went, by how far it is from the shortest route. */
export function rating(steps: number, par: number): { label: string; stars: 1 | 2 | 3 } {
  const over = steps - par;
  if (over <= 0) return { label: "Hoàn hảo: đúng đường ngắn nhất", stars: 3 };
  if (over <= 2) return { label: "Rất tốt", stars: 2 };
  return { label: "Hoàn thành", stars: 1 };
}

/** The text copied by "Chia sẻ": short enough to paste anywhere, with no spoilers beyond the pair. */
export function shareText(c: Challenge, steps: number, hints: number, url: string): string {
  const { stars } = rating(steps, c.par);
  const day = c.date ? c.date.split("-").reverse().join("/") : "ngẫu nhiên";
  return [
    `Sử Phả · Thử thách ${day}`,
    `${c.a.name} → ${c.b.name}`,
    `${"★".repeat(stars)}${"☆".repeat(3 - stars)} ${steps} bước (ngắn nhất ${c.par})${hints > 0 ? ` · ${hints} gợi ý` : ""}`,
    url,
  ].join("\n");
}

const STORAGE_KEY = "suphaChallenge";
type Saved = {
  lastDate: string;
  streak: number;
  results: Record<string, { steps: number; hints: number }>;
};

function read(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Saved;
  } catch {
    // Storage blocked or corrupt: play on without a record.
  }
  return { lastDate: "", streak: 0, results: {} };
}

/** The saved result for a day, if this browser played it. */
export const savedResult = (date: string) => read().results[date] ?? null;
export const savedStreak = () => read().streak;

const dayBefore = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/** Records a finished daily challenge and returns the streak of consecutive days played. */
export function saveResult(date: string, steps: number, hints: number): number {
  const saved = read();
  if (saved.results[date]) return saved.streak;
  saved.streak = saved.lastDate === dayBefore(date) ? saved.streak + 1 : 1;
  saved.lastDate = date;
  saved.results[date] = { steps, hints };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // ignore
  }
  return saved.streak;
}
