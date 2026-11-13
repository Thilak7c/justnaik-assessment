import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, createUser } from './helpers';

const KLCC = { name: 'Suria KLCC', latitude: 3.157324409, longitude: 101.7121981 };

async function addLocation(auth: string, body: Record<string, unknown> = KLCC) {
  return request(app).post('/api/locations').set('Authorization', auth).send(body);
}

describe('Location CRUD', () => {
  it('creates, reads, updates and deletes a location', async () => {
    const { auth } = await createUser();

    const created = await addLocation(auth);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject(KLCC);

    const id = created.body.id;
    const fetched = await request(app).get(`/api/locations/${id}`).set('Authorization', auth);
    expect(fetched.status).toBe(200);
    expect(fetched.body.latitude).toBe(3.157324409); // full precision kept

    const updated = await request(app)
      .put(`/api/locations/${id}`)
      .set('Authorization', auth)
      .send({ name: 'KLCC Park', latitude: 3.1553, longitude: 101.7146 });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('KLCC Park');

    const deleted = await request(app).delete(`/api/locations/${id}`).set('Authorization', auth);
    expect(deleted.status).toBe(204);

    const gone = await request(app).get(`/api/locations/${id}`).set('Authorization', auth);
    expect(gone.status).toBe(404);
  });

  it('rejects a duplicate location for the same user (409)', async () => {
    const { auth } = await createUser();
    await addLocation(auth);
    const dup = await addLocation(auth, { ...KLCC, name: 'suria klcc' });
    expect(dup.status).toBe(409);
  });
});

describe('Validation', () => {
  it.each([
    [{ ...KLCC, name: '   ' }, 'name'],
    [{ ...KLCC, name: 'x'.repeat(101) }, 'name'],
    [{ ...KLCC, latitude: 91 }, 'latitude'],
    [{ ...KLCC, latitude: -90.0001 }, 'latitude'],
    [{ ...KLCC, longitude: 180.5 }, 'longitude'],
    [{ ...KLCC, latitude: '3.15' }, 'latitude'],
    [{ name: 'No coords' }, 'latitude'],
  ])('rejects %j (field: %s)', async (body, field) => {
    const { auth } = await createUser();
    const res = await addLocation(auth, body);
    expect(res.status).toBe(422);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
  });

  it('accepts boundary values', async () => {
    const { auth } = await createUser();
    const res = await addLocation(auth, { name: 'Edge', latitude: -90, longitude: 180 });
    expect(res.status).toBe(201);
  });

  it('rejects a non-numeric id', async () => {
    const { auth } = await createUser();
    const res = await request(app).get('/api/locations/abc').set('Authorization', auth);
    expect(res.status).toBe(422);
  });
});

describe('Data isolation between users', () => {
  it('user B cannot read, update or delete user A\'s location', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const { body: aliceLoc } = await addLocation(alice.auth);

    const read = await request(app).get(`/api/locations/${aliceLoc.id}`).set('Authorization', bob.auth);
    const update = await request(app)
      .put(`/api/locations/${aliceLoc.id}`)
      .set('Authorization', bob.auth)
      .send({ name: 'Hacked', latitude: 1, longitude: 1 });
    const remove = await request(app).delete(`/api/locations/${aliceLoc.id}`).set('Authorization', bob.auth);

    // 404 (not 403) so Bob cannot even learn that the id exists
    expect([read.status, update.status, remove.status]).toEqual([404, 404, 404]);

    const stillThere = await request(app).get(`/api/locations/${aliceLoc.id}`).set('Authorization', alice.auth);
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.name).toBe(KLCC.name);
  });

  it('lists only the caller\'s own locations', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    await addLocation(alice.auth);
    await addLocation(bob.auth, { name: 'Zoo Negara', latitude: 3.2105416, longitude: 101.75920504 });

    const res = await request(app).get('/api/locations').set('Authorization', bob.auth);
    expect(res.body.total).toBe(1);
    expect(res.body.items.map((l: { name: string }) => l.name)).toEqual(['Zoo Negara']);
  });

  it('ignores a userId/user_id sent in the body', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    await addLocation(bob.auth, { ...KLCC, userId: alice.user.id, user_id: alice.user.id });

    const aliceList = await request(app).get('/api/locations').set('Authorization', alice.auth);
    const bobList = await request(app).get('/api/locations').set('Authorization', bob.auth);
    expect(aliceList.body.total).toBe(0);
    expect(bobList.body.total).toBe(1);
  });

  it('allows two users to store the same place independently', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    expect((await addLocation(alice.auth)).status).toBe(201);
    expect((await addLocation(bob.auth)).status).toBe(201);
  });
});

describe('Search and pagination (server side)', () => {
  it('paginates and reports totals', async () => {
    const { auth } = await createUser();
    for (let i = 1; i <= 12; i++) await addLocation(auth, { name: `Place ${i}`, latitude: i, longitude: i });

    const page1 = await request(app).get('/api/locations?page=1&limit=5').set('Authorization', auth);
    const page3 = await request(app).get('/api/locations?page=3&limit=5').set('Authorization', auth);

    expect(page1.body).toMatchObject({ total: 12, totalPages: 3, page: 1, limit: 5 });
    expect(page1.body.items).toHaveLength(5);
    expect(page1.body.items[0].name).toBe('Place 12'); // newest first
    expect(page3.body.items).toHaveLength(2);
  });

  it('searches by name, case-insensitively, and combines with pagination', async () => {
    const { auth } = await createUser();
    await addLocation(auth, { name: 'Suria KLCC', latitude: 3.1, longitude: 101.7 });
    await addLocation(auth, { name: 'KL Sentral', latitude: 3.13, longitude: 101.68 });
    await addLocation(auth, { name: 'Zoo Negara', latitude: 3.21, longitude: 101.75 });

    const res = await request(app).get('/api/locations?q=kl&limit=1').set('Authorization', auth);
    expect(res.body.total).toBe(2);
    expect(res.body.totalPages).toBe(2);
    expect(res.body.items).toHaveLength(1);
  });

  it('treats % and _ in the search text literally', async () => {
    const { auth } = await createUser();
    await addLocation(auth, { name: '100% Cafe', latitude: 1, longitude: 1 });
    await addLocation(auth, { name: 'Other place', latitude: 2, longitude: 2 });

    const res = await request(app).get('/api/locations?q=%25').set('Authorization', auth); // q=%
    expect(res.body.items.map((l: { name: string }) => l.name)).toEqual(['100% Cafe']);
  });

  it('rejects invalid pagination parameters', async () => {
    const { auth } = await createUser();
    const res = await request(app).get('/api/locations?page=0&limit=1000').set('Authorization', auth);
    expect(res.status).toBe(422);
  });
});
