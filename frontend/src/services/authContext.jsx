import { useCallback, useEffect, useMemo, useState } from "react";
import {
  authApi,
  clearAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from "./apiClient";
import { AuthContext } from "./authContextInstance";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | authenticated | unauthenticated
  const [isRefreshing, setIsRefreshing] = useState(false);

  const clearSession = useCallback(() => {
    clearAccessToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus("unauthenticated");
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const applySession = useCallback((session) => {
    if (!session?.accessToken || !session?.user) {
      clearSession();
      return null;
    }

    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus("authenticated");
    return session.user;
  }, [clearSession]);

  const bootstrap = useCallback(async () => {
    setStatus("loading");
    setIsRefreshing(true);
    try {
      const refreshed = await authApi.refresh();
      if (!refreshed?.accessToken) {
        clearSession();
        return;
      }

      setAccessToken(refreshed.accessToken);
      const me = await authApi.me();
      setUser(me.user);
      setStatus("authenticated");
    } catch {
      clearSession();
    } finally {
      setIsRefreshing(false);
    }
  }, [clearSession]);

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
      clearSession();
    }
  }, [clearSession]);

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
      clearSession,
    }),
    [user, status, isRefreshing, loginWithSession, logout, bootstrap, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
