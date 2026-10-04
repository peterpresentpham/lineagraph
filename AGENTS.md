# AGENTS.md

## Language for code vs. content

- **Code must be in English:** function/variable/type names, file names, folder names, and
  code comments are always written in English, with correct, idiomatic naming conventions
  for the language/framework in use (e.g. `camelCase` for functions and variables,
  `PascalCase` for React components/types/classes, `kebab-case` for multi-word file and
  folder names — except where a framework forces a specific file name, like Next.js's
  `page.tsx`/`layout.tsx`, or a React component file matching its exported component name
  like `Dashboard.tsx`).
- **User-facing content stays in Vietnamese:** strings rendered in the UI (page titles,
  labels, button text, error messages shown to the user) follow the app's display language,
  which is Vietnamese. Do not translate these to English — only code identifiers and
  comments must be English.
- **Project codename is English:** the repo/package scope is `lineagraph`
  (`@lineagraph/core`, `@lineagraph/api`, ...). The Vietnamese product name "Sử Phả" is the
  name shown to users (app title, metadata), not the directory or package name — never
  rename the repo root or packages back to a Vietnamese/diacritic name.
- **Design docs in `docs/` are prose, not code:** the English-only rule above covers code
  (identifiers, file/folder names, comments). It does not apply to the Markdown design
  documents in `docs/` — their content stays in Vietnamese, matching the original docs they
  were ported from. File names inside `docs/` are still English (`design.md`,
  `services-and-ui.md`, `README.md`).
- When writing a new file or renaming an existing one, check it against these rules before
  considering the change done.

## Lint and format

- **Source of truth is the tooling, not this file:** `eslint.config.js` (one flat config, root)
  and `.prettierrc` define the actual rules. Run `pnpm lint` / `pnpm format:check` to verify,
  `pnpm lint:fix` / `pnpm format` to apply. Both run across the whole pnpm workspace — there is
  no per-package config.
- **Formatting (Prettier) is the single source of style** — double quotes, semicolons, 2-space
  indent, 100-char print width, Tailwind class order sorted by `prettier-plugin-tailwindcss`
  (including inside `cn(...)` calls, not just literal `className="..."`). ESLint does not
  re-declare any of this (`eslint-config-prettier` turns off every core rule that would
  conflict); don't hand-format against the grain of what Prettier would produce.
- **The codebase is not fully formatted yet.** `eslint.config.js`/`.prettierrc` were added after
  most of the code was written, so `pnpm format:check` currently fails on most existing files
  (whitespace/quote-style only — run `pnpm format` once to clear the backlog when convenient).
  New or touched files should still come out Prettier-clean; don't let unrelated pre-existing
  files block that.
- **Per-runtime ESLint scoping** (see `eslint.config.js` for the exact `files` globs): React +
  browser-global rules apply only to `apps/web`, `apps/admin/src`, `packages/ui/src`; Node
  globals and `no-console: off` apply only to `apps/api`, `apps/scripts`, `packages/core`
  (console output is the normal interface for a server/CLI, not leftover debugging); the Vite
  Fast-Refresh-only-exports rule applies only to `apps/admin/src`, and is off even there,
  matching this project's habit of exporting a hook or helper alongside a component.
- **Unused vars/args:** prefix with `_` to intentionally ignore (`@typescript-eslint/no-unused-vars`
  allows `^_`).
- **Imports:** no duplicate `import` statements from the same module (merge them), imports stay
  at the top of the file, one blank line after the import block.
- **Don't run `lint`/`typecheck`/`build` after every change to verify.** The user runs these
  themselves afterward — running them per-change just burns time without changing what gets
  shipped. Still write code that's correct and Prettier-clean by hand; just don't spend a tool
  round-trip confirming it unless something is genuinely uncertain (e.g. a risky refactor) or
  the user asks for verification.

## React component Props

- **Name the prop type, don't inline it.** Every component gets a `type Props = {...}` declared
  right above it, referenced in the signature as `({ a, b }: Props)` — never the object type
  written directly inside the destructured parameter.

  ```tsx
  // Do this
  type Props = { label: string; value: string };
  export function Field({ label, value }: Props) {
    /* ... */
  }

  // Not this
  export function Field({ label, value }: { label: string; value: string }) {
    /* ... */
  }
  ```

- A file with one component uses the bare name `Props`. A file that exports more than one
  component (e.g. a small helper component defined next to the main one) disambiguates with
  `<ComponentName>Props` for each.
- Applies everywhere, including Next.js route files (`page.tsx`, `layout.tsx` —
  e.g. `type Props = { searchParams: Promise<{ q?: string }> }`), not just hand-written UI
  components.

## One instruction file per app, kept at the root

- The repo has exactly one pair of agent-instruction files, both at the repo root: this
  `AGENTS.md` (the actual content, read by non-Claude tools too) and `CLAUDE.md` (a one-line
  `@AGENTS.md` import, so Claude Code resolves to the same content). Don't create a nested
  `AGENTS.md`/`CLAUDE.md` in `apps/*` or `packages/*` — put app-specific rules in a new
  section here instead, scoped by a clear heading (e.g. "## apps/web specifics").
- **`apps/web` previously had its own auto-generated pair.** Next.js 16's dev server
  (`next dev`) detects AI coding agents and, unless told otherwise, writes a nested
  `AGENTS.md` + `CLAUDE.md` into the app directory with its own "this is not the Next.js you
  know, read `node_modules/next/dist/docs/`" notice. This is disabled in
  `apps/web/next.config.ts` via `agentRules: false` — if those two files reappear after
  running `next dev`, it means that flag got dropped from the config; restore it rather than
  re-deleting the files each time (they'll just come back until the flag is back).

## Design reference

Full design doc (data model, algorithms, architecture, roadmap) lives locally at
[`docs/`](docs/README.md) — read `docs/README.md` first, then `docs/design.md` and
`docs/services-and-ui.md` before changing structure here. These are working copies ported
from the personal knowledge repo (`teencare/knowledge/stuff/`); once code exists, treat the
copies here as the ones to keep in sync with the implementation.
