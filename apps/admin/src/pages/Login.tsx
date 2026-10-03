import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, Card, CardContent, Input, ThemeToggle, toast } from "@lineagraph/ui";
import { Field } from "../components/Field";
import { useAuth } from "../lib/auth";
import { errorMessage } from "../lib/hooks";

export function Login() {
  const { email: current, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (current) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center p-4">
      <ThemeToggle className="absolute right-4 top-4" />
      <Card className="w-full max-w-sm">
        <CardContent className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl">Sử Phả</h1>
            <p className="text-muted-foreground mt-1">Đăng nhập trang quản trị</p>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Email">
              <Input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Mật khẩu">
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={busy} className="mt-2 w-full">
              {busy ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
