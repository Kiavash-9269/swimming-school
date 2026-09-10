/**
 * Vite-safe frontend configuration.
 * No secrets — only public build-time values.
 */
const rawBase = import.meta.env.VITE_API_BASE_URL;

export const appConfig = Object.freeze({
  /** API prefix. Default `/api` uses Vite proxy → backend :4000 in development. */
  apiBaseUrl: (rawBase && String(rawBase).trim()) || "/api",
  appName: "مدرسه شنا ایران استرالیا",
  isDev: import.meta.env.DEV,
});
