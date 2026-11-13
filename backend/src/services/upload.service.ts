import AdmZip from 'adm-zip';
import { db } from '../db/knex';
import { NAME_MAX } from '../schemas/location.schema';
import { HttpError, type ErrorDetail } from '../utils/httpError';
import { config } from '../config';

export interface ParsedRow {
  line: number;
  name: string;
  latitude: number;
  longitude: number;
}

const MAX_ERRORS_RETURNED = 50;
const HEADER_RE = /^\s*name\s*,\s*latitude\s*,\s*longitude\s*$/i;
// Plain decimal numbers only: rejects "", "abc", "1e5", "0x10", "Infinity"
const NUMBER_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

/** macOS/Windows add metadata entries to ZIPs; they are not "files" the user meant to upload. */
const isJunkEntry = (entryName: string) =>
  entryName.startsWith('__MACOSX/') || /(^|\/)\._/.test(entryName) || /(^|\/)(\.DS_Store|Thumbs\.db)$/i.test(entryName);

/**
 * Step 1 – open the ZIP and return the text of its single .txt file.
 * Rejects: non-ZIP data, corrupt archives, 0 or >1 files, non-.txt file, oversized content (zip bomb).
 */
export function extractSingleTextFile(buffer: Buffer): string {
  // Every ZIP starts with the "PK\x03\x04" signature (or PK\x05\x06 for an empty archive)
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw HttpError.badRequest('The uploaded file is not a ZIP archive');
  }

  let entries: AdmZip.IZipEntry[];
  try {
    entries = new AdmZip(buffer).getEntries();
  } catch {
    throw HttpError.badRequest('The ZIP file is corrupted or could not be read');
  }

  const files = entries.filter((e) => !e.isDirectory && !isJunkEntry(e.entryName));
  if (files.length !== 1) {
    throw HttpError.validation(`The ZIP must contain exactly one .txt file (found ${files.length} files)`);
  }

  const [file] = files;
  if (!file.entryName.toLowerCase().endsWith('.txt')) {
    throw HttpError.validation(`The file inside the ZIP must be a .txt file (found "${file.entryName}")`);
  }
  // Check the declared size BEFORE decompressing, to protect against zip bombs.
  if (file.header.size > config.MAX_UPLOAD_BYTES) {
    throw new HttpError(413, 'FILE_TOO_LARGE', 'The text file inside the ZIP is too large');
  }

  let data: Buffer;
  try {
    data = file.getData();
  } catch {
    throw HttpError.badRequest('The ZIP file is corrupted or could not be read');
  }
  if (data.length > config.MAX_UPLOAD_BYTES) {
    throw new HttpError(413, 'FILE_TOO_LARGE', 'The text file inside the ZIP is too large');
  }
  return data.toString('utf8');
}

/**
 * Step 2 – parse and validate EVERY line before anything is saved.
 * Format: `Name,Latitude,Longitude`, optional header row, blank lines ignored.
 * If a name itself contains commas, the last two fields are treated as the coordinates.
 * Returns all valid rows, or throws 422 listing every invalid line (nothing is saved).
 */
export function parseLocationsText(text: string, maxRows = config.MAX_UPLOAD_ROWS): ParsedRow[] {
  const lines = text.replace(/^﻿/, '').split(/\r\n|\n|\r/);
  const rows: ParsedRow[] = [];
  const errors: ErrorDetail[] = [];
  let seenContent = false;

  lines.forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed) return;

    // The header is optional and only allowed as the first non-empty line.
    if (!seenContent && HEADER_RE.test(trimmed)) {
      seenContent = true;
      return;
    }
    seenContent = true;

    const parts = trimmed.split(',');
    if (parts.length < 3) {
      errors.push({ line, message: 'Expected 3 values: Name, Latitude, Longitude' });
      return;
    }
    const lngRaw = parts.pop()!.trim();
    const latRaw = parts.pop()!.trim();
    const name = parts.join(',').trim();

    const lineErrors: string[] = [];
    if (!name) lineErrors.push('name is empty');
    else if (name.length > NAME_MAX) lineErrors.push(`name is longer than ${NAME_MAX} characters`);

    const latitude = Number(latRaw);
    if (!NUMBER_RE.test(latRaw)) lineErrors.push(`latitude "${latRaw}" is not a number`);
    else if (latitude < -90 || latitude > 90) lineErrors.push(`latitude ${latRaw} must be between -90 and 90`);

    const longitude = Number(lngRaw);
    if (!NUMBER_RE.test(lngRaw)) lineErrors.push(`longitude "${lngRaw}" is not a number`);
    else if (longitude < -180 || longitude > 180) lineErrors.push(`longitude ${lngRaw} must be between -180 and 180`);

    if (lineErrors.length) {
      errors.push({ line, message: capitalize(lineErrors.join(', ')) });
    } else {
      rows.push({ line, name, latitude, longitude });
    }
  });

  if (errors.length) {
    const shown = errors.slice(0, MAX_ERRORS_RETURNED);
    const more = errors.length - shown.length;
    throw HttpError.validation(
      `${errors.length} invalid ${errors.length === 1 ? 'row' : 'rows'} found. Nothing was saved. Fix the file and upload it again.` +
        (more > 0 ? ` (showing first ${MAX_ERRORS_RETURNED})` : ''),
      shown,
    );
  }
  if (rows.length === 0) {
    throw HttpError.validation('The file does not contain any locations');
  }
  if (rows.length > maxRows) {
    throw HttpError.validation(`The file has ${rows.length} locations; the maximum is ${maxRows}`);
  }
  return rows;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Same rule as the DB unique index: user + lower(name) + coordinates rounded to the column scale (9 dp). */
const dedupeKey = (r: ParsedRow) => `${r.name.toLowerCase()}|${r.latitude.toFixed(9)}|${r.longitude.toFixed(9)}`;

/**
 * Step 3 – save inside ONE transaction. Duplicates (already in the DB, or repeated within the file)
 * are skipped via the unique index + ON CONFLICT DO NOTHING, so re-uploading the same file is safe.
 */
export async function importLocations(userId: number, rows: ParsedRow[]) {
  const unique = new Map<string, ParsedRow>();
  for (const r of rows) if (!unique.has(dedupeKey(r))) unique.set(dedupeKey(r), r);
  const toInsert = [...unique.values()];

  const inserted = await db.transaction(async (trx) => {
    let count = 0;
    for (let i = 0; i < toInsert.length; i += 500) {
      const batch = toInsert.slice(i, i + 500).map((r) => ({
        user_id: userId,
        name: r.name,
        latitude: String(r.latitude),
        longitude: String(r.longitude),
      }));
      const result = await trx('locations').insert(batch).onConflict().ignore().returning('id');
      count += result.length;
    }
    return count;
  });

  return {
    totalRows: rows.length,
    inserted,
    skippedDuplicates: rows.length - inserted,
  };
}
