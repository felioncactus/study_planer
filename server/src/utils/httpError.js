export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function badRequest(message, code = "BAD_REQUEST") {
  return new HttpError(400, code, message);
}

export function unauthorized(message = "Unauthorized", code = "UNAUTHORIZED") {
  return new HttpError(401, code, message);
}

export function forbidden(message = "Forbidden", code = "FORBIDDEN") {
  return new HttpError(403, code, message);
}

export function notFound(message = "Not found", code = "NOT_FOUND") {
  return new HttpError(404, code, message);
}

export function conflict(message = "Conflict", code = "CONFLICT") {
  return new HttpError(409, code, message);
}
