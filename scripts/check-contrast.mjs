// Checks that the theme's text colours are readable (WCAG 2.1 contrast) in both light and dark
// mode, by resolving the tokens in packages/ui/src/theme/{tokens,semantic}.css:
//   node scripts/check-contrast.mjs
// Exits 1 when a pair falls below its minimum (4.5:1 for text, 3:1 for large text and UI parts).
import { readFileSync } from "node:fs";

const read = (f) => readFileSync(new URL(`../packages/ui/src/theme/${f}`, import.meta.url), "utf8");
const css = read("tokens.css") + read("semantic.css");

const tokens = new Map(
  [...css.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
);

// "light-dark(a, b)" -> [a, b], splitting on the top-level comma only.
function splitLightDark(value) {
  const m = value.match(/^light-dark\((.*)\)$/s);
  if (!m) return [value, value];
  let depth = 0;
  for (let i = 0; i < m[1].length; i++) {
    const c = m[1][i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) return [m[1].slice(0, i).trim(), m[1].slice(i + 1).trim()];
  }
  throw new Error(`cannot split ${value}`);
}

function resolve(value, mode, seen = 0) {
  if (seen > 10) throw new Error(`token loop at ${value}`);
  const v = splitLightDark(value)[mode === "light" ? 0 : 1];
  const ref = v.match(/^var\(--([\w-]+)\)$/);
  if (ref)
    return resolve(
      tokens.get(ref[1]) ??
        (() => {
          throw new Error(`missing --${ref[1]}`);
        })(),
      mode,
      seen + 1,
    );
  return v;
}

function toRgb(color) {
  if (color.startsWith("#")) {
    const h = color.length === 4 ? [...color.slice(1)].map((c) => c + c).join("") : color.slice(1);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  }
  const m = color.match(/^oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/);
  if (!m) throw new Error(`unsupported colour ${color}`);
  const L = Number(m[1]) > 1 ? Number(m[1]) / 100 : Number(m[1]);
  const C = Number(m[2]);
  const h = (Number(m[3]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  return lin.map((x) => {
    const c = Math.min(1, Math.max(0, x));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  });
}

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratioOf = (fgRgb, bgRgb) => {
  const [a, b] = [luminance(fgRgb), luminance(bgRgb)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};
const contrast = (fg, bg) => ratioOf(toRgb(fg), toRgb(bg));

// A status badge is text in the status colour over a faint tint of the same colour
// (`bg-success/12 text-success`): the tint lowers the contrast a little, so check it as drawn.
const tinted = (token, alpha, backdrop) => {
  const t = toRgb(token);
  const b = toRgb(backdrop);
  return t.map((c, i) => c * alpha + b[i] * (1 - alpha));
};

// [foreground token, background token, minimum ratio, what it is]
const pairs = [
  ["foreground", "background", 4.5, "body text"],
  ["foreground", "card", 4.5, "text on cards"],
  ["muted-foreground", "background", 4.5, "secondary text"],
  ["muted-foreground", "card", 4.5, "secondary text on cards"],
  ["muted-foreground", "muted", 4.5, "secondary text on muted areas"],
  ["primary-foreground", "primary", 4.5, "button label"],
  ["accent-foreground", "accent", 4.5, "accent label"],
  ["primary", "background", 4.5, "links"],
  ["destructive", "background", 4.5, "error text"],
  ["success", "background", 4.5, "success text"],
  ["warning", "background", 4.5, "warning text"],
  ["info", "background", 4.5, "info text"],
  ["highlight", "background", 3, "decorative highlight (large text)"],
  ["ring", "background", 3, "focus ring"],
];

const badges = [
  ["success", 0.12],
  ["warning", 0.15],
  ["info", 0.12],
];

let failed = 0;
for (const mode of ["light", "dark"]) {
  for (const [fg, bg, min, what] of pairs) {
    const ratio = contrast(resolve(tokens.get(fg), mode), resolve(tokens.get(bg), mode));
    const ok = ratio >= min;
    if (!ok) failed++;
    console.log(
      `${ok ? "ok  " : "FAIL"} ${mode.padEnd(5)} ${ratio.toFixed(2).padStart(5)} (min ${min}) ${what}: ${fg} on ${bg}`,
    );
  }
}
for (const mode of ["light", "dark"]) {
  for (const [name, alpha] of badges) {
    const color = resolve(tokens.get(name), mode);
    const backdrop = resolve(tokens.get("background"), mode);
    const ratio = ratioOf(toRgb(color), tinted(color, alpha, backdrop));
    const ok = ratio >= 4.5;
    if (!ok) failed++;
    console.log(
      `${ok ? "ok  " : "FAIL"} ${mode.padEnd(5)} ${ratio.toFixed(2).padStart(5)} (min 4.5) ${name} badge: text on its tint`,
    );
  }
}
if (failed > 0) {
  console.error(`\n${failed} colour pair(s) are below their minimum contrast.`);
  process.exit(1);
}
