import { notFound } from "next/navigation";
import type { RegistryItem } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:4200";

// Public read-only API; the web app never sends credentials.
export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error(`API ${path} failed with ${response.status}`);
  return response.json();
}

export async function getLabels(table: string): Promise<Record<string, string>> {
  const items = await apiGet<RegistryItem[]>(`/registries/${table}`);
  return Object.fromEntries(items.map((i) => [i.code, i.label]));
}
