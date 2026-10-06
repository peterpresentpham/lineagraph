"use client";

import { Button } from "@lineagraph/ui";

type Props = { error: Error & { digest?: string }; reset: () => void };

// Shown when a page fails to load its data, for example while the API is unreachable.
export default function ErrorPage({ error, reset }: Props) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-primary font-serif text-6xl">!</p>
      <h1 className="mt-4">Không tải được dữ liệu</h1>
      <p className="text-muted-foreground mt-2">
        Máy chủ đang bận hoặc tạm thời không phản hồi. Bạn thử lại sau ít giây nhé.
      </p>
      {error.digest && (
        <p className="text-muted-foreground mt-3 text-xs">
          Mã lỗi: <code>{error.digest}</code>. Hãy gửi kèm mã này nếu bạn báo lỗi.
        </p>
      )}
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>Thử lại</Button>
        <Button variant="secondary" onClick={() => window.location.assign("/")}>
          Về trang chủ
        </Button>
      </div>
    </div>
  );
}
