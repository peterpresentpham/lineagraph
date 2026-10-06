// Where things are. Production builds and starts refuse to run with these unset or at localhost
// (see next.config.ts); the localhost values below are only the fallback for `pnpm dev`.
//
// Server components call `API_URL` (can be a private address); code that runs in the browser calls
// `PUBLIC_API_URL` (NEXT_PUBLIC_API_URL), which must be reachable from visitors.
export const API_URL = process.env.API_URL ?? "http://localhost:4200";
export const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4200";

// Public base URL for metadata that needs an absolute link (OG tags, sitemap, robots).
export const SITE_URL = process.env.SITE_URL ?? "http://localhost:3200";

// Where visitors report a mistake (a public issue tracker, a form...). Optional: without it the
// report page explains how to describe the problem but has no button.
export const FEEDBACK_URL = process.env.FEEDBACK_URL ?? "";
