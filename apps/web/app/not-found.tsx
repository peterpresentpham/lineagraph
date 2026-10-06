import Link from "next/link";
import { Button } from "@lineagraph/ui";

// Shown for unknown URLs and whenever a page calls notFound() (e.g. a slug that does not exist).
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-primary font-serif text-6xl">404</p>
      <h1 className="mt-4">Không tìm thấy trang</h1>
      <p className="text-muted-foreground mt-2">
        Trang bạn tìm không tồn tại, hoặc nhân vật, chính thể hay sự kiện này đã bị gỡ.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/">
          <Button>Về trang chủ</Button>
        </Link>
        <Link href="/search">
          <Button variant="secondary">Tìm kiếm</Button>
        </Link>
      </div>
    </div>
  );
}
