import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../services/useAuth";
import { homePathForUser } from "../../services/homePath";
import { PageLoader } from "../Ui/Loading";

/**
 * UX-only route guard. Backend authorization remains authoritative.
 * Role mismatch → soft redirect to the user's home (no scary forbidden wall).
 *
 * @param {{ roles?: string[] }} props — e.g. roles={['ADMIN']}
 */
export default function RequireAuth({ roles } = {}) {
  const { status, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading || status === "loading") {
    return <PageLoader label="بررسی نشست…" />;
  }

  if (status !== "authenticated" || !user) {
    return (
      <Navigate
        to="/auth?mode=login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to={homePathForUser(user)} replace />;
  }

  return <Outlet />;
}
