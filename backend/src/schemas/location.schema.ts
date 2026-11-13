import { z } from 'zod';

export const NAME_MAX = 100;

const latitude = z
  .number({ error: 'Latitude must be a number' })
  .finite('Latitude must be a number')
  .min(-90, 'Latitude must be between -90 and 90')
  .max(90, 'Latitude must be between -90 and 90');

const longitude = z
  .number({ error: 'Longitude must be a number' })
  .finite('Longitude must be a number')
  .min(-180, 'Longitude must be between -180 and 180')
  .max(180, 'Longitude must be between -180 and 180');

/**
 * Body for create/update. Note there is NO userId field: the owner always comes from the JWT,
 * so a client can never create or move a location into another user's account.
 */
export const locationInputSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .trim()
    .min(1, 'Name is required')
    .max(NAME_MAX, `Name must be at most ${NAME_MAX} characters`),
  latitude,
  longitude,
});

export type LocationInput = z.infer<typeof locationInputSchema>;

export const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export const idParamSchema = z.object({
  id: z.coerce.number({ error: 'Invalid id' }).int('Invalid id').positive('Invalid id'),
});
