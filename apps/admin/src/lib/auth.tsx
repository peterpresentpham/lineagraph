import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, endSessionsOnServer, setUnauthorizedHandler, tokenStore } from "./api";

type AuthState = {
  email: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

type Props = { children: ReactNode };

export function AuthProvider({ children }: Props) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !!tokenStore.get());

  // Local sign-out: forget the token. Used when the API has already rejected it.
  const forget = useCallback(() => {
    tokenStore.clear();
    setEmail(null);
  }, []);

  // The Đăng xuất button: also ends every session of this account on the server, so a copy of the
  // token (a stolen laptop, a leaked browser profile) stops working at once.
  const logout = useCallback(() => {
    void endSessionsOnServer();
    forget();
  }, [forget]);

  useEffect(() => {
    setUnauthorizedHandler(forget);
    if (!tokenStore.get()) return;
    api
      .get<{ email: string }>("/auth/me")
      .then((me) => setEmail(me.email))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, [forget]);

  const login = useCallback(async (emailInput: string, password: string) => {
    const result = await api.post<{ token: string; email: string }>("/auth/login", {
      email: emailInput,
      password,
    });
    tokenStore.set(result.token);
    setEmail(result.email);
  }, []);

  return (
    <AuthContext.Provider value={{ email, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
