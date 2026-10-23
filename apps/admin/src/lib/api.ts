const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4200";
const TOKEN_KEY = "lineagraph.admin.token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Stable identifier from the API (`VALIDATION_FAILED`, `NOT_FOUND`...), for code to branch on. */
    public code?: string,
    /** Quote this when reporting a server error: it finds the exact line in the server log. */
    public requestId?: string,
  ) {
    super(message);
  }
}

// Called when the API rejects the token, so the app can send the admin back to /login.
let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

// The API issues short-lived tokens. While someone is working, the token is renewed shortly before
// it runs out, so a long editing session is never cut off and an abandoned one ends by itself.
const RENEW_WHEN_LEFT_MS = 10 * 60 * 1000;

function expiresAt(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

// One renewal at a time: requests that start while it runs wait for it instead of starting more.
let renewing: Promise<void> | null = null;

async function renewIfDue(path: string) {
  const token = tokenStore.get();
  if (!token || path.startsWith("/auth/")) return;
  if (expiresAt(token) - Date.now() > RENEW_WHEN_LEFT_MS) return;
  renewing ??= fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  })
    .then(async (response) => {
      if (response.ok) tokenStore.set(((await response.json()) as { token: string }).token);
      else if (response.status === 401) onUnauthorized();
    })
    .catch(() => undefined) // offline: the request below will report the real problem
    .finally(() => {
      renewing = null;
    });
  await renewing;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  await renewIfDue(path);
  const token = tokenStore.get();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch only rejects when no response arrived at all: offline, server down, or blocked by CORS.
    throw new ApiError(
      0,
      "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại; nếu vẫn lỗi, máy chủ có thể đang khởi động lại.",
      "NETWORK_ERROR",
    );
  }
  if (response.status === 401 && path !== "/auth/login") onUnauthorized();
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    // Validation failures list every problem, so show them all rather than just the first.
    const issues: string[] = Array.isArray(data?.issues)
      ? [...new Set<string>(data.issues.map((i: { message: string }) => i.message))]
      : [];
    const message = issues.length > 1 ? issues.join("; ") : (data?.error ?? "Đã có lỗi xảy ra");
    const requestId: string | undefined =
      data?.requestId ?? response.headers.get("x-request-id") ?? undefined;
    throw new ApiError(
      response.status,
      // A server fault is not something the person can fix: give them the code to report.
      response.status >= 500 && requestId ? `${message} (mã yêu cầu: ${requestId})` : message,
      data?.code,
      requestId,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

/** Asks the API to end every session of this account. Reads the token now, before it is cleared. */
export function endSessionsOnServer(): Promise<unknown> {
  const token = tokenStore.get();
  if (!token) return Promise.resolve();
  return fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    keepalive: true,
  }).catch(() => undefined);
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  del: (path: string) => request<void>("DELETE", path),
};
