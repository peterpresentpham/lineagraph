// Where the public site lives, for "Xem trên web" links.
export const WEB_URL =
  (import.meta.env.VITE_WEB_URL as string | undefined) ?? "http://localhost:3200";
