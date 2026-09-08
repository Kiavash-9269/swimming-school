const { AppError } = require("../utils/AppError");

function validate(schema, source = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        new AppError("Invalid request data", {
          statusCode: 400,
          code: "VALIDATION_ERROR",
          details: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        }),
      );
    }

    // Express 5 exposes req.query as a getter — plain assignment is ignored.
    if (source === "query") {
      Object.defineProperty(req, "query", {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      req[source] = result.data;
    }
    return next();
  };
}

module.exports = {
  validate,
};
