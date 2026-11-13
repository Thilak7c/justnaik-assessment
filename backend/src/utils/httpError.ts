export interface ErrorDetail {
  field?: string;
  line?: number;
  message: string;
}

/** An error that maps directly to an HTTP response. Thrown from services/routes, handled in errorHandler. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(message: string, details?: ErrorDetail[]) {
    return new HttpError(400, 'BAD_REQUEST', message, details);
  }
  static validation(message: string, details?: ErrorDetail[]) {
    return new HttpError(422, 'VALIDATION_ERROR', message, details);
  }
  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new HttpError(401, code, message);
  }
  static notFound(message = 'Not found') {
    return new HttpError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string) {
    return new HttpError(409, 'CONFLICT', message);
  }
}
