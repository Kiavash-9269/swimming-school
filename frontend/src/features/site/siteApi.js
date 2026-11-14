import { apiRequest } from "../../services/api/http";
import { appConfig } from "../../config/env";

/** Public site settings (card-to-card info + clinic program). */
export function getPublicSiteSettings({ signal } = {}) {
  return apiRequest("/site/public", { method: "GET", signal });
}

/** ADMIN: full settings document (card-to-card + clinic). */
export function getAdminSiteSettings({ signal } = {}) {
  return apiRequest("/site/admin", { method: "GET", auth: true, signal });
}

/** ADMIN: update card-to-card details (number, holder, bank, instructions). */
export function updateCardToCardSettings(body, { signal } = {}) {
  return apiRequest("/site/admin/card-to-card", {
    method: "PUT",
    auth: true,
    body,
    signal,
  });
}

/** URL of the scannable payment QR image (PNG). */
export function paymentQrUrl(cacheBust = "") {
  return `${appConfig.apiBaseUrl}/site/payment-qr.png${
    cacheBust ? `?v=${encodeURIComponent(cacheBust)}` : ""
  }`;
}
