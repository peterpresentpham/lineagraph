import { SiteHeader } from "@/components/SiteHeader";
import { SITE_URL } from "@/lib/site";
import { themeInitScript } from "@lineagraph/ui";
import type { Metadata, Viewport } from "next";
import "./globals.css";

const description = "Học lịch sử Việt Nam qua phả hệ, nhân vật và triều đại";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Sử Phả", template: "%s · Sử Phả" },
  description,
  keywords: ["lịch sử Việt Nam", "phả hệ", "gia phả", "triều đại", "nhân vật lịch sử"],
  openGraph: {
    title: "Sử Phả",
    description,
    siteName: "Sử Phả",
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sử Phả",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#9c2a1c",
};

type Props = { children: React.ReactNode };

export default function RootLayout({ children }: Props) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Public+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SiteHeader />
        <main className="max-w-360 mx-auto min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
        <footer className="text-muted-foreground border-t py-6 text-center text-xs">
          Sử Phả — học lịch sử Việt Nam qua phả hệ
        </footer>
      </body>
    </html>
  );
}
