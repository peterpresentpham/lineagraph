import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sử Phả",
  description: "Học lịch sử Việt Nam qua phả hệ, nhân vật và triều đại",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
