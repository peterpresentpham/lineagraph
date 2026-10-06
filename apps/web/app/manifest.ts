import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sử Phả",
    short_name: "Sử Phả",
    description: "Học lịch sử thế giới qua phả hệ, nhân vật và triều đại",
    start_url: "/",
    display: "standalone",
    // The same as the page background, so the splash screen and title bar blend into the site.
    background_color: "#fbfaf8",
    theme_color: "#fbfaf8",
    lang: "vi",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
