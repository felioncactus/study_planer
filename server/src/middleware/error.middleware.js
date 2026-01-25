import { HttpError } from "../utils/httpError.js";

export function errorMiddleware(err, req, res, next) {
  const isHttp = err instanceof HttpError;
  const isMulter = err?.name === "MulterError" || /Only image uploads/i.test(err?.message || "");

  const status = isHttp ? err.status : isMulter ? 400 : 500;
  const code = isHttp ? err.code : isMulter ? "UPLOAD_ERROR" : "INTERNAL_SERVER_ERROR";
  const message = isHttp
    ? err.message
    : isMulter
      ? err.message || "Upload failed"
      : "Something went wrong. Please try again later.";

  if (!isHttp && !isMulter) {
    console.error(err);
  }

  res.status(status).json({
    error: { code, message },
  });
}
