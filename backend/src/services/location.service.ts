import { db } from '../db/knex';
import { HttpError } from '../utils/httpError';
import type { ListQuery, LocationInput } from '../schemas/location.schema';

export interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
}

interface LocationRow {
  id: number;
  user_id: number;
  name: string;
  latitude: string; // pg returns NUMERIC as string to avoid precision loss
  longitude: string;
  created_at: Date;
  updated_at: Date;
}

export const toLocation = (row: LocationRow): Location => ({
  id: row.id,
  name: row.name,
  latitude: Number(row.latitude),
  longitude: Number(row.longitude),
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const DUPLICATE_MESSAGE = 'You already have a location with this name at these coordinates';
const isUniqueViolation = (err: unknown) => (err as { code?: string }).code === '23505';

/** Escape LIKE wildcards so searching for "50%" or "a_b" matches literally. */
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * DATA ISOLATION: every query below is scoped with `user_id = userId`.
 * userId always comes from the verified JWT (req.userId), never from the request body or URL.
 * A location that belongs to someone else is indistinguishable from one that does not exist (404).
 */
const ownedBy = (userId: number) => db<LocationRow>('locations').where('user_id', userId);

export async function listLocations(userId: number, { q, page, limit }: ListQuery) {
  const base = ownedBy(userId);
  if (q) base.andWhereILike('name', `%${escapeLike(q)}%`);

  const [{ count }] = await base.clone().count<{ count: string }[]>({ count: '*' });
  const total = Number(count);
  const rows = await base
    .clone()
    .select('*')
    .orderBy([{ column: 'created_at', order: 'desc' }, { column: 'id', order: 'desc' }])
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    items: rows.map(toLocation),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getLocation(userId: number, id: number) {
  const row = await ownedBy(userId).andWhere('id', id).first();
  if (!row) throw HttpError.notFound('Location not found');
  return toLocation(row);
}

export async function createLocation(userId: number, input: LocationInput) {
  try {
    const [row] = await db<LocationRow>('locations')
      .insert({ user_id: userId, name: input.name, latitude: String(input.latitude), longitude: String(input.longitude) })
      .returning('*');
    return toLocation(row);
  } catch (err) {
    if (isUniqueViolation(err)) throw HttpError.conflict(DUPLICATE_MESSAGE);
    throw err;
  }
}

export async function updateLocation(userId: number, id: number, input: LocationInput) {
  try {
    const [row] = await ownedBy(userId)
      .andWhere('id', id)
      .update({
        name: input.name,
        latitude: String(input.latitude),
        longitude: String(input.longitude),
        updated_at: db.fn.now() as unknown as Date,
      })
      .returning('*');
    if (!row) throw HttpError.notFound('Location not found');
    return toLocation(row);
  } catch (err) {
    if (isUniqueViolation(err)) throw HttpError.conflict(DUPLICATE_MESSAGE);
    throw err;
  }
}

export async function deleteLocation(userId: number, id: number) {
  const deleted = await ownedBy(userId).andWhere('id', id).delete();
  if (deleted === 0) throw HttpError.notFound('Location not found');
}
