import AdmZip from 'adm-zip';
import request from 'supertest';
import { createApp } from '../src/app';

export const app = createApp();

let counter = 0;

/** Registers a fresh user and returns its token + an auth header helper. */
export async function createUser(email = `user${++counter}@example.com`, password = 'password123') {
  const res = await request(app).post('/api/auth/register').send({ email, password });
  if (res.status !== 201) throw new Error(`Register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token as string, user: res.body.user, auth: `Bearer ${res.body.token}` };
}

/** Builds an in-memory ZIP from { fileName: contents }. */
export function makeZip(files: Record<string, string>): Buffer {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(files)) zip.addFile(name, Buffer.from(content, 'utf8'));
  return zip.toBuffer();
}

export const SAMPLE_TXT = `Name, Latitude, Longitude
Suria KLCC,3.157324409,101.7121981
Zoo Negara,3.21054160,101.75920504
`;
