// Checks a running deployment from the outside: is it up, configured for production (no localhost
// leftovers), safe (security headers, writes need a login, CORS), and does it serve real pages?
//
//   node scripts/smoke.mjs --api https://api.example.com --web https://example.com \
//        [--admin https://admin.example.com]
//
// Exits 1 if anything fails. Safe to run against production: it only reads, and the one write it
// tries (without a token) is expected to be refused.
import process from "node:process";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1]] : null))
    .filter(Boolean),
);
const strip = (u) => u?.replace(/\/+$/, "");
const api = strip(args.api);
const web = strip(args.web);
const admin = strip(args.admin);
if (!api || !web) {
  console.error("Usage: node scripts/smoke.mjs --api <url> --web <url> [--admin <url>]");
  process.exit(2);
}

let failed = 0;
const check = (ok, label, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${!ok && detail ? ` (${detail})` : ""}`);
};
const get = (url, init) => fetch(url, { redirect: "manual", ...init });
const hasLocalhost = (text) => /localhost|127\.0\.0\.1/.test(text);

// --- API
console.log(`\nAPI ${api}`);
const health = await get(`${api}/health`);
check(
  health.status === 200 && (await health.json()).ok === true,
  "/health answers and the database is reachable",
  `status ${health.status}`,
);
check(!!health.headers.get("x-request-id"), "responses carry a request id");
check(health.headers.get("x-content-type-options") === "nosniff", "security headers are set");
check(health.headers.get("x-powered-by") === null, "does not announce the framework");
for (const path of [
  "/registries",
  "/search?q=a",
  "/timeline/centuries",
  "/bibliography?limit=1",
  "/persons?limit=1",
]) {
  const res = await get(`${api}${path}`);
  check(res.status === 200, `public read ${path}`, `status ${res.status}`);
}
const write = await get(`${api}/persons`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});
check(write.status === 401, "a write without a login is refused", `status ${write.status}`);
const stats = await get(`${api}/stats`);
check(stats.status === 401, "admin reads without a login are refused", `status ${stats.status}`);
const stranger = await get(`${api}/registries`, { headers: { Origin: "https://evil.example" } });
check(
  !stranger.headers.get("access-control-allow-origin"),
  "a stranger's origin gets no CORS permission",
);
const allowed = await get(`${api}/registries`, { headers: { Origin: web } });
check(
  allowed.headers.get("access-control-allow-origin") === web,
  "the web origin is allowed by CORS",
  `got ${allowed.headers.get("access-control-allow-origin")}`,
);
const old = await get(`${api}/review/today`);
check(old.status === 404, "unfinished routes are not exposed", `status ${old.status}`);

// --- Web
console.log(`\nWeb ${web}`);
const home = await get(web);
const homeHtml = await home.text();
check(home.status === 200, "home page answers", `status ${home.status}`);
check(!hasLocalhost(homeHtml), "home page mentions no localhost address");
const csp = home.headers.get("content-security-policy") ?? "";
check(csp.includes("frame-ancestors 'none'"), "Content-Security-Policy is set");
if (web.startsWith("https://")) {
  check((home.headers.get("strict-transport-security") ?? "").includes("max-age"), "HSTS is set");
}
const robots = await (await get(`${web}/robots.txt`)).text();
check(
  robots.includes(`Sitemap: ${web}/sitemap.xml`),
  "robots.txt points at this site's sitemap",
  robots.split("\n").find((l) => l.startsWith("Sitemap")) ?? "no sitemap line",
);
const sitemap = await (await get(`${web}/sitemap.xml`)).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
check(
  urls.length > 0 && urls.every((u) => u.startsWith(web)),
  `sitemap lists ${urls.length} URLs, all on this site`,
);
check(
  !urls.some((u) => /\/(search|graph|relations)(\?|$)/.test(u)),
  "sitemap leaves out the noindex pages",
);
for (const path of [
  "/gioi-thieu",
  "/nguon",
  "/bao-loi",
  "/quyen-rieng-tu",
  "/dieu-khoan",
  "/persons",
  "/polities",
  "/events",
  "/timeline",
]) {
  const res = await get(`${web}${path}`);
  check(res.status === 200, `page ${path}`, `status ${res.status}`);
}
check((await get(`${web}/no-such-page`)).status === 404, "an unknown page is a 404");

// A real record page: title, canonical link on this site, structured data that parses.
const sample = (await (await get(`${api}/persons?limit=1`)).json()).items?.[0];
if (sample) {
  const res = await get(`${web}/person/${sample.slug}`);
  const html = await res.text();
  check(res.status === 200, `person page /person/${sample.slug}`, `status ${res.status}`);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  check(
    canonical === `${web}/person/${sample.slug}`,
    "person page has the right canonical link",
    canonical ?? "none",
  );
  const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  let parsed = false;
  try {
    parsed = ld.length > 0 && ld.every((m) => JSON.parse(m[1]));
  } catch {
    parsed = false;
  }
  check(parsed, "person page structured data is valid JSON");
  const og = await get(`${web}/person/${sample.slug}/opengraph-image`);
  check(
    og.status === 200 && (og.headers.get("content-type") ?? "").includes("image/png"),
    "person page has a preview image",
  );
} else {
  console.log("skip no people in the database yet: record page checks skipped");
}

// --- Admin
if (admin) {
  console.log(`\nAdmin ${admin}`);
  const page = await get(admin);
  const html = await page.text();
  check(page.status === 200, "admin answers", `status ${page.status}`);
  check((page.headers.get("x-frame-options") ?? "") === "DENY", "admin refuses to be framed");
  check(
    (page.headers.get("content-security-policy") ?? "").includes("script-src 'self'"),
    "admin Content-Security-Policy is strict",
  );
  const bundle = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
  if (bundle) {
    const js = await (await get(`${admin}${bundle}`)).text();
    check(js.includes(api), "admin bundle was built for this API address");
    check(!js.includes("localhost:4200"), "admin bundle has no localhost API fallback");
  } else {
    check(false, "admin page loads its script bundle");
  }
}

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
