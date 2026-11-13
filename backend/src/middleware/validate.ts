import type { z } from 'zod';
import { HttpError } from '../utils/httpError';

/** Parses `data` with a zod schema and throws a 422 with per-field messages when it is invalid. */
export function parseOrThrow<S extends z.ZodType>(schema: S, data: unknown, message = 'Please fix the highlighted fields'): z.infer<S> {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    throw HttpError.validation(
      message,
      result.error.issues.map((issue) => ({ field: issue.path.join('.') || undefined, message: issue.message })),
    );
  }
  return result.data;
}
