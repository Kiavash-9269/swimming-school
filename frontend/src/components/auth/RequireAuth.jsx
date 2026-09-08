import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../services/authContext";

/**
 * Future dashboard foundation:
 * wrap protected routes with <RequireAuth /> or <RequireAuth roles={['ADMIN']} />
 */
export default function RequireAuth({ roles } = {}) {
  const { status, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading || status === "loading") {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (status !== "authenticated" || !user) {
    return <Navigate to="/auth?mode=login" replace state={{ from: location.pathname }} />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
