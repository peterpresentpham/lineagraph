import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteSidebar } from "@/components/SiteSidebar";
import { SITE_URL } from "@/lib/site";
import { fontsHref, themeInitScript } from "@lineagraph/ui";
import type { Metadata, Viewport } from "next";
import "./globals.css";

const description = "Học lịch sử thế giới qua phả hệ, nhân vật và triều đại";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Sử Phả", template: "%s · Sử Phả" },
  description,
  keywords: ["lịch sử thế giới", "phả hệ", "gia phả", "triều đại", "nhân vật lịch sử"],
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f15" },
  ],
};

type Props = { children: React.ReactNode };

export default function RootLayout({ children }: Props) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={fontsHref} rel="stylesheet" />
      </head>
      <body>
        <div className="bg-brand-gradient fixed inset-x-0 top-0 z-50 h-0.5" aria-hidden />
        <div className="flex min-h-screen flex-col md:flex-row">
          <SiteSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <SiteHeader />
            <main className="container-page flex-1 py-8 md:py-10">{children}</main>
            <SiteFooter />
          </div>
        </div>
      </body>
    </html>
  );
}
