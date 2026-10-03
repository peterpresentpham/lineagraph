import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sử Phả",
    short_name: "Sử Phả",
    description: "Học lịch sử Việt Nam qua phả hệ, nhân vật và triều đại",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f0e3",
    theme_color: "#9c2a1c",
    lang: "vi",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
