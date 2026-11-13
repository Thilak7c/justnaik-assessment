import { Router } from 'express';
import multer from 'multer';
import { config } from '../config';
import { currentUserId, requireAuth } from '../middleware/requireAuth';
import { extractSingleTextFile, importLocations, parseLocationsText } from '../services/upload.service';
import { HttpError } from '../utils/httpError';

export const uploadRouter = Router();

// Kept in memory (never written to disk) and size-limited before we read it.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_UPLOAD_BYTES, files: 1 },
});

// POST /api/uploads  (multipart/form-data, field name "file")
uploadRouter.post('/', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) throw HttpError.badRequest('Please choose a .zip file to upload (form field "file")');
  if (!req.file.originalname.toLowerCase().endsWith('.zip')) {
    throw HttpError.badRequest('Only .zip files are accepted');
  }

  const text = extractSingleTextFile(req.file.buffer); // 1. open ZIP, exactly one .txt
  const rows = parseLocationsText(text); // 2. validate ALL rows first (throws 422, nothing saved)
  const result = await importLocations(currentUserId(req), rows); // 3. one transaction, duplicates skipped

  res.status(201).json({
    message:
      result.inserted === 0
        ? 'Upload processed. All locations were already in your list, so nothing new was added.'
        : `Imported ${result.inserted} new ${result.inserted === 1 ? 'location' : 'locations'}.`,
    ...result,
  });
});
