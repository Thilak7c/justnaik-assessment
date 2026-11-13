import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { config } from '../config';
import { HttpError } from '../utils/httpError';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(HttpError.notFound(`Route ${req.method} ${req.path} not found`));
};

/**
 * Every error leaves the API in the same shape:
 *   { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
 * so the frontend can show messages in one consistent way.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let error: HttpError;

  if (err instanceof HttpError) {
    error = err;
  } else if (err instanceof multer.MulterError) {
    error =
      err.code === 'LIMIT_FILE_SIZE'
        ? new HttpError(413, 'FILE_TOO_LARGE', `File is too large (max ${Math.round(config.MAX_UPLOAD_BYTES / 1024 / 1024)} MB)`)
        : HttpError.badRequest(`Upload error: ${err.message}`);
  } else if (err?.type === 'entity.parse.failed') {
    error = HttpError.badRequest('Request body is not valid JSON');
  } else {
    if (!config.isTest) console.error(err);
    error = new HttpError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
  }

  res.status(error.status).json({
    error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
  });
};
