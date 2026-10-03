import { Link } from "react-router-dom";
import { Button } from "@lineagraph/ui";

export function NotFound({ message = "Trang bạn tìm không tồn tại hoặc đã bị xoá.", backTo = "/", backLabel = "Về tổng quan" }: {
  message?: string;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-serif text-6xl text-primary">404</p>
      <h1 className="mt-4">Không tìm thấy</h1>
      <p className="mt-2 text-muted-foreground">{message}</p>
      <Link to={backTo} className="mt-6 inline-block no-underline hover:no-underline"><Button>{backLabel}</Button></Link>
    </div>
  );
}
