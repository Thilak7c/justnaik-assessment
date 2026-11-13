import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { db } from '../src/db/knex';
import { parseLocationsText } from '../src/services/upload.service';
import { HttpError } from '../src/utils/httpError';
import { app, createUser, makeZip, SAMPLE_TXT } from './helpers';

const upload = (auth: string, buffer: Buffer, filename = 'locations.zip') =>
  request(app).post('/api/uploads').set('Authorization', auth).attach('file', buffer, filename);

const countLocations = async () => Number((await db('locations').count({ c: '*' }))[0].c);

describe('POST /api/uploads – happy path', () => {
  it('imports the sample file and returns a summary', async () => {
    const { auth } = await createUser();
    const res = await upload(auth, makeZip({ 'locations.txt': SAMPLE_TXT }));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ totalRows: 2, inserted: 2, skippedDuplicates: 0 });

    const list = await request(app).get('/api/locations').set('Authorization', auth);
    expect(list.body.items.map((l: { name: string }) => l.name).sort()).toEqual(['Suria KLCC', 'Zoo Negara']);
  });

  it('does not create duplicates when the same file is uploaded twice', async () => {
    const { auth } = await createUser();
    const zip = makeZip({ 'locations.txt': SAMPLE_TXT });
    await upload(auth, zip);
    const second = await upload(auth, zip);

    expect(second.status).toBe(201);
    expect(second.body).toMatchObject({ inserted: 0, skippedDuplicates: 2 });
    expect(await countLocations()).toBe(2);
  });

  it('treats 3.21054160 and 3.2105416 as the same coordinate', async () => {
    const { auth } = await createUser();
    await upload(auth, makeZip({ 'a.txt': 'Zoo Negara,3.21054160,101.75920504' }));
    const res = await upload(auth, makeZip({ 'b.txt': 'zoo negara,3.2105416,101.759205040' }));
    expect(res.body.inserted).toBe(0);
  });

  it('skips duplicate rows inside the same file', async () => {
    const { auth } = await createUser();
    const res = await upload(auth, makeZip({ 'l.txt': `${SAMPLE_TXT}Suria KLCC,3.157324409,101.7121981\n` }));
    expect(res.body).toMatchObject({ totalRows: 3, inserted: 2, skippedDuplicates: 1 });
  });

  it('keeps uploads separate per user', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const zip = makeZip({ 'locations.txt': SAMPLE_TXT });
    await upload(alice.auth, zip);
    const bobRes = await upload(bob.auth, zip);

    expect(bobRes.body.inserted).toBe(2); // not treated as duplicates of Alice's rows
    const aliceList = await request(app).get('/api/locations').set('Authorization', alice.auth);
    expect(aliceList.body.total).toBe(2);
  });

  it('ignores macOS metadata entries inside the ZIP', async () => {
    const { auth } = await createUser();
    const res = await upload(auth, makeZip({ 'locations.txt': SAMPLE_TXT, '__MACOSX/._locations.txt': 'junk' }));
    expect(res.status).toBe(201);
  });
});

describe('POST /api/uploads – validation (all or nothing)', () => {
  it('saves nothing when any row is invalid and reports line numbers', async () => {
    const { auth } = await createUser();
    const txt = `Name,Latitude,Longitude
Good Place,3.1,101.7
,3.2,101.7
Bad Lat,abc,101.7
Too North,95,101.7
Missing coords
`;
    const res = await upload(auth, makeZip({ 'l.txt': txt }));

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/4 invalid rows/);
    expect(res.body.error.details.map((d: { line: number }) => d.line)).toEqual([3, 4, 5, 6]);
    expect(await countLocations()).toBe(0); // "Good Place" was NOT partially saved
  });

  it('rejects a ZIP with more than one text file', async () => {
    const { auth } = await createUser();
    const res = await upload(auth, makeZip({ 'a.txt': SAMPLE_TXT, 'b.txt': SAMPLE_TXT }));
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/exactly one/);
  });

  it('rejects a ZIP whose only file is not .txt', async () => {
    const { auth } = await createUser();
    const res = await upload(auth, makeZip({ 'data.csv': SAMPLE_TXT }));
    expect(res.status).toBe(422);
  });

  it('rejects an empty ZIP / file with no rows', async () => {
    const { auth } = await createUser();
    const res = await upload(auth, makeZip({ 'l.txt': 'Name,Latitude,Longitude\n\n' }));
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/does not contain any locations/);
  });

  it('rejects a file that is not really a ZIP', async () => {
    const { auth } = await createUser();
    const res = await upload(auth, Buffer.from(SAMPLE_TXT), 'fake.zip');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/not a ZIP/);
  });

  it('rejects a non-.zip filename', async () => {
    const { auth } = await createUser();
    const res = await upload(auth, Buffer.from(SAMPLE_TXT), 'locations.txt');
    expect(res.status).toBe(400);
  });

  it('requires a file', async () => {
    const { auth } = await createUser();
    const res = await request(app).post('/api/uploads').set('Authorization', auth);
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/uploads').attach('file', makeZip({ 'l.txt': SAMPLE_TXT }), 'l.zip');
    expect(res.status).toBe(401);
    expect(await countLocations()).toBe(0);
  });
});

describe('parseLocationsText (unit)', () => {
  it('handles header, spaces, blank lines, CRLF and a BOM', () => {
    const rows = parseLocationsText('﻿Name, Latitude, Longitude\r\n\r\n  Suria KLCC , 3.157324409 , 101.7121981 \r\n');
    expect(rows).toEqual([{ line: 3, name: 'Suria KLCC', latitude: 3.157324409, longitude: 101.7121981 }]);
  });

  it('works without a header row', () => {
    expect(parseLocationsText('A,1,2')).toHaveLength(1);
  });

  it('allows commas inside the name (last two fields are coordinates)', () => {
    expect(parseLocationsText('Pavilion, Bukit Bintang,3.149,101.713')[0].name).toBe('Pavilion, Bukit Bintang');
  });

  it.each(['1e2', '0x10', 'Infinity', ''])('rejects the non-decimal latitude %j', (lat) => {
    expect(() => parseLocationsText(`A,${lat},101`)).toThrow(HttpError);
  });

  it('enforces the maximum row count', () => {
    expect(() => parseLocationsText('A,1,1\nB,2,2\nC,3,3', 2)).toThrow(/maximum is 2/);
  });
});
