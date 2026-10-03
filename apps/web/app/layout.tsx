import type { Metadata } from "next";
import { themeInitScript } from "@lineagraph/ui";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sử Phả", template: "%s · Sử Phả" },
  description: "Học lịch sử Việt Nam qua phả hệ, nhân vật và triều đại",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-[90rem] px-4 sm:px-6 lg:px-10 py-8">{children}</main>
        <footer className="border-t py-6 text-center text-xs text-muted-foreground">
          Sử Phả — học lịch sử Việt Nam qua phả hệ
        </footer>
      </body>
    </html>
  );
}
