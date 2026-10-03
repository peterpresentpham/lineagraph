# CLAUDE.md

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

## Design reference

Full design doc (data model, algorithms, architecture, roadmap) lives locally at
[`docs/`](docs/README.md) — read `docs/README.md` first, then `docs/design.md` and
`docs/services-and-ui.md` before changing structure here. These are working copies ported
from the personal knowledge repo (`teencare/knowledge/stuff/`); once code exists, treat the
copies here as the ones to keep in sync with the implementation.
