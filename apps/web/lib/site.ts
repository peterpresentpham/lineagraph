// Public base URL for metadata that needs an absolute link (OG tags, sitemap, robots).
// Set SITE_URL in production; falls back to the local dev origin, matching WEB_ORIGIN in .env.example.
// Where the API is. Server components call `API_URL` (can be a private address); code that runs in
// the browser calls `PUBLIC_API_URL` (NEXT_PUBLIC_API_URL), which must be reachable from visitors.
export const API_URL = process.env.API_URL ?? "http://localhost:4200";
export const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4200";

export const SITE_URL = process.env.SITE_URL ?? "http://localhost:3200";
