import type { NextConfig } from "next";

// Phases are passed to the config by Next; plain strings, so this file imports nothing from Next.
const PHASE_DEVELOPMENT_SERVER = "phase-development-server";
const PHASE_PRODUCTION_SERVER = "phase-production-server";

const isLocal = (value: string) => /localhost|127\.0\.0\.1/.test(value);

/**
 * Stops a production build or start whose public URLs were left unset or at their localhost
 * defaults: canonical links, the sitemap and the browser's API calls would all point at the wrong
 * place, and nothing would say so. NEXT_PUBLIC_* is baked in at build time, so it is checked then;
 * API_URL is only read while serving, so it is checked when the server starts.
 */
function assertEnvironment(phase: string) {
  if (phase === PHASE_DEVELOPMENT_SERVER || process.env.ALLOW_LOCALHOST === "1") return;
  const problems: string[] = [];
  const need = (name: string) => {
    const value = process.env[name];
    if (!value) problems.push(`${name} is not set`);
    else if (isLocal(value)) problems.push(`${name} points at localhost (${value})`);
  };
  need("NEXT_PUBLIC_API_URL");
  need("SITE_URL");
  if (phase === PHASE_PRODUCTION_SERVER) need("API_URL");
  if (problems.length > 0) {
    throw new Error(`Invalid web configuration:\n- ${problems.join("\n- ")}`);
  }
}

const originOf = (url: string | undefined) => {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
};

function securityHeaders() {
  const api = originOf(process.env.NEXT_PUBLIC_API_URL);
  const https = (process.env.SITE_URL ?? "").startsWith("https://");
  // 'unsafe-inline' for scripts: the theme script in the layout and Next's own bootstrap scripts
  // are inline. Everything else (fonts, images, API calls) is limited to this site and the API.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${api}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    ...(https
      ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
      : []),
  ];
}

const nextConfig: NextConfig = {
  // @lineagraph/ui ships TypeScript source (shared with the Vite admin app).
  transpilePackages: ["@lineagraph/ui"],
  // Stop `next dev` from auto-writing AGENTS.md / CLAUDE.md here; the root CLAUDE.md is the
  // single source of truth for agent instructions in this repo.
  agentRules: false,
  poweredByHeader: false,
};

export default function config(phase: string): NextConfig {
  assertEnvironment(phase);
  // The development server needs eval for hot reload, so the strict policy is production only.
  if (phase === PHASE_DEVELOPMENT_SERVER) return nextConfig;
  return {
    ...nextConfig,
    async headers() {
      return [{ source: "/:path*", headers: securityHeaders() }];
    },
  };
}
