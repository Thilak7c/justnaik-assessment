import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { config } from '../src/config';
import { db } from '../src/db/knex';
import { app, createUser } from './helpers';

describe('POST /api/auth/register', () => {
  it('creates a user, returns a token and never exposes the password hash', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'Alice@Example.com ', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toEqual({ id: expect.any(Number), email: 'alice@example.com', createdAt: expect.any(String) });
    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  it('stores a bcrypt hash, not the plain password', async () => {
    await createUser('hash@example.com', 'password123');
    const row = await db('users').where({ email: 'hash@example.com' }).first();
    expect(row.password_hash).not.toBe('password123');
    expect(row.password_hash).toMatch(/^\$2[aby]\$10\$/);
  });

  it('rejects a duplicate email regardless of case (409)', async () => {
    await createUser('bob@example.com');
    const res = await request(app).post('/api/auth/register').send({ email: 'BOB@example.com', password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('validates email and password (422 with field details)', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(422);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password']));
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token for correct credentials', async () => {
    await createUser('carol@example.com', 'password123');
    const res = await request(app).post('/api/auth/login').send({ email: 'carol@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('uses the same generic message for a wrong password and an unknown email', async () => {
    await createUser('dave@example.com', 'password123');
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'dave@example.com', password: 'wrongpass1' });
    const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'password123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe('Invalid email or password');
    expect(unknownEmail.body.error.message).toBe(wrongPassword.body.error.message);
  });
});

describe('Protected routes and sessions', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns the current user for a valid token', async () => {
    const { auth } = await createUser('erin@example.com');
    const res = await request(app).get('/api/auth/me').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('erin@example.com');
  });

  it('rejects an expired token with TOKEN_EXPIRED', async () => {
    const { user } = await createUser();
    const expired = jwt.sign({ sub: String(user.id), exp: Math.floor(Date.now() / 1000) - 60 }, config.JWT_SECRET);
    const res = await request(app).get('/api/locations').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects a token signed with a different secret (tampered)', async () => {
    const { user } = await createUser();
    const forged = jwt.sign({}, 'some-other-secret-value', { subject: String(user.id) });
    const res = await request(app).get('/api/locations').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects a malformed Authorization header', async () => {
    const res = await request(app).get('/api/locations').set('Authorization', 'Token abc');
    expect(res.status).toBe(401);
  });
});
