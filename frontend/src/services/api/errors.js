/**
 * Normalized API error for UI consumption.
 * Preserves backend `code` / `message` / `details` when present.
 */
export class ApiError extends Error {
  constructor({ status = 0, code = "REQUEST_FAILED", message = "خطای سرور", details, cause } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.cause = cause;
  }

  get isNetwork() {
    return this.code === "NETWORK_ERROR" || this.status === 0;
  }

  get isUnauthorized() {
    return this.status === 401 || this.code === "UNAUTHORIZED";
  }

  get isForbidden() {
    return this.status === 403 || this.code === "FORBIDDEN";
  }
}

export function normalizeApiError(input, fallbackMessage = "خطای سرور") {
  if (input instanceof ApiError) return input;

  if (input instanceof TypeError || input?.name === "AbortError") {
    if (input.name === "AbortError") {
      return new ApiError({
        status: 0,
        code: "ABORTED",
        message: "درخواست لغو شد",
        cause: input,
      });
    }
    return new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "ارتباط با سرور برقرار نشد",
      cause: input,
    });
  }

  const status = Number(input?.status) || 0;
  const payload = input?.payload;
  const code =
    input?.code ||
    payload?.error?.code ||
    (status === 401
      ? "UNAUTHORIZED"
      : status === 403
        ? "FORBIDDEN"
        : status === 404
          ? "NOT_FOUND"
          : status === 429
            ? "RATE_LIMITED"
            : "REQUEST_FAILED");

  const message =
    input?.message ||
    payload?.error?.message ||
    fallbackMessage;

  const details = input?.details !== undefined ? input.details : payload?.error?.details;

  return new ApiError({ status, code, message, details, cause: input });
}
