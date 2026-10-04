import { SiteHeader } from "@/components/SiteHeader";
import { SiteSidebar } from "@/components/SiteSidebar";
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
        <div className="flex min-h-screen flex-col md:flex-row">
          <SiteSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <SiteHeader />
            <main className="max-w-360 mx-auto w-full flex-1 px-4 py-8 sm:px-6 lg:px-10">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
