// Decorative family tree for the hero: nodes joined by curved branches, in gold on the dark panel.
// Purely ornamental (aria-hidden); positions are fixed so the server and the browser agree.
type Node = { x: number; y: number; r: number };

const nodes: Node[] = [
  { x: 300, y: 36, r: 9 },
  { x: 170, y: 120, r: 7 },
  { x: 430, y: 120, r: 7 },
  { x: 100, y: 214, r: 6 },
  { x: 236, y: 214, r: 6 },
  { x: 364, y: 214, r: 6 },
  { x: 500, y: 214, r: 6 },
  { x: 60, y: 312, r: 4.5 },
  { x: 140, y: 312, r: 4.5 },
  { x: 200, y: 312, r: 4.5 },
  { x: 272, y: 312, r: 4.5 },
  { x: 336, y: 312, r: 4.5 },
  { x: 396, y: 312, r: 4.5 },
  { x: 470, y: 312, r: 4.5 },
  { x: 536, y: 312, r: 4.5 },
  { x: 100, y: 396, r: 3 },
  { x: 236, y: 396, r: 3 },
  { x: 364, y: 396, r: 3 },
  { x: 500, y: 396, r: 3 },
];

// Parent index -> child indexes.
const links: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [2, 5],
  [2, 6],
  [3, 7],
  [3, 8],
  [4, 9],
  [4, 10],
  [5, 11],
  [5, 12],
  [6, 13],
  [6, 14],
  [7, 15],
  [10, 16],
  [12, 17],
  [14, 18],
];

const branch = (a: Node, b: Node) => {
  const mid = (a.y + b.y) / 2;
  return `M${a.x} ${a.y} C${a.x} ${mid}, ${b.x} ${mid}, ${b.x} ${b.y}`;
};

export function LineageMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 430"
      aria-hidden
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
    >
      {links.map(([from, to]) => (
        <path
          key={`${from}-${to}`}
          d={branch(nodes[from]!, nodes[to]!)}
          pathLength={1}
          strokeWidth="1.25"
          strokeOpacity="0.45"
          className="motif-branch"
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i} className="motif-node" style={{ animationDelay: `${(i % 7) * 0.35}s` }}>
          <circle
            cx={n.x}
            cy={n.y}
            r={n.r + 6}
            fill="currentColor"
            fillOpacity="0.08"
            stroke="none"
          />
          <circle
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill="currentColor"
            fillOpacity={i === 0 ? 0.95 : 0.7}
            stroke="none"
          />
        </g>
      ))}
    </svg>
  );
}
