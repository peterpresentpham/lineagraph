"use client";

type Props = { reset: () => void };

// Last-resort fallback when the root layout itself fails; it must render its own <html>.
export default function GlobalError({ reset }: Props) {
  return (
    <html lang="vi">
      <body
        style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "4rem 1rem" }}
      >
        <h1>Đã có lỗi xảy ra</h1>
        <p>Trang không tải được. Bạn thử lại sau ít giây nhé.</p>
        <button type="button" onClick={reset}>
          Thử lại
        </button>
      </body>
    </html>
  );
}
