import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi, clearAccessToken, setAccessToken } from "./apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | authenticated | unauthenticated
  const [isRefreshing, setIsRefreshing] = useState(false);

  const applySession = useCallback((session) => {
    if (!session?.accessToken || !session?.user) {
      clearAccessToken();
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }

    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus("authenticated");
    return session.user;
  }, []);

  const bootstrap = useCallback(async () => {
    setStatus("loading");
    setIsRefreshing(true);
    try {
      const refreshed = await authApi.refresh();
      if (!refreshed?.accessToken) {
        clearAccessToken();
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      setAccessToken(refreshed.accessToken);
      const me = await authApi.me();
      setUser(me.user);
      setStatus("authenticated");
    } catch {
      clearAccessToken();
      setUser(null);
      setStatus("unauthenticated");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const loginWithSession = useCallback(
    (session) => applySession(session),
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network logout failures; clear local session anyway
    } finally {
      clearAccessToken();
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      isLoading: status === "loading",
      isRefreshing,
      loginWithSession,
      logout,
      refreshSession: bootstrap,
    }),
    [user, status, isRefreshing, loginWithSession, logout, bootstrap],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
