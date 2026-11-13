import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { db } from '../db/knex';
import { HttpError } from '../utils/httpError';
import type { Credentials } from '../schemas/auth.schema';

const BCRYPT_ROUNDS = 10;
const INVALID_LOGIN = 'Invalid email or password';
// Compared against when the email does not exist, so both paths take about the same time.
const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-password', BCRYPT_ROUNDS);

export interface PublicUser {
  id: number;
  email: string;
  createdAt: string;
}

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
}

/** Never return password_hash to the client. */
const toPublicUser = (row: UserRow): PublicUser => ({
  id: row.id,
  email: row.email,
  createdAt: row.created_at.toISOString(),
});

export function signToken(userId: number): string {
  return jwt.sign({}, config.JWT_SECRET, {
    subject: String(userId),
    expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

export async function register({ email, password }: Credentials) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const [row] = await db<UserRow>('users').insert({ email, password_hash: passwordHash }).returning('*');
    return { user: toPublicUser(row), token: signToken(row.id) };
  } catch (err: unknown) {
    // 23505 = unique_violation (email already registered)
    if ((err as { code?: string }).code === '23505') {
      throw HttpError.conflict('An account with this email already exists');
    }
    throw err;
  }
}

export async function login({ email, password }: Credentials) {
  const row = await db<UserRow>('users').where({ email }).first();
  // Always run bcrypt.compare so response time does not reveal whether the email exists.
  // Same message for "unknown email" and "wrong password" (prevents account enumeration).
  const ok = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !ok) throw HttpError.unauthorized(INVALID_LOGIN, 'INVALID_CREDENTIALS');
  return { user: toPublicUser(row), token: signToken(row.id) };
}

export async function getUserById(id: number): Promise<PublicUser | null> {
  const row = await db<UserRow>('users').where({ id }).first();
  return row ? toPublicUser(row) : null;
}
