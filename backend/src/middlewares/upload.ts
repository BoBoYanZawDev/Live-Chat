import os from 'node:os';
import path from 'node:path';
import multer from 'multer';
import { env } from '../config/env.js';
import { IMAGE_MIME_TYPES, VIDEO_MIME_TYPES } from '../services/media.service.js';
import { HttpError } from '../utils/HttpError.js';

const ALLOWED = new Set([...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES]);

/** Streams uploads to the OS temp dir; MediaService optimizes/moves them and cleans up. */
export const uploadAttachments = multer({
  dest: path.join(os.tmpdir(), 'live-chat-uploads'),
  limits: {
    fileSize: Math.max(env.maxImageBytes, env.maxVideoBytes),
    files: env.maxFilesPerMessage,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(HttpError.badRequest(`Unsupported file type: ${file.mimetype}`));
  },
}).array('files', env.maxFilesPerMessage);
