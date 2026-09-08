function success(res, data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

function fail(res, { statusCode = 400, code = "BAD_REQUEST", message = "Request failed", details } = {}) {
  const payload = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details !== undefined) {
    payload.error.details = details;
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  success,
  fail,
};
