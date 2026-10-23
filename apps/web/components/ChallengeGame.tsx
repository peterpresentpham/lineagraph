"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Flame,
  Lightbulb,
  RotateCcw,
  Share2,
  Shuffle,
  Undo2,
} from "lucide-react";
import { cn } from "@lineagraph/ui";
import { PUBLIC_API_URL } from "@/lib/site";
import {
  rating,
  saveResult,
  savedResult,
  savedStreak,
  shareText,
  type Challenge,
  type Neighbor,
  type NodeRef,
  type RouteStep,
} from "@/lib/challenge";

type Props = { initial: Challenge };

type Move = { node: NodeRef; typeLabel: string };

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${PUBLIC_API_URL}${path}`);
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;
}

// The game: walk from relative to relative until you reach the target person. State lives in the
// component; only a finished daily challenge is remembered (for the streak).
export function ChallengeGame({ initial }: Props) {
  const [challenge, setChallenge] = useState(initial);
  const [moves, setMoves] = useState<Move[]>([]);
  const [neighbors, setNeighbors] = useState<Neighbor[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hints, setHints] = useState(0);
  const [solution, setSolution] = useState<RouteStep[] | null>(null);
  const [streak, setStreak] = useState(0);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const alreadyPlayed = useRef<{ steps: number; hints: number } | null>(null);

  const current: NodeRef = moves.at(-1)?.node ?? challenge.a;
  const finished = current.id === challenge.b.id;
  const steps = moves.length;
  const isDaily = !!challenge.date;

  useEffect(() => {
    alreadyPlayed.current = challenge.date ? savedResult(challenge.date) : null;
    setStreak(savedStreak());
  }, [challenge]);

  // Load the relatives of wherever the player stands.
  useEffect(() => {
    if (finished) return;
    let cancelled = false;
    setNeighbors(null);
    setFailed(false);
    setHint(null);
    getJson<Neighbor[]>(`/challenge/neighbors/${encodeURIComponent(current.slug)}`)
      .then((list) => !cancelled && setNeighbors(list))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [current.slug, finished]);

  // On arrival: record a daily result for the streak.
  useEffect(() => {
    if (finished && challenge.date) setStreak(saveResult(challenge.date, steps, hints));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const visited = new Set([challenge.a.id, ...moves.map((m) => m.node.id)]);
  const choose = (n: Neighbor) => setMoves((m) => [...m, { node: n.node, typeLabel: n.typeLabel }]);

  const reset = () => {
    setMoves([]);
    setHints(0);
    setSolution(null);
  };

  const route = useCallback(
    (from: string) =>
      getJson<{ steps: RouteStep[] }>(
        `/challenge/route?from=${encodeURIComponent(from)}&to=${encodeURIComponent(challenge.b.slug)}`,
      ).then((r) => r.steps),
    [challenge.b.slug],
  );

  const askHint = async () => {
    setBusy(true);
    try {
      const next = (await route(current.slug))[0];
      if (next) {
        setHint(next.node.id);
        setHints((h) => h + 1);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const reveal = async () => {
    setBusy(true);
    try {
      setSolution(await route(challenge.a.slug));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const another = async () => {
    setBusy(true);
    try {
      setChallenge(await getJson<Challenge>("/challenge/random"));
      reset();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const text = shareText(challenge, steps, hints, `${window.location.origin}/thu-thach`);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Sao chép kết quả:", text);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const result = finished ? rating(steps, challenge.par) : null;

  return (
    <div className="mt-8">
      <section className="bg-ink relative overflow-hidden rounded-3xl p-6 shadow-lg sm:p-8">
        <div className="relative grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
          <PersonPill label="Điểm xuất phát" node={challenge.a} />
          <div className="text-gold-300 flex flex-col items-center gap-1 text-center">
            <ArrowRight className="size-7 max-md:rotate-90" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">
              ngắn nhất {challenge.par} bước
            </span>
          </div>
          <PersonPill label="Cần tới" node={challenge.b} />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/15 pt-4 text-sm">
          <span className="text-night-200">
            Đã đi: <b className="text-white">{steps}</b> bước
          </span>
          {hints > 0 && <span className="text-night-200">Gợi ý: {hints}</span>}
          {isDaily && streak > 0 && (
            <span className="text-gold-300 inline-flex items-center gap-1.5">
              <Flame className="size-4" aria-hidden /> {streak} ngày liên tiếp
            </span>
          )}
          <span className="ml-auto flex gap-2">
            <GhostButton
              onClick={() => setMoves((m) => m.slice(0, -1))}
              disabled={steps === 0 || finished}
            >
              <Undo2 className="size-4" aria-hidden /> Lùi một bước
            </GhostButton>
            <GhostButton onClick={reset} disabled={steps === 0 && !solution}>
              <RotateCcw className="size-4" aria-hidden /> Làm lại
            </GhostButton>
          </span>
        </div>
      </section>

      {alreadyPlayed.current && isDaily && steps === 0 && (
        <p className="bg-accent text-accent-foreground mt-4 rounded-xl px-4 py-3 text-sm">
          Bạn đã chơi thử thách hôm nay: {alreadyPlayed.current.steps} bước. Có thể chơi lại cho
          vui, hoặc thử một cặp ngẫu nhiên.
        </p>
      )}

      <ol className="mt-8 flex flex-col" aria-label="Đường bạn đã đi">
        <PathItem node={challenge.a} first />
        {moves.map((m, i) => (
          <PathItem key={m.node.id} node={m.node} via={m.typeLabel} last={i === moves.length - 1} />
        ))}
      </ol>

      {finished && result ? (
        <section className="surface mt-8 p-6 text-center sm:p-8" aria-live="polite">
          <div className="text-gold text-4xl" aria-hidden>
            {"★".repeat(result.stars)}
            <span className="opacity-30">{"★".repeat(3 - result.stars)}</span>
          </div>
          <h2 className="mt-2 font-serif text-3xl font-semibold">{result.label}</h2>
          <p className="text-muted-foreground mt-2">
            Bạn nối {challenge.a.name} với {challenge.b.name} trong <b>{steps}</b> bước
            {steps > challenge.par ? `, đường ngắn nhất là ${challenge.par}` : ""}.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ActionButton onClick={share} primary>
              {copied ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Share2 className="size-4" aria-hidden />
              )}
              {copied ? "Đã chép kết quả" : "Chia sẻ kết quả"}
            </ActionButton>
            <ActionButton onClick={another} disabled={busy}>
              <Shuffle className="size-4" aria-hidden /> Cặp ngẫu nhiên
            </ActionButton>
            {steps > challenge.par && !solution && (
              <ActionButton onClick={reveal} disabled={busy}>
                <Lightbulb className="size-4" aria-hidden /> Xem đường ngắn nhất
              </ActionButton>
            )}
          </div>
          {solution && (
            <ol className="mx-auto mt-6 max-w-md text-left text-sm">
              <li className="py-1 font-semibold">{challenge.a.name}</li>
              {solution.map((s) => (
                <li key={s.node.id} className="py-1">
                  <span className="text-muted-foreground">{s.typeLabel} </span>
                  <Link href={`/person/${s.node.slug}`} className="font-semibold">
                    {s.node.name}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : (
        <section className="mt-8" aria-labelledby="next-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="next-title" className="text-xl">
                Từ {current.name}, đi tiếp tới ai?
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Chọn một người thân hoặc người kế vị để bước tiếp.
              </p>
            </div>
            <GhostButton light onClick={askHint} disabled={busy || neighbors === null}>
              <Lightbulb className="size-4" aria-hidden /> Gợi ý bước tiếp
            </GhostButton>
          </div>
          {failed ? (
            <p role="alert" className="text-destructive text-sm">
              Không tải được lúc này, bạn thử lại sau ít giây.
            </p>
          ) : neighbors === null ? (
            <p className="text-muted-foreground text-sm">Đang tải...</p>
          ) : neighbors.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Người này chưa có quan hệ nào để đi tiếp. Hãy lùi một bước.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {neighbors.map((n) => {
                const seen = visited.has(n.node.id);
                return (
                  <li key={n.node.id}>
                    <button
                      type="button"
                      disabled={seen}
                      onClick={() => choose(n)}
                      className={cn(
                        "surface-interactive w-full p-4 text-left disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0",
                        hint === n.node.id && "ring-gold-500 ring-2",
                      )}
                    >
                      <span className="text-muted-foreground block text-xs">
                        {n.typeLabel} {n.details.length > 0 && `(${n.details.join(", ")})`}
                      </span>
                      <span className="mt-0.5 block font-serif text-lg font-semibold">
                        {n.node.name}
                      </span>
                      {seen && <span className="text-muted-foreground text-xs">đã đi qua</span>}
                      {hint === n.node.id && (
                        <span className="text-highlight text-xs font-semibold">
                          Gợi ý: thử người này
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <div className="mt-10 flex justify-center">
        {!finished && (
          <GhostButton light onClick={another} disabled={busy}>
            <Shuffle className="size-4" aria-hidden /> Đổi sang một cặp ngẫu nhiên
          </GhostButton>
        )}
      </div>
    </div>
  );
}

type PillProps = { label: string; node: NodeRef };

function PersonPill({ label, node }: PillProps) {
  return (
    <div className="text-center md:text-left">
      <p className="text-gold-300 text-xs font-semibold uppercase tracking-[0.16em]">{label}</p>
      <Link
        href={`/person/${node.slug}`}
        className="mt-1 block font-serif text-3xl font-semibold leading-tight text-white no-underline hover:underline"
      >
        {node.name}
      </Link>
    </div>
  );
}

type PathItemProps = { node: NodeRef; via?: string; first?: boolean; last?: boolean };

function PathItem({ node, via, first, last }: PathItemProps) {
  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "mt-1.5 size-3.5 shrink-0 rounded-full border-2",
            first || last ? "bg-primary border-primary" : "bg-background border-primary",
          )}
          aria-hidden
        />
        {!last && <span className="bg-border w-0.5 flex-1" aria-hidden />}
      </div>
      <div className={cn("pb-5", last && "pb-0")}>
        {via && <p className="text-muted-foreground text-xs">{via}</p>}
        <p className="font-serif text-lg font-semibold">{node.name}</p>
      </div>
    </li>
  );
}

type ButtonProps = {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** For use on the light page; the default is for the dark panel. */
  light?: boolean;
  primary?: boolean;
};

function GhostButton({ children, onClick, disabled, light }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        light
          ? "text-foreground hover:bg-muted"
          : "hover:border-gold-300 hover:text-gold-300 border-white/25 text-white",
      )}
    >
      {children}
    </button>
  );
}

function ActionButton({ children, onClick, disabled, primary }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-transform hover:scale-[1.02] disabled:opacity-50",
        primary ? "bg-brand-gradient shadow-brand text-white" : "bg-muted text-foreground border",
      )}
    >
      {children}
    </button>
  );
}
