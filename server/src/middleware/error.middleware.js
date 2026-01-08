import { HttpError } from "../utils/httpError.js";

export function errorMiddleware(err, req, res, next) {
  const isHttp = err instanceof HttpError;

  const status = isHttp ? err.status : 500;
  const code = isHttp ? err.code : "INTERNAL_SERVER_ERROR";
  const message =
    isHttp ? err.message : "Something went wrong. Please try again later.";

  // Keep server console useful while developing:
  if (!isHttp) {
    console.error(err);
  }

  res.status(status).json({
    error: { code, message },
  });
}
