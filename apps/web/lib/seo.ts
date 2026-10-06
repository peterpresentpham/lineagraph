import type { Metadata } from "next";

type ListMetadata = {
  title: string;
  description: string;
  /** Path of the list without parameters, e.g. "/persons". */
  path: string;
  page: number;
  /** A search or filter is applied: that view is a variation of the list, not a page of its own. */
  filtered: boolean;
};

/**
 * Metadata of a list page. Every page of the plain list is indexable and is its own canonical
 * (`?page=2` is not a duplicate of page 1); a filtered or searched view is kept out of the index
 * but its links are still followed.
 */
export function listMetadata({ title, description, path, page, filtered }: ListMetadata): Metadata {
  const canonical = page > 1 && !filtered ? `${path}?page=${page}` : path;
  return {
    title: page > 1 ? `${title} (trang ${page})` : title,
    description,
    alternates: { canonical },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Open Graph fields every record page repeats; Next replaces (not merges) the parent's block. */
export function recordOpenGraph(fields: { title: string; description: string; path: string }) {
  return {
    title: fields.title,
    description: fields.description,
    url: fields.path,
    siteName: "Sử Phả",
    locale: "vi_VN",
  };
}
