// Public base URL for metadata that needs an absolute link (OG tags, sitemap, robots).
// Set SITE_URL in production; falls back to the local dev origin, matching WEB_ORIGIN in .env.example.
export const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";
