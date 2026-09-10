/**
 * Default destination after login / when already authenticated on /auth.
 * ADMIN → ops panel; everyone else → member app.
 */
export function homePathForUser(user) {
  if (user?.role === "ADMIN") return "/admin";
  return "/app";
}

/**
 * Prefer `from` when safe for this role; never park non-admins on /admin.
 */
export function resolvePostAuthPath(from, user) {
  const fallback = homePathForUser(user);
  if (!from || typeof from !== "string" || !from.startsWith("/")) return fallback;

  if (from === "/admin" || from.startsWith("/admin/")) {
    return user?.role === "ADMIN" ? from : fallback;
  }

  if (user?.role === "ADMIN" && (from === "/app" || from.startsWith("/app?"))) {
    return "/admin";
  }

  return from;
}
