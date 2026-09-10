import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../services/useAuth";
import { homePathForUser, resolvePostAuthPath } from "../../services/homePath";
import { PageLoader } from "../Ui/Loading";

/**
 * For auth pages: if already logged in, send to a role-safe destination (or `from`).
 */
export default function GuestOnly({ redirectTo } = {}) {
  const { status, isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();
  const from = location.state?.from;
  const fallback = redirectTo || homePathForUser(user);

  if (isLoading || status === "loading") {
    return <PageLoader label="بررسی نشست…" />;
  }

  if (isAuthenticated) {
    return <Navigate to={resolvePostAuthPath(from || fallback, user)} replace />;
  }

  return <Outlet />;
}
