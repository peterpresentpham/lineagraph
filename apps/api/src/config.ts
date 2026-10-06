// Everything the API reads from the environment, checked once at start-up.
//
// In production a missing or placeholder value stops the process with a message naming each
// problem, instead of letting the API run with a localhost CORS list or a guessable secret.

export type Config = {
  production: boolean;
  port: number;
  /** Origins allowed to call the API from a browser. */
  corsOrigins: string[];
  /** Number of reverse proxies in front of the API (for per-client rate limits), or undefined. */
  trustProxy: number | undefined;
};

type Env = Record<string, string | undefined>;

const LOCAL_ORIGINS = ["http://localhost:3200", "http://localhost:4100"];

const isLocal = (value: string) => /localhost|127\.0\.0\.1/.test(value);

export function loadConfig(env: Env = process.env): Config {
  const production = env.NODE_ENV === "production";
  const port = env.PORT ? Number(env.PORT) : 4200;
  const trustProxy = env.TRUST_PROXY ? Number(env.TRUST_PROXY) : undefined;

  if (!production) {
    return {
      production,
      port,
      corsOrigins: [env.WEB_ORIGIN ?? LOCAL_ORIGINS[0]!, env.ADMIN_ORIGIN ?? LOCAL_ORIGINS[1]!],
      trustProxy,
    };
  }

  const problems: string[] = [];
  if (!env.DATABASE_URL) problems.push("DATABASE_URL is not set");
  const secret = env.JWT_SECRET ?? "";
  if (secret.length < 32) problems.push("JWT_SECRET must be at least 32 characters");
  else if (/^change-?me/i.test(secret)) problems.push("JWT_SECRET is still the example value");
  if (trustProxy === undefined || !Number.isInteger(trustProxy) || trustProxy < 1) {
    problems.push(
      "TRUST_PROXY must be the number of proxies in front of the API (1 on Railway); without it " +
        "every visitor shares one rate-limit bucket",
    );
  }
  for (const name of ["WEB_ORIGIN", "ADMIN_ORIGIN"] as const) {
    const value = env[name];
    if (!value) problems.push(`${name} is not set`);
    else if (isLocal(value) && env.ALLOW_LOCALHOST !== "1") {
      problems.push(`${name} points at localhost (${value})`);
    } else if (value.endsWith("/")) problems.push(`${name} must not end with a slash`);
  }
  if (problems.length > 0) {
    throw new Error(`Invalid production configuration:\n- ${problems.join("\n- ")}`);
  }
  return {
    production,
    port,
    corsOrigins: [env.WEB_ORIGIN!, env.ADMIN_ORIGIN!],
    trustProxy,
  };
}
